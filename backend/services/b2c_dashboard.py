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
    FeeBenchmark,
    FeeImpactSummary,
    NetWorthPoint,
    RiskProfileSummary,
)
from backend.models.account import Account
from backend.models.client import Client
from backend.models.position import Position
from backend.models.statement import Statement
from backend.services.entitlements import TIER_FEATURES, EntitlementService
from backend.services.iim_service import IIMService
from backend.services.tier_catalog import FEE_BENCHMARKS
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
                fee_benchmarks=[],
                net_worth_history=[],
                risk_profile=await self._get_risk_profile(user),
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
        fee_impact = await self._calculate_fee_summary(accounts, total_aum)
        fee_benchmarks = self._build_fee_benchmarks(total_aum, fee_impact)
        net_worth_history = await self._get_net_worth_history(accounts)
        risk_profile = await self._get_risk_profile(user)
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
            fee_benchmarks=fee_benchmarks,
            net_worth_history=net_worth_history,
            risk_profile=risk_profile,
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
        self, accounts: list, total_aum: Decimal
    ) -> Optional[FeeImpactSummary]:
        """Calculate fee impact across all accounts."""
        if not accounts:
            return None

        total_annual = Decimal("0")
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
        low_cost = total_aum * Decimal("0.0015") if total_aum else Decimal("0")
        potential_savings = max(Decimal("0"), total_annual - low_cost)
        effective_rate = (
            (total_annual / total_aum * Decimal("100")) if total_aum else None
        )

        return FeeImpactSummary(
            annual_cost=total_annual,
            ten_year_impact=ten_year,
            thirty_year_impact=thirty_year,
            potential_savings=potential_savings,
            highest_fee_account=highest_fee_account or None,
            highest_fee_rate=highest_fee_rate if highest_fee_rate else None,
            effective_fee_rate_pct=effective_rate,
        )

    def _build_fee_benchmarks(
        self, total_aum: Decimal, fee_impact: Optional[FeeImpactSummary]
    ) -> list[FeeBenchmark]:
        if not total_aum or total_aum <= 0:
            return []
        benchmarks = []
        for key, meta in FEE_BENCHMARKS.items():
            rate = Decimal(str(meta["rate_pct"]))
            benchmarks.append(
                FeeBenchmark(
                    label=meta["label"],
                    rate_pct=rate,
                    annual_cost_at_aum=total_aum * rate / Decimal("100"),
                )
            )
        if fee_impact and fee_impact.effective_fee_rate_pct is not None:
            benchmarks.insert(
                0,
                FeeBenchmark(
                    label="Your portfolio (est.)",
                    rate_pct=fee_impact.effective_fee_rate_pct,
                    annual_cost_at_aum=fee_impact.annual_cost,
                ),
            )
        return benchmarks

    async def _get_net_worth_history(self, accounts: list) -> list[NetWorthPoint]:
        if not accounts:
            return []
        account_ids = [a.id for a in accounts]
        result = await self.db.execute(
            select(Statement.statement_date, func.sum(Statement.ending_value))
            .where(
                Statement.account_id.in_(account_ids),
                Statement.statement_date.isnot(None),
                Statement.ending_value.isnot(None),
            )
            .group_by(Statement.statement_date)
            .order_by(Statement.statement_date.asc())
            .limit(24)
        )
        points = []
        for stmt_date, total in result.all():
            if stmt_date and total:
                points.append(
                    NetWorthPoint(
                        date=stmt_date.isoformat(),
                        value=Decimal(str(total)),
                    )
                )
        return points

    async def _get_risk_profile(self, user) -> Optional[RiskProfileSummary]:
        if not user.client_id:
            return None
        result = await self.db.execute(
            select(Client).where(Client.id == user.client_id)
        )
        client = result.scalar_one_or_none()
        if not client or not client.risk_tolerance:
            return None
        tolerance = client.risk_tolerance
        risk_map = {
            "conservative": (25, "Conservative"),
            "moderate_conservative": (40, "Moderately Conservative"),
            "moderate": (55, "Moderate"),
            "moderate_aggressive": (72, "Moderately Aggressive"),
            "aggressive": (88, "Aggressive"),
        }
        risk_number, label = risk_map.get(tolerance, (50, tolerance.replace("_", " ").title()))
        return RiskProfileSummary(
            risk_number=risk_number,
            risk_tolerance=tolerance,
            label=label,
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
                        message="Upgrade to Starter for rebalancing suggestions",
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
                message="Explore Firmum learning resources",
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
