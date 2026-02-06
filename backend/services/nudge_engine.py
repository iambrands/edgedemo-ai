"""
Behavioral Finance Nudge Engine.
Scans client portfolios and generates behavioral nudges to encourage positive financial behaviors.
"""

import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.portal import (
    BehavioralNudge, NudgeType, NudgeStatus, ClientPortalUser, ClientGoal
)
from backend.models.account import Account
from backend.models.position import Position

logger = logging.getLogger(__name__)


class NudgeEngine:
    """
    Behavioral finance nudge engine.
    Analyzes portfolios and generates contextual nudges to improve financial outcomes.
    """

    # Thresholds for nudge triggers
    CASH_THRESHOLD = Decimal("0.10")  # 10% cash triggers cash drag nudge
    CONCENTRATION_THRESHOLD = Decimal("0.15")  # 15% single position triggers concentration nudge
    
    # ETFs that are considered broadly diversified (don't trigger concentration warnings)
    BROAD_ETFS = {
        "VTI", "VOO", "SPY", "IVV", "ITOT",  # US Total Market / S&P 500
        "BND", "AGG", "SCHZ", "VBTLX",  # Bond funds
        "VXUS", "VEA", "VWO", "IXUS",  # International
        "QQQ", "VGT", "XLK",  # Tech (broad)
        "VTV", "VUG", "SCHD",  # Value/Growth/Dividend
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _has_recent_nudge(
        self, 
        user_id: uuid.UUID, 
        nudge_type: NudgeType, 
        days: int = 30
    ) -> bool:
        """Check if user has received this type of nudge recently."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await self.db.execute(
            select(BehavioralNudge).where(
                BehavioralNudge.portal_user_id == user_id,
                BehavioralNudge.nudge_type == nudge_type,
                BehavioralNudge.created_at > cutoff
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def _create_nudge(
        self,
        user_id: uuid.UUID,
        nudge_type: NudgeType,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        priority: int = 5,
        metadata: Optional[dict] = None,
        expires_days: Optional[int] = None
    ) -> BehavioralNudge:
        """Create a new behavioral nudge."""
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)

        nudge = BehavioralNudge(
            id=uuid.uuid4(),
            portal_user_id=user_id,
            nudge_type=nudge_type,
            status=NudgeStatus.PENDING,
            title=title,
            message=message,
            action_url=action_url,
            action_label=action_label,
            priority=priority,
            metadata=metadata,
            expires_at=expires_at,
        )
        self.db.add(nudge)
        await self.db.flush()

        logger.info("Created nudge for user %s: %s", user_id, nudge_type.value)
        return nudge

    async def check_cash_drag(
        self,
        user: ClientPortalUser,
        accounts: List[Account]
    ) -> Optional[BehavioralNudge]:
        """
        Check for excessive cash holdings (cash drag).
        High cash allocation can hurt long-term returns.
        """
        if await self._has_recent_nudge(user.id, NudgeType.CASH_DRAG, days=30):
            return None

        total_value = Decimal("0")
        cash_value = Decimal("0")

        for account in accounts:
            # Get all positions for this account
            result = await self.db.execute(
                select(Position).where(Position.account_id == account.id)
            )
            positions = result.scalars().all()

            for position in positions:
                market_val = position.market_value or Decimal("0")
                total_value += market_val

                # Check if position is cash or money market
                asset_class = (position.asset_class or "").lower()
                security_type = (position.security_type or "").lower()
                ticker = (position.ticker or "").upper()

                if any([
                    "cash" in asset_class,
                    "money market" in asset_class,
                    "money market" in security_type,
                    ticker in ("VMFXX", "SPAXX", "FDRXX", "SWVXX", "CASH"),
                ]):
                    cash_value += market_val

        if total_value == 0:
            return None

        cash_pct = cash_value / total_value

        if cash_pct > self.CASH_THRESHOLD:
            return await self._create_nudge(
                user_id=user.id,
                nudge_type=NudgeType.CASH_DRAG,
                title="High cash allocation detected",
                message=f"You have {cash_pct:.0%} of your portfolio in cash. "
                        f"Consider investing for long-term growth.",
                action_url="/portal/accounts",
                action_label="Review Accounts",
                priority=4,
                metadata={"cash_pct": float(cash_pct), "cash_value": float(cash_value)},
                expires_days=60
            )

        return None

    async def check_concentration(
        self,
        user: ClientPortalUser,
        accounts: List[Account]
    ) -> Optional[BehavioralNudge]:
        """
        Check for concentrated positions.
        High concentration in a single security increases risk.
        """
        if await self._has_recent_nudge(user.id, NudgeType.CONCENTRATION, days=60):
            return None

        total_value = Decimal("0")
        ticker_values: dict[str, Decimal] = {}

        for account in accounts:
            result = await self.db.execute(
                select(Position).where(Position.account_id == account.id)
            )
            positions = result.scalars().all()

            for position in positions:
                market_val = position.market_value or Decimal("0")
                total_value += market_val

                ticker = (position.ticker or "UNKNOWN").upper()
                ticker_values[ticker] = ticker_values.get(ticker, Decimal("0")) + market_val

        if total_value == 0:
            return None

        # Check each position for concentration
        for ticker, value in ticker_values.items():
            # Skip broadly diversified ETFs
            if ticker in self.BROAD_ETFS:
                continue

            pct = value / total_value

            if pct > self.CONCENTRATION_THRESHOLD:
                return await self._create_nudge(
                    user_id=user.id,
                    nudge_type=NudgeType.CONCENTRATION,
                    title=f"Large position in {ticker}",
                    message=f"{ticker} represents {pct:.0%} of your portfolio. "
                            f"Consider diversifying to reduce risk.",
                    action_url="/portal/accounts",
                    action_label="View Holdings",
                    priority=3,
                    metadata={"ticker": ticker, "pct": float(pct), "value": float(value)},
                    expires_days=90
                )

        return None

    async def check_goal_milestones(
        self,
        user: ClientPortalUser
    ) -> Optional[BehavioralNudge]:
        """
        Check for goal progress milestones.
        Celebrate progress to reinforce positive behavior.
        """
        result = await self.db.execute(
            select(ClientGoal).where(
                ClientGoal.portal_user_id == user.id,
                ClientGoal.is_active == True
            )
        )
        goals = result.scalars().all()

        for goal in goals:
            if goal.target_amount <= 0:
                continue

            progress_pct = (goal.current_amount / goal.target_amount) * 100

            # Check milestones: 25%, 50%, 75%, 90%
            for milestone in [25, 50, 75, 90]:
                if progress_pct >= milestone and progress_pct < milestone + 5:
                    # Check if we've already sent this milestone nudge
                    existing = await self.db.execute(
                        select(BehavioralNudge).where(
                            BehavioralNudge.portal_user_id == user.id,
                            BehavioralNudge.nudge_type == NudgeType.GOAL_PROGRESS,
                            BehavioralNudge.metadata.contains(
                                {"goal_id": str(goal.id), "milestone": milestone}
                            )
                        ).limit(1)
                    )

                    if existing.scalar_one_or_none() is None:
                        emoji = "🎉" if milestone >= 75 else "📈"
                        return await self._create_nudge(
                            user_id=user.id,
                            nudge_type=NudgeType.GOAL_PROGRESS,
                            title=f"{emoji} {milestone}% toward {goal.name}!",
                            message=f"You've saved ${goal.current_amount:,.0f} "
                                    f"toward your ${goal.target_amount:,.0f} goal. Keep going!",
                            action_url="/portal/goals",
                            action_label="View Goals",
                            priority=7,  # Low priority (positive reinforcement)
                            metadata={"goal_id": str(goal.id), "milestone": milestone}
                        )

        return None

    async def check_contribution_reminder(
        self,
        user: ClientPortalUser
    ) -> Optional[BehavioralNudge]:
        """
        Remind users about regular contributions.
        Sent monthly if user has active goals with contribution plans.
        """
        if await self._has_recent_nudge(user.id, NudgeType.CONTRIBUTION_REMINDER, days=25):
            return None

        result = await self.db.execute(
            select(ClientGoal).where(
                ClientGoal.portal_user_id == user.id,
                ClientGoal.is_active == True,
                ClientGoal.monthly_contribution > 0
            )
        )
        goals = result.scalars().all()

        if goals:
            total_monthly = sum(g.monthly_contribution or 0 for g in goals)
            return await self._create_nudge(
                user_id=user.id,
                nudge_type=NudgeType.CONTRIBUTION_REMINDER,
                title="Monthly contribution reminder",
                message=f"Your planned monthly contribution is ${total_monthly:,.0f}. "
                        f"Consistent investing builds wealth over time.",
                action_url="/portal/goals",
                action_label="View Goals",
                priority=6,
                expires_days=30
            )

        return None

    async def run_all_checks(
        self,
        user: ClientPortalUser,
        accounts: List[Account]
    ) -> List[BehavioralNudge]:
        """Run all nudge checks for a user and return any new nudges."""
        nudges = []

        # Run checks
        checks = [
            self.check_cash_drag(user, accounts),
            self.check_concentration(user, accounts),
            self.check_goal_milestones(user),
            self.check_contribution_reminder(user),
        ]

        for check in checks:
            nudge = await check
            if nudge:
                nudges.append(nudge)

        return nudges

    async def get_active_nudges(
        self,
        user_id: uuid.UUID,
        limit: int = 10
    ) -> List[BehavioralNudge]:
        """Get active nudges for a user, ordered by priority."""
        now = datetime.utcnow()
        result = await self.db.execute(
            select(BehavioralNudge).where(
                BehavioralNudge.portal_user_id == user_id,
                BehavioralNudge.status.in_([
                    NudgeStatus.PENDING,
                    NudgeStatus.DELIVERED,
                    NudgeStatus.VIEWED
                ]),
                or_(
                    BehavioralNudge.expires_at == None,
                    BehavioralNudge.expires_at > now
                )
            ).order_by(
                BehavioralNudge.priority.asc(),
                BehavioralNudge.created_at.desc()
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def mark_delivered(self, nudge_id: uuid.UUID) -> bool:
        """Mark nudge as delivered (shown to user)."""
        result = await self.db.execute(
            select(BehavioralNudge).where(BehavioralNudge.id == nudge_id)
        )
        nudge = result.scalar_one_or_none()

        if nudge and nudge.status == NudgeStatus.PENDING:
            nudge.status = NudgeStatus.DELIVERED
            nudge.delivered_at = datetime.utcnow()
            await self.db.flush()
            return True

        return False

    async def mark_viewed(self, nudge_id: uuid.UUID) -> bool:
        """Mark nudge as viewed (user clicked/read it)."""
        result = await self.db.execute(
            select(BehavioralNudge).where(BehavioralNudge.id == nudge_id)
        )
        nudge = result.scalar_one_or_none()

        if nudge:
            nudge.status = NudgeStatus.VIEWED
            nudge.viewed_at = datetime.utcnow()
            await self.db.flush()
            return True

        return False

    async def mark_acted(self, nudge_id: uuid.UUID) -> bool:
        """Mark nudge as acted upon (user took the suggested action)."""
        result = await self.db.execute(
            select(BehavioralNudge).where(BehavioralNudge.id == nudge_id)
        )
        nudge = result.scalar_one_or_none()

        if nudge:
            nudge.status = NudgeStatus.ACTED
            nudge.acted_at = datetime.utcnow()
            await self.db.flush()
            logger.info("Nudge %s acted upon", nudge_id)
            return True

        return False

    async def dismiss(self, nudge_id: uuid.UUID) -> bool:
        """Dismiss a nudge (user doesn't want to see it)."""
        result = await self.db.execute(
            select(BehavioralNudge).where(BehavioralNudge.id == nudge_id)
        )
        nudge = result.scalar_one_or_none()

        if nudge:
            nudge.status = NudgeStatus.DISMISSED
            await self.db.flush()
            return True

        return False

    async def get_nudge_stats(self, user_id: uuid.UUID) -> dict:
        """Get nudge engagement statistics for a user."""
        result = await self.db.execute(
            select(BehavioralNudge).where(BehavioralNudge.portal_user_id == user_id)
        )
        nudges = list(result.scalars().all())

        total = len(nudges)
        viewed = sum(1 for n in nudges if n.viewed_at is not None)
        acted = sum(1 for n in nudges if n.status == NudgeStatus.ACTED)
        dismissed = sum(1 for n in nudges if n.status == NudgeStatus.DISMISSED)

        return {
            "total": total,
            "viewed": viewed,
            "acted": acted,
            "dismissed": dismissed,
            "view_rate": viewed / total if total > 0 else 0,
            "action_rate": acted / total if total > 0 else 0,
        }
