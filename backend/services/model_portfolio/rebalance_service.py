"""
Rebalancing signal generation and execution tracking.

Monitors account-model assignments for drift and creates approval-workflow
signals when thresholds are exceeded.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.custodian import CustodianAccount
from backend.models.model_portfolio_marketplace import (
    AccountModelAssignment,
    MarketplaceModelPortfolio,
    ModelSubscription,
    RebalanceSignal,
    RebalanceSignalStatus,
)

from .drift_calculator import DriftCalculator

logger = logging.getLogger(__name__)


class RebalanceService:
    """Handles rebalancing operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.drift_calc = DriftCalculator(db)

    # ─────────────────────────────────────────────────────────────
    # Bulk Drift Check
    # ─────────────────────────────────────────────────────────────

    async def check_all_assignments(
        self, advisor_id: UUID
    ) -> List[RebalanceSignal]:
        """Check all active assignments for drift and generate signals."""
        result = await self.db.execute(
            select(AccountModelAssignment)
            .join(ModelSubscription)
            .join(MarketplaceModelPortfolio)
            .where(
                and_(
                    ModelSubscription.subscriber_advisor_id
                    == advisor_id,
                    AccountModelAssignment.is_active.is_(True),
                    MarketplaceModelPortfolio.status == "active",
                )
            )
        )
        assignments = result.scalars().all()

        signals: List[RebalanceSignal] = []
        for assignment in assignments:
            signal = await self.check_assignment(assignment)
            if signal:
                signals.append(signal)
        return signals

    # ─────────────────────────────────────────────────────────────
    # Single Assignment Check
    # ─────────────────────────────────────────────────────────────

    async def check_assignment(
        self, assignment: AccountModelAssignment
    ) -> Optional[RebalanceSignal]:
        """Check a single assignment for drift; create signal if needed."""

        # Load model
        result = await self.db.execute(
            select(MarketplaceModelPortfolio).where(
                MarketplaceModelPortfolio.id == assignment.model_id
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            return None

        # Load subscription for custom threshold
        result = await self.db.execute(
            select(ModelSubscription).where(
                ModelSubscription.id
                == assignment.subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        threshold = (
            subscription.custom_drift_threshold
            if subscription and subscription.custom_drift_threshold
            else model.drift_threshold_pct
        )

        # Calculate drift
        drift_result = await self.drift_calc.calculate_drift(
            model.id, assignment.account_id
        )

        # Update assignment snapshot
        assignment.current_drift_pct = Decimal(
            str(drift_result["total_drift_pct"])
        )
        assignment.max_holding_drift_pct = Decimal(
            str(drift_result["max_holding_drift_pct"])
        )
        assignment.account_value = drift_result["account_value"]
        assignment.last_synced_at = datetime.utcnow()

        # Below threshold — no signal
        if drift_result["max_holding_drift_pct"] < float(threshold):
            await self.db.commit()
            return None

        # Skip if a pending signal already exists
        existing = await self.db.execute(
            select(RebalanceSignal).where(
                and_(
                    RebalanceSignal.assignment_id == assignment.id,
                    RebalanceSignal.status
                    == RebalanceSignalStatus.PENDING,
                )
            )
        )
        if existing.scalar_one_or_none():
            await self.db.commit()
            return None

        # Cash available
        acct_result = await self.db.execute(
            select(CustodianAccount).where(
                CustodianAccount.id == assignment.account_id
            )
        )
        account = acct_result.scalar_one_or_none()
        cash_available = (
            account.cash_balance if account else Decimal("0")
        )

        # Calculate trades
        trades = self.drift_calc.calculate_trades_required(
            drift_result["drift_details"],
            drift_result["account_value"],
            cash_available,
        )

        # Create signal
        signal = RebalanceSignal(
            assignment_id=assignment.id,
            model_id=model.id,
            account_id=assignment.account_id,
            advisor_id=(
                subscription.subscriber_advisor_id
                if subscription
                else model.advisor_id
            ),
            trigger_type="drift_threshold",
            trigger_value=Decimal(
                str(drift_result["max_holding_drift_pct"])
            ),
            account_value=drift_result["account_value"],
            cash_available=cash_available or Decimal("0"),
            total_drift_pct=Decimal(
                str(drift_result["total_drift_pct"])
            ),
            drift_details=drift_result["drift_details"],
            trades_required=trades,
            estimated_trades_count=len(trades),
            estimated_buy_value=Decimal(
                str(
                    sum(
                        t["value"]
                        for t in trades
                        if t["action"] == "buy"
                    )
                )
            ),
            estimated_sell_value=Decimal(
                str(
                    sum(
                        t["value"]
                        for t in trades
                        if t["action"] == "sell"
                    )
                )
            ),
            expires_at=datetime.utcnow() + timedelta(days=7),
        )

        self.db.add(signal)
        await self.db.commit()
        await self.db.refresh(signal)

        return signal

    # ─────────────────────────────────────────────────────────────
    # Signal Retrieval
    # ─────────────────────────────────────────────────────────────

    async def get_pending_signals(
        self, advisor_id: UUID
    ) -> List[RebalanceSignal]:
        """Get all pending rebalance signals for an advisor."""
        result = await self.db.execute(
            select(RebalanceSignal)
            .where(
                and_(
                    RebalanceSignal.advisor_id == advisor_id,
                    RebalanceSignal.status
                    == RebalanceSignalStatus.PENDING,
                    RebalanceSignal.expires_at
                    > datetime.utcnow(),
                )
            )
            .order_by(RebalanceSignal.created_at.desc())
        )
        return result.scalars().all()

    # ─────────────────────────────────────────────────────────────
    # Approval Workflow
    # ─────────────────────────────────────────────────────────────

    async def approve_signal(
        self,
        signal_id: UUID,
        approved_by: UUID,
        notes: Optional[str] = None,
    ) -> RebalanceSignal:
        """Approve a rebalance signal."""
        result = await self.db.execute(
            select(RebalanceSignal).where(
                RebalanceSignal.id == signal_id
            )
        )
        signal = result.scalar_one_or_none()
        if not signal:
            raise ValueError("Signal not found")
        if signal.status != RebalanceSignalStatus.PENDING:
            raise ValueError(
                f"Signal is not pending: {signal.status.value}"
            )

        signal.status = RebalanceSignalStatus.APPROVED
        signal.approved_at = datetime.utcnow()
        signal.approved_by = approved_by
        signal.notes = notes

        await self.db.commit()
        return signal

    async def reject_signal(
        self,
        signal_id: UUID,
        reason: str,
    ) -> RebalanceSignal:
        """Reject a rebalance signal."""
        result = await self.db.execute(
            select(RebalanceSignal).where(
                RebalanceSignal.id == signal_id
            )
        )
        signal = result.scalar_one_or_none()
        if not signal:
            raise ValueError("Signal not found")

        signal.status = RebalanceSignalStatus.REJECTED
        signal.rejection_reason = reason

        await self.db.commit()
        return signal

    async def mark_executed(
        self,
        signal_id: UUID,
        execution_details: Dict[str, Any],
    ) -> RebalanceSignal:
        """Mark a signal as executed (completed)."""
        result = await self.db.execute(
            select(RebalanceSignal).where(
                RebalanceSignal.id == signal_id
            )
        )
        signal = result.scalar_one_or_none()
        if not signal:
            raise ValueError("Signal not found")

        signal.status = RebalanceSignalStatus.COMPLETED
        signal.executed_at = datetime.utcnow()
        signal.execution_details = execution_details

        # Update assignment
        asgn_result = await self.db.execute(
            select(AccountModelAssignment).where(
                AccountModelAssignment.id == signal.assignment_id
            )
        )
        assignment = asgn_result.scalar_one_or_none()
        if assignment:
            assignment.last_rebalanced_at = datetime.utcnow()

        await self.db.commit()
        return signal
