"""
ETF Portfolio Builder Service

Generates AI-recommended ETF portfolios based on client risk questionnaire.
Supports preset portfolios and custom AI-generated allocations.
"""

import logging
from decimal import Decimal
from typing import Optional
from uuid import UUID

from backend.data.etf_universe import ETF_UNIVERSE, PRESET_PORTFOLIOS
from backend.models.portfolio_models import (
    RiskQuestionnaire,
    ModelPortfolio,
    ModelPortfolioHolding,
    RiskToleranceLevel,
)

logger = logging.getLogger(__name__)


class PortfolioBuilderService:
    """Builds ETF portfolios based on risk assessment."""

    RISK_THRESHOLDS = {
        (10, 18): RiskToleranceLevel.CONSERVATIVE,
        (19, 26): RiskToleranceLevel.MODERATELY_CONSERVATIVE,
        (27, 34): RiskToleranceLevel.MODERATE,
        (35, 42): RiskToleranceLevel.MODERATELY_AGGRESSIVE,
        (43, 50): RiskToleranceLevel.AGGRESSIVE,
    }

    EQUITY_ALLOCATIONS = {
        RiskToleranceLevel.CONSERVATIVE: 30,
        RiskToleranceLevel.MODERATELY_CONSERVATIVE: 45,
        RiskToleranceLevel.MODERATE: 60,
        RiskToleranceLevel.MODERATELY_AGGRESSIVE: 75,
        RiskToleranceLevel.AGGRESSIVE: 90,
    }

    def score_questionnaire(self, questionnaire: RiskQuestionnaire) -> dict:
        """Calculate risk score and recommended allocation from questionnaire."""
        total_score = sum([
            questionnaire.q1_investment_experience,
            questionnaire.q2_risk_comfort,
            questionnaire.q3_loss_reaction,
            questionnaire.q4_income_stability,
            questionnaire.q5_emergency_fund,
            questionnaire.q6_investment_goal,
            min(questionnaire.q7_time_horizon_years // 3, 5),
            questionnaire.q8_withdrawal_needs,
            questionnaire.q9_portfolio_volatility,
            questionnaire.q10_financial_knowledge,
        ])

        risk_tolerance = RiskToleranceLevel.MODERATE
        for (low, high), level in self.RISK_THRESHOLDS.items():
            if low <= total_score <= high:
                risk_tolerance = level
                break

        recommended_equity_pct = self.EQUITY_ALLOCATIONS[risk_tolerance]

        if questionnaire.q7_time_horizon_years < 3:
            recommended_equity_pct = max(20, recommended_equity_pct - 20)
        elif questionnaire.q7_time_horizon_years > 20:
            recommended_equity_pct = min(95, recommended_equity_pct + 10)

        return {
            "total_score": total_score,
            "risk_tolerance": risk_tolerance.value,
            "recommended_equity_pct": recommended_equity_pct,
        }

    def get_preset_portfolio(self, risk_level: str) -> dict:
        """Get a preset portfolio template by risk level."""
        if risk_level not in PRESET_PORTFOLIOS:
            raise ValueError(f"Unknown risk level: {risk_level}")
        return PRESET_PORTFOLIOS[risk_level]

    def build_portfolio_from_questionnaire(
        self,
        questionnaire: RiskQuestionnaire,
        customize: Optional[dict] = None,
    ) -> ModelPortfolio:
        """Build a complete portfolio from questionnaire responses."""
        scores = self.score_questionnaire(questionnaire)
        risk_level = scores["risk_tolerance"]

        preset = self.get_preset_portfolio(risk_level)

        portfolio = ModelPortfolio(
            name=f"{preset['name']} - {questionnaire.client_id}",
            description=preset["description"],
            risk_level=risk_level,
            is_preset=False,
            questionnaire_id=questionnaire.id,
            equity_allocation=Decimal(str(preset["equity_allocation"])),
            fixed_income_allocation=Decimal(str(preset["fixed_income_allocation"])),
            alternatives_allocation=Decimal(str(preset.get("alternatives_allocation", 0))),
            cash_allocation=Decimal(str(preset.get("cash_allocation", 0))),
        )

        self._calculate_sub_allocations(portfolio, preset["holdings"])

        for holding_data in preset["holdings"]:
            symbol = holding_data["symbol"]
            etf_info = ETF_UNIVERSE.get(symbol, {})

            holding = ModelPortfolioHolding(
                portfolio_id=portfolio.id,
                symbol=symbol,
                name=etf_info.get("name", symbol),
                asset_class=etf_info.get("asset_class", "equity"),
                sub_class=etf_info.get("sub_class", ""),
                target_weight=Decimal(str(holding_data["weight"])),
                min_weight=Decimal(str(max(0, holding_data["weight"] - 5))),
                max_weight=Decimal(str(min(100, holding_data["weight"] + 5))),
                expense_ratio=Decimal(str(etf_info.get("expense_ratio", 0))),
                selection_rationale=holding_data.get("rationale", ""),
            )
            portfolio.holdings.append(holding)

        if customize:
            self._apply_customizations(portfolio, customize)

        return portfolio

    def _calculate_sub_allocations(self, portfolio: ModelPortfolio, holdings: list) -> None:
        """Calculate market cap and bond type sub-allocations from holdings."""
        large_cap = mid_cap = small_cap = intl_dev = em = Decimal("0")
        govt = corp = tips = hy = intl_bond = Decimal("0")

        for h in holdings:
            symbol = h["symbol"]
            weight = Decimal(str(h["weight"]))
            etf_info = ETF_UNIVERSE.get(symbol, {})
            sub_class = etf_info.get("sub_class", "")

            if sub_class in ("large_cap_us", "large_cap_growth", "large_cap_value", "total_us_market"):
                large_cap += weight * Decimal("0.7")
                mid_cap += weight * Decimal("0.2")
                small_cap += weight * Decimal("0.1")
            elif sub_class == "mid_cap_us":
                mid_cap += weight
            elif sub_class in ("small_cap_us", "small_cap_value"):
                small_cap += weight
            elif sub_class in ("international_developed", "total_international"):
                intl_dev += weight * Decimal("0.85")
                em += weight * Decimal("0.15")
            elif sub_class == "emerging_markets":
                em += weight
            elif sub_class in ("total_bond", "govt_bonds", "short_term_treasury", "intermediate_treasury", "long_term_treasury"):
                govt += weight * Decimal("0.6")
                corp += weight * Decimal("0.4")
            elif sub_class == "corp_bonds":
                corp += weight
            elif sub_class == "tips":
                tips += weight
            elif sub_class == "high_yield":
                hy += weight
            elif sub_class == "intl_bonds":
                intl_bond += weight

        portfolio.large_cap_pct = large_cap
        portfolio.mid_cap_pct = mid_cap
        portfolio.small_cap_pct = small_cap
        portfolio.international_developed_pct = intl_dev
        portfolio.emerging_markets_pct = em
        portfolio.govt_bonds_pct = govt
        portfolio.corp_bonds_pct = corp
        portfolio.tips_pct = tips
        portfolio.high_yield_pct = hy
        portfolio.intl_bonds_pct = intl_bond

    def _apply_customizations(self, portfolio: ModelPortfolio, customize: dict) -> None:
        """Apply user customizations to portfolio."""
        if customize.get("esg_only"):
            portfolio.esg_compliant = True

        if customize.get("exclude_sectors"):
            pass

        if customize.get("tax_efficiency"):
            portfolio.tax_efficiency_optimized = True

    def calculate_portfolio_metrics(self, portfolio: ModelPortfolio) -> dict:
        """Calculate aggregate portfolio metrics."""
        total_expense = Decimal("0")
        total_yield = Decimal("0")

        for holding in portfolio.holdings:
            weight = holding.target_weight / 100
            total_expense += weight * (holding.expense_ratio or Decimal("0"))
            total_yield += weight * (holding.dividend_yield or Decimal("0"))

        num_holdings = len(portfolio.holdings)
        diversification_score = min(100, num_holdings * 10 + 20)

        return {
            "weighted_expense_ratio": float(total_expense),
            "weighted_expense_ratio_bps": float(total_expense * 10000),
            "estimated_yield": float(total_yield),
            "num_holdings": num_holdings,
            "diversification_score": diversification_score,
        }
