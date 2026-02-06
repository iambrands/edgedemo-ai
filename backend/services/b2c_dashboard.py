"""
B2C dashboard service. Calls real IIM methods and formats for retail UI.
"""

import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.b2c.schemas import (
    AccountSummary,
    Alert,
    AllocationBreakdown,
    DashboardResponse,
    FeeImpactSummary,
)
from backend.models.account import Account
from backend.models.client import Client
from backend.models.position import Position
from backend.services.entitlements import TIER_FEATURES, EntitlementService
from backend.services.iim_service import IIMService
from backend.services.usage_tracker import UsageTracker

logger = logging.getLogger(__name__)


class B2CDashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.iim = IIMService(db)
        self.entitlements = EntitlementService()

    async def get_dashboard(self, user) -> DashboardResponse:
        """Full dashboard payload for B2C retail investor."""
        accounts = await self._get_user_accounts(user)

        if not accounts:
            return DashboardResponse(
                total_aum=Decimal("0"),
                accounts=[],
                allocation=[],
                fee_impact_summary=None,
                alerts=[
                    Alert(
                        type="onboarding",
                        severity="info",
                        message="Upload your first investment statement to get started",
                        action="upload_statement",
                        gated=False,
                    )
                ],
                ai_chat_remaining=await self._get_chat_remaining(user),
                subscription_tier=user.subscription_tier or "free",
            )

        total_aum = sum(
            (a.last_statement_value or Decimal("0")) for a in accounts
        )
        allocation = await self._calculate_allocation(user)
        fee_impact = await self._calculate_fee_summary(accounts)
        alerts = await self._build_alerts(user, fee_impact)

        account_summaries = [
            AccountSummary(
                id=str(a.id),
                custodian=a.custodian,
                account_type=a.account_type,
                total_value=a.last_statement_value or Decimal("0"),
            )
            for a in accounts
        ]

        return DashboardResponse(
            total_aum=total_aum,
            accounts=account_summaries,
            allocation=allocation,
            fee_impact_summary=fee_impact,
            alerts=alerts,
            ai_chat_remaining=await self._get_chat_remaining(user),
            subscription_tier=user.subscription_tier or "free",
        )

    async def _get_user_accounts(self, user) -> list:
        """Get all accounts linked to user's household."""
        if not user.household_id:
            return []

        result = await self.db.execute(
            select(Client).where(Client.household_id == user.household_id)
        )
        clients = result.scalars().all()
        client_ids = [c.id for c in clients]
        if not client_ids:
            return []

        acc_result = await self.db.execute(
            select(Account).where(Account.client_id.in_(client_ids))
        )
        return list(acc_result.scalars().all())

    async def _calculate_allocation(self, user) -> list[AllocationBreakdown]:
        """Calculate actual asset allocation from positions."""
        if not user.household_id:
            return []

        try:
            analysis = await self.iim.analyze_household(user.household_id)
            return [
                AllocationBreakdown(
                    asset_class=a.asset_class,
                    pct=a.actual_pct,
                    value=a.value,
                )
                for a in analysis.asset_allocation
            ]
        except Exception as e:
            logger.warning("IIM allocation failed: %s", e)
            return []

    async def _calculate_fee_summary(
        self, accounts: list
    ) -> Optional[FeeImpactSummary]:
        """Calculate fee impact across all accounts."""
        if not accounts:
            return None

        total_annual = Decimal("0")
        total_aum = sum(a.last_statement_value or Decimal("0") for a in accounts)
        highest_fee_account = ""
        highest_fee_rate = Decimal("0")

        for acc in accounts:
            try:
                report = await self.iim.calculate_fee_impact(acc.id)
                total_annual += report.total_annual_fees
                if total_aum and report.total_annual_fees:
                    rate = report.total_annual_fees / total_aum
                    if rate > highest_fee_rate:
                        highest_fee_rate = rate
                        highest_fee_account = f"{acc.custodian} {acc.account_type}"
            except Exception as e:
                logger.warning("Fee calc failed for account %s: %s", acc.id, e)

        ten_year = total_annual * 10
        thirty_year = total_annual * 30
        low_cost = total_aum * Decimal("0.0005") if total_aum else Decimal("0")
        potential_savings = max(Decimal("0"), total_annual - low_cost)

        return FeeImpactSummary(
            annual_cost=total_annual,
            ten_year_impact=ten_year,
            thirty_year_impact=thirty_year,
            potential_savings=potential_savings,
            highest_fee_account=highest_fee_account or None,
            highest_fee_rate=highest_fee_rate if highest_fee_rate else None,
        )

    async def _build_alerts(
        self, user, fee_impact: Optional[FeeImpactSummary]
    ) -> list[Alert]:
        """Generate actionable alerts."""
        alerts = []

        if fee_impact and fee_impact.annual_cost > Decimal("100"):
            alerts.append(
                Alert(
                    type="fees",
                    severity="high",
                    message=f"You're paying ${fee_impact.annual_cost:,.0f}/year in fees",
                    action="fee_analysis",
                    gated=False,
                )
            )

        if not self.entitlements.check_feature(user, "rebalancing_plan"):
            alerts.append(
                Alert(
                    type="rebalancing",
                    severity="info",
                    message="Upgrade to Starter for rebalancing recommendations",
                    action="upgrade",
                    gated=True,
                    upgrade_tier="starter",
                )
            )

        if not self.entitlements.check_feature(user, "tax_harvesting"):
            alerts.append(
                Alert(
                    type="tax_harvest",
                    severity="info",
                    message="Upgrade to Pro for tax-loss harvesting",
                    action="upgrade",
                    gated=True,
                    upgrade_tier="pro",
                )
            )

        alerts.append(
            Alert(
                type="education",
                severity="info",
                message="Explore IAB Academy courses",
                action="education",
                gated=False,
            )
        )

        return alerts

    async def _get_chat_remaining(self, user) -> int:
        """Remaining chat messages for current month."""
        tier = user.subscription_tier or "free"
        limit = TIER_FEATURES.get(tier, {}).get("ai_chat_messages_per_month", 10)
        if limit == -1:
            return 999
        tracker = UsageTracker(self.db)
        used = await tracker.get_monthly_count(user.id, "ai_chat_messages")
        return max(0, limit - used)
