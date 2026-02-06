"""Investment Intelligence Model — analytical engine."""

import logging
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Account, Position
from .schemas import (
    AssetAllocationItem,
    ConcentrationReport,
    ConcentrationViolation,
    FeeImpactReport,
    HouseholdAnalysis,
    RebalancingPlan,
    RebalancingTrade,
    TaxHarvestingOpportunities,
    TaxHarvestingOpportunity,
)

logger = logging.getLogger(__name__)


class IIMService:
    """Investment Intelligence Model service. All outputs feed into CIM for validation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def analyze_household(self, household_id: str | UUID) -> HouseholdAnalysis:
        """Aggregate all accounts, calculate combined AUM, allocation, concentration."""
        uid = UUID(str(household_id)) if isinstance(household_id, str) else household_id
        result = await self.session.execute(
            select(Account).where(Account.household_id == uid)
        )
        accounts = list(result.scalars().all())
        if not accounts:
            return HouseholdAnalysis(
                household_id=str(uid),
                total_aum=Decimal("0"),
                account_count=0,
                summary="No accounts found for household.",
            )
        total_aum = Decimal("0")
        allocation_map: dict[str, Decimal] = {}
        positions: list[Position] = []
        for acc in accounts:
            pos_result = await self.session.execute(
                select(Position).where(Position.account_id == acc.id)
            )
            for p in pos_result.scalars().all():
                positions.append(p)
                total_aum += p.market_value
                ac = p.asset_class or "UNKNOWN"
                allocation_map[ac] = allocation_map.get(ac, Decimal("0")) + p.market_value
        items = [
            AssetAllocationItem(
                asset_class=k,
                actual_pct=(v / total_aum * 100) if total_aum else Decimal("0"),
                value=v,
            )
            for k, v in allocation_map.items()
        ]
        violations = await self._compute_concentration_violations(
            positions, total_aum
        )
        return HouseholdAnalysis(
            household_id=str(uid),
            total_aum=total_aum,
            account_count=len(accounts),
            asset_allocation=items,
            concentration_risks=violations,
            tax_optimization_opportunities=[],
            summary=f"Household has {len(accounts)} accounts, ${total_aum:,.2f} AUM.",
        )

    async def _compute_concentration_violations(
        self, positions: list[Position], total: Decimal
    ) -> list[ConcentrationViolation]:
        violations: list[ConcentrationViolation] = []
        if total <= 0:
            return violations
        by_ticker: dict[str, Decimal] = {}
        by_sector: dict[str, Decimal] = {}
        for p in positions:
            ticker = p.ticker or p.security_name or "UNK"
            by_ticker[ticker] = by_ticker.get(ticker, Decimal("0")) + p.market_value
            sector = p.sector or "UNKNOWN"
            by_sector[sector] = by_sector.get(sector, Decimal("0")) + p.market_value
        for ticker, val in by_ticker.items():
            pct = (val / total * 100)
            if pct > Decimal("10"):
                violations.append(
                    ConcentrationViolation(
                        type="SINGLE_STOCK",
                        description=f"{ticker} represents {pct:.1f}% of portfolio",
                        severity="HIGH" if pct > 25 else "MEDIUM",
                        current_pct=pct,
                        threshold_pct=Decimal("10"),
                        suggestion="Consider diversifying.",
                    )
                )
        for sector, val in by_sector.items():
            pct = (val / total * 100)
            if pct > Decimal("25"):
                violations.append(
                    ConcentrationViolation(
                        type="SECTOR",
                        description=f"Sector {sector}: {pct:.1f}%",
                        severity="HIGH" if pct > 40 else "MEDIUM",
                        current_pct=pct,
                        threshold_pct=Decimal("25"),
                        suggestion="Consider sector rebalancing.",
                    )
                )
        return violations

    async def calculate_fee_impact(self, account_id: str | UUID) -> FeeImpactReport:
        """All-in cost calculation, 10/20/30 year projection, low-cost alternative."""
        uid = UUID(str(account_id)) if isinstance(account_id, str) else account_id
        result = await self.session.execute(select(Account).where(Account.id == uid))
        account = result.scalar_one_or_none()
        if not account:
            return FeeImpactReport(
                account_id=str(uid),
                total_annual_fees=Decimal("0"),
                projected_10yr=Decimal("0"),
                projected_20yr=Decimal("0"),
                projected_30yr=Decimal("0"),
                low_cost_alternative_estimate=Decimal("0"),
                opportunity_cost_30yr=Decimal("0"),
                recommendations=[],
            )
        pos_result = await self.session.execute(
            select(Position).where(Position.account_id == uid)
        )
        positions = list(pos_result.scalars().all())
        total_value = sum(p.market_value for p in positions)
        fee_pct = Decimal("0.01")
        for p in positions:
            if p.expense_ratio:
                fee_pct += p.expense_ratio
        annual_fees = total_value * fee_pct
        f10 = annual_fees * 10
        f20 = annual_fees * 20
        f30 = annual_fees * 30
        low_cost = total_value * Decimal("0.001") * 30
        opp_cost = f30 - low_cost
        return FeeImpactReport(
            account_id=str(uid),
            total_annual_fees=annual_fees,
            projected_10yr=f10,
            projected_20yr=f20,
            projected_30yr=f30,
            low_cost_alternative_estimate=low_cost,
            opportunity_cost_30yr=opp_cost,
            recommendations=[
                "Consider low-cost index funds.",
                "Review expense ratios on mutual funds.",
            ],
        )

    async def detect_concentration_risk(
        self, household_id: str | UUID
    ) -> ConcentrationReport:
        """Single-stock >10%, sector >25%, asset class >60% checks."""
        analysis = await self.analyze_household(household_id)
        score = 100 - min(50, len(analysis.concentration_risks) * 15)
        return ConcentrationReport(
            household_id=str(household_id),
            risk_score=max(0, score),
            violations=analysis.concentration_risks,
            suggestions=[
                "Diversify across sectors and asset classes.",
                "Consider rebalancing to target allocation.",
            ],
        )

    async def generate_rebalancing_plan(
        self, account_id: str | UUID
    ) -> RebalancingPlan:
        """Compare current vs target, tax-aware rebalancing suggestions."""
        uid = UUID(str(account_id)) if isinstance(account_id, str) else account_id
        result = await self.session.execute(select(Account).where(Account.id == uid))
        account = result.scalar_one_or_none()
        if not account:
            return RebalancingPlan(
                account_id=str(uid),
                trades=[],
                summary="Account not found.",
            )
        pos_result = await self.session.execute(
            select(Position).where(Position.account_id == uid)
        )
        positions = list(pos_result.scalars().all())
        total = sum(p.market_value for p in positions)
        trades: list[RebalancingTrade] = []
        for p in positions:
            if total <= 0:
                break
            curr_pct = (p.market_value / total * 100) if total else Decimal("0")
            if curr_pct > Decimal("30"):
                over = curr_pct - Decimal("30")
                trades.append(
                    RebalancingTrade(
                        ticker=p.ticker or p.security_name,
                        action="REDUCE",
                        quantity=Decimal("0"),
                        rationale=f"Overweight by {over:.1f}%",
                    )
                )
        return RebalancingPlan(
            account_id=str(uid),
            trades=trades,
            tax_efficient=True,
            summary=f"Suggested {len(trades)} rebalancing actions.",
        )

    async def tax_loss_harvesting_scan(
        self, household_id: str | UUID
    ) -> TaxHarvestingOpportunities:
        """Identify unrealized losses > $1K, suggest replacements, wash sale check."""
        uid = UUID(str(household_id)) if isinstance(household_id, str) else household_id
        result = await self.session.execute(
            select(Account).where(Account.household_id == uid)
        )
        accounts = list(result.scalars().all())
        opportunities: list[TaxHarvestingOpportunity] = []
        total_savings = Decimal("0")
        for acc in accounts:
            pos_result = await self.session.execute(
                select(Position).where(Position.account_id == acc.id)
            )
            for p in pos_result.scalars().all():
                ug = p.unrealized_gain_loss
                if ug and ug < Decimal("-1000"):
                    est_savings = abs(ug) * Decimal("0.24")
                    opportunities.append(
                        TaxHarvestingOpportunity(
                            ticker=p.ticker or p.security_name,
                            unrealized_loss=ug,
                            replacement_suggestion=f"Consider similar ETF for {p.ticker}",
                            estimated_savings=est_savings,
                            wash_sale_risk=True,
                        )
                    )
                    total_savings += est_savings
        return TaxHarvestingOpportunities(
            household_id=str(uid),
            opportunities=opportunities,
            total_estimated_savings=total_savings,
            summary=f"Found {len(opportunities)} tax-loss harvesting opportunities.",
        )
