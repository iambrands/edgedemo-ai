"""
Main tax-loss harvesting service.
Orchestrates scanning, recommendations, approvals, and execution tracking.
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.custodian import (
    AggregatedTransaction,
    CustodianTransactionType,
)
from backend.models.tax_harvest import (
    HarvestingSettings,
    HarvestOpportunity,
    HarvestStatus,
    WashSaleStatus,
    WashSaleTransaction,
)

from .harvest_scanner import HarvestScanner
from .replacement_recommender import ReplacementRecommender

logger = logging.getLogger(__name__)


class TaxHarvestService:
    """Main service for tax-loss harvesting operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.scanner = HarvestScanner(db)
        self.recommender = ReplacementRecommender(db)

    # ─────────────────────────────────────────────────────────────
    # Opportunity Management
    # ─────────────────────────────────────────────────────────────

    async def scan_for_opportunities(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID] = None,
        account_id: Optional[UUID] = None,
    ) -> List[HarvestOpportunity]:
        """Scan portfolio and create harvest opportunities."""
        return await self.scanner.scan_portfolio(
            advisor_id, client_id, account_id
        )

    async def get_opportunities(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID] = None,
        status: Optional[HarvestStatus] = None,
        include_expired: bool = False,
    ) -> List[HarvestOpportunity]:
        """Get harvest opportunities with filters."""
        query = select(HarvestOpportunity).where(
            HarvestOpportunity.advisor_id == advisor_id
        )

        if client_id:
            query = query.where(HarvestOpportunity.client_id == client_id)
        if status:
            query = query.where(HarvestOpportunity.status == status)
        if not include_expired:
            query = query.where(
                or_(
                    HarvestOpportunity.expires_at > datetime.utcnow(),
                    HarvestOpportunity.status.in_(
                        [
                            HarvestStatus.APPROVED,
                            HarvestStatus.EXECUTING,
                            HarvestStatus.EXECUTED,
                        ]
                    ),
                )
            )

        query = query.order_by(
            HarvestOpportunity.estimated_tax_savings.desc()
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_opportunity(
        self, opportunity_id: UUID
    ) -> Optional[HarvestOpportunity]:
        """Get single opportunity by ID."""
        result = await self.db.execute(
            select(HarvestOpportunity).where(
                HarvestOpportunity.id == opportunity_id
            )
        )
        return result.scalar_one_or_none()

    async def get_opportunity_summary(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Get summary statistics for active opportunities."""
        query = select(
            func.count(HarvestOpportunity.id).label("total"),
            func.sum(HarvestOpportunity.unrealized_loss).label("total_loss"),
            func.sum(HarvestOpportunity.estimated_tax_savings).label(
                "total_savings"
            ),
        ).where(
            and_(
                HarvestOpportunity.advisor_id == advisor_id,
                HarvestOpportunity.status.in_(
                    [
                        HarvestStatus.IDENTIFIED,
                        HarvestStatus.RECOMMENDED,
                    ]
                ),
                HarvestOpportunity.expires_at > datetime.utcnow(),
            )
        )

        if client_id:
            query = query.where(HarvestOpportunity.client_id == client_id)

        result = await self.db.execute(query)
        row = result.one()

        return {
            "total_opportunities": row.total or 0,
            "total_harvestable_loss": float(row.total_loss or 0),
            "total_estimated_savings": float(row.total_savings or 0),
        }

    # ─────────────────────────────────────────────────────────────
    # Recommendations
    # ─────────────────────────────────────────────────────────────

    async def get_replacement_recommendations(
        self,
        opportunity_id: UUID,
    ) -> List[Dict[str, Any]]:
        """Get replacement security recommendations (cached on opportunity)."""
        opportunity = await self.get_opportunity(opportunity_id)
        if not opportunity:
            raise ValueError("Opportunity not found")

        # Return cached if available
        if opportunity.replacement_recommendations:
            return opportunity.replacement_recommendations

        # Generate and cache
        recommendations = await self.recommender.get_recommendations(
            opportunity
        )
        opportunity.replacement_recommendations = recommendations
        await self.db.commit()

        return recommendations

    # ─────────────────────────────────────────────────────────────
    # Approval Workflow
    # ─────────────────────────────────────────────────────────────

    async def recommend_opportunity(
        self,
        opportunity_id: UUID,
    ) -> HarvestOpportunity:
        """Mark opportunity as recommended to advisor."""
        opportunity = await self.get_opportunity(opportunity_id)
        if not opportunity:
            raise ValueError("Opportunity not found")

        if opportunity.status != HarvestStatus.IDENTIFIED:
            raise ValueError(
                f"Cannot recommend opportunity in {opportunity.status.value} status"
            )

        # Ensure recommendations are generated
        if not opportunity.replacement_recommendations:
            await self.get_replacement_recommendations(opportunity_id)

        opportunity.status = HarvestStatus.RECOMMENDED
        opportunity.recommended_at = datetime.utcnow()
        await self.db.commit()

        return opportunity

    async def approve_opportunity(
        self,
        opportunity_id: UUID,
        approved_by: UUID,
        replacement_symbol: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> HarvestOpportunity:
        """Approve a harvest opportunity."""
        opportunity = await self.get_opportunity(opportunity_id)
        if not opportunity:
            raise ValueError("Opportunity not found")

        if opportunity.status not in [
            HarvestStatus.IDENTIFIED,
            HarvestStatus.RECOMMENDED,
        ]:
            raise ValueError(
                f"Cannot approve opportunity in {opportunity.status.value} status"
            )

        # Re-check wash sale risk before approval
        wash_analysis = await self.scanner._analyze_wash_sale_risk(
            opportunity.account_id, opportunity.symbol, opportunity.cusip
        )

        if wash_analysis["blocking_transactions"]:
            opportunity.status = HarvestStatus.WASH_SALE_RISK
            opportunity.wash_sale_status = WashSaleStatus.IN_WINDOW
            opportunity.wash_sale_blocking_transactions = wash_analysis[
                "blocking_transactions"
            ]
            await self.db.commit()
            raise ValueError("Wash sale risk detected — cannot approve")

        opportunity.status = HarvestStatus.APPROVED
        opportunity.approved_at = datetime.utcnow()
        opportunity.approved_by = approved_by
        opportunity.replacement_symbol = replacement_symbol
        opportunity.advisor_notes = notes

        await self.db.commit()
        return opportunity

    async def reject_opportunity(
        self,
        opportunity_id: UUID,
        reason: str,
    ) -> HarvestOpportunity:
        """Reject a harvest opportunity."""
        opportunity = await self.get_opportunity(opportunity_id)
        if not opportunity:
            raise ValueError("Opportunity not found")

        opportunity.status = HarvestStatus.REJECTED
        opportunity.rejection_reason = reason
        await self.db.commit()

        return opportunity

    # ─────────────────────────────────────────────────────────────
    # Execution Tracking
    # ─────────────────────────────────────────────────────────────

    async def mark_executing(
        self,
        opportunity_id: UUID,
    ) -> HarvestOpportunity:
        """Mark opportunity as executing (trade submitted)."""
        opportunity = await self.get_opportunity(opportunity_id)
        if not opportunity:
            raise ValueError("Opportunity not found")

        if opportunity.status != HarvestStatus.APPROVED:
            raise ValueError("Opportunity must be approved first")

        opportunity.status = HarvestStatus.EXECUTING
        await self.db.commit()

        return opportunity

    async def mark_executed(
        self,
        opportunity_id: UUID,
        sell_transaction_id: UUID,
        buy_transaction_id: Optional[UUID] = None,
        actual_loss: Optional[Decimal] = None,
    ) -> HarvestOpportunity:
        """Mark opportunity as executed and create wash sale tracking."""
        opportunity = await self.get_opportunity(opportunity_id)
        if not opportunity:
            raise ValueError("Opportunity not found")

        opportunity.status = HarvestStatus.EXECUTED
        opportunity.executed_at = datetime.utcnow()
        opportunity.sell_transaction_id = sell_transaction_id
        opportunity.buy_transaction_id = buy_transaction_id
        opportunity.actual_loss_realized = (
            actual_loss or opportunity.unrealized_loss
        )

        # Create wash sale tracking window for the executed harvest
        wash_sale = WashSaleTransaction(
            harvest_opportunity_id=opportunity.id,
            sell_transaction_id=sell_transaction_id,
            account_id=opportunity.account_id,
            symbol=opportunity.symbol,
            cusip=opportunity.cusip,
            sale_date=date.today(),
            quantity_sold=opportunity.quantity_to_harvest,
            loss_amount=opportunity.actual_loss_realized
            or opportunity.unrealized_loss,
            window_start=date.today() - timedelta(days=30),
            window_end=date.today() + timedelta(days=30),
            watch_symbols=[opportunity.symbol],
            status=WashSaleStatus.IN_WINDOW,
        )

        self.db.add(wash_sale)
        await self.db.commit()

        return opportunity

    # ─────────────────────────────────────────────────────────────
    # Wash Sale Monitoring
    # ─────────────────────────────────────────────────────────────

    async def check_wash_sale_violations(
        self,
        advisor_id: UUID,
    ) -> List[WashSaleTransaction]:
        """Check for wash sale violations across all accounts."""
        today = date.today()

        result = await self.db.execute(
            select(WashSaleTransaction)
            .join(HarvestOpportunity)
            .where(
                and_(
                    HarvestOpportunity.advisor_id == advisor_id,
                    WashSaleTransaction.status == WashSaleStatus.IN_WINDOW,
                    WashSaleTransaction.window_end >= today,
                )
            )
        )
        active_windows = list(result.scalars().all())

        violations: List[WashSaleTransaction] = []
        for window in active_windows:
            # Window has passed without violation
            if window.window_end < today:
                window.status = WashSaleStatus.CLEAR
                continue

            # Check for violating purchases
            if await self._check_window_for_violation(window):
                violations.append(window)

        await self.db.commit()
        return violations

    async def _check_window_for_violation(
        self,
        window: WashSaleTransaction,
    ) -> bool:
        """Check if a wash sale window has been violated."""
        result = await self.db.execute(
            select(AggregatedTransaction).where(
                and_(
                    AggregatedTransaction.account_id == window.account_id,
                    AggregatedTransaction.symbol.in_(
                        window.watch_symbols or []
                    ),
                    AggregatedTransaction.transaction_type
                    == CustodianTransactionType.BUY,
                    AggregatedTransaction.trade_date
                    >= datetime.combine(
                        window.window_start, datetime.min.time()
                    ),
                    AggregatedTransaction.trade_date
                    <= datetime.combine(
                        window.window_end, datetime.max.time()
                    ),
                    AggregatedTransaction.id != window.sell_transaction_id,
                )
            )
        )
        violating_txn = result.scalar_one_or_none()

        if violating_txn:
            window.status = WashSaleStatus.VIOLATED
            window.violating_transaction_id = violating_txn.id
            window.violation_date = (
                violating_txn.trade_date.date()
                if hasattr(violating_txn.trade_date, "date")
                else violating_txn.trade_date
            )
            window.disallowed_loss = window.loss_amount
            return True

        return False

    # ─────────────────────────────────────────────────────────────
    # Settings
    # ─────────────────────────────────────────────────────────────

    async def get_settings(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID] = None,
        account_id: Optional[UUID] = None,
    ) -> HarvestingSettings:
        """Get harvesting settings (cascading resolution)."""
        return await self.scanner._get_settings(
            advisor_id, client_id, account_id
        )

    async def update_settings(
        self,
        advisor_id: UUID,
        settings_data: Dict[str, Any],
        client_id: Optional[UUID] = None,
        account_id: Optional[UUID] = None,
    ) -> HarvestingSettings:
        """Update or create harvesting settings."""
        result = await self.db.execute(
            select(HarvestingSettings).where(
                and_(
                    HarvestingSettings.advisor_id == advisor_id,
                    HarvestingSettings.client_id == client_id,
                    HarvestingSettings.account_id == account_id,
                )
            )
        )
        settings = result.scalar_one_or_none()

        if settings:
            for key, value in settings_data.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)
        else:
            settings = HarvestingSettings(
                advisor_id=advisor_id,
                client_id=client_id,
                account_id=account_id,
                **settings_data,
            )
            self.db.add(settings)

        await self.db.commit()
        await self.db.refresh(settings)
        return settings
