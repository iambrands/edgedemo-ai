"""
Investment Policy Statement (IPS) Generator Service

Generates compliant IPS documents based on client profile, risk assessment,
and recommended portfolio. The IPS is the core fiduciary document for RIAs.
"""

import logging
from datetime import date, timedelta
from typing import TYPE_CHECKING, Optional

from backend.models.portfolio_models import (
    InvestmentPolicyStatement,
    RiskQuestionnaire,
    ModelPortfolio,
)

logger = logging.getLogger(__name__)


class IPSGeneratorService:
    """Generates Investment Policy Statements for clients."""

    def generate_ips(
        self,
        client: "Client",
        questionnaire: RiskQuestionnaire,
        portfolio: ModelPortfolio,
        household: Optional["Household"] = None,
        advisor_name: Optional[str] = None,
        firm_name: str = "IAB Advisors",
    ) -> InvestmentPolicyStatement:
        """Generate a complete IPS document."""
        ips = InvestmentPolicyStatement(
            client_id=client.id,
            household_id=household.id if household else None,
            questionnaire_id=questionnaire.id,
            portfolio_id=portfolio.id,
            effective_date=date.today(),
            review_date=date.today() + timedelta(days=365),
        )

        ips.executive_summary = self._generate_executive_summary(
            client, questionnaire, portfolio, firm_name
        )
        ips.client_profile_section = self._generate_client_profile(client, household)
        ips.investment_objectives_section = self._generate_objectives(questionnaire)
        ips.risk_tolerance_section = self._generate_risk_section(questionnaire)
        ips.time_horizon_section = self._generate_time_horizon(questionnaire)
        ips.asset_allocation_section = self._generate_asset_allocation(portfolio)
        ips.investment_guidelines_section = self._generate_guidelines(portfolio)
        ips.rebalancing_policy_section = self._generate_rebalancing_policy(portfolio)
        ips.monitoring_section = self._generate_monitoring_section()
        ips.fiduciary_acknowledgment_section = self._generate_fiduciary_section(
            advisor_name, firm_name
        )

        return ips

    def _generate_executive_summary(
        self,
        client: "Client",
        questionnaire: RiskQuestionnaire,
        portfolio: ModelPortfolio,
        firm_name: str,
    ) -> str:
        """Generate executive summary paragraph."""
        risk_desc = {
            "conservative": "conservative, capital preservation-focused",
            "moderately_conservative": "moderately conservative, stability-oriented",
            "moderate": "moderate, balanced growth and income",
            "moderately_aggressive": "moderately aggressive, growth-oriented",
            "aggressive": "aggressive, maximum growth-focused",
        }

        return f"""
This Investment Policy Statement ("IPS") establishes the investment objectives,
guidelines, and policies for {client.first_name} {client.last_name} ("Client")
in relationship with {firm_name} ("Advisor").

Based on a comprehensive assessment of the Client's financial situation, risk tolerance,
and investment objectives, this IPS recommends a {risk_desc.get(portfolio.risk_level, 'moderate')}
investment strategy with a target allocation of {portfolio.equity_allocation}% equities,
{portfolio.fixed_income_allocation}% fixed income, {portfolio.alternatives_allocation}% alternatives,
and {portfolio.cash_allocation}% cash equivalents.

{firm_name} acts as a fiduciary and is legally obligated to act in the Client's best interest
at all times. This IPS serves as the governing document for all investment decisions made
on behalf of the Client.

Effective Date: {date.today().strftime('%B %d, %Y')}
Next Review Date: {(date.today() + timedelta(days=365)).strftime('%B %d, %Y')}
        """.strip()

    def _generate_client_profile(self, client: "Client", household: Optional["Household"]) -> dict:
        """Generate client profile section."""
        annual_income = getattr(client, "annual_income", None)
        liquid_net_worth = getattr(client, "liquid_net_worth", None)
        total_net_worth = getattr(client, "total_net_worth", None)

        profile = {
            "client_name": f"{client.first_name} {client.last_name}",
            "date_of_birth": client.date_of_birth.isoformat() if client.date_of_birth else None,
            "tax_filing_status": getattr(client, "tax_filing_status", None),
            "employment_status": getattr(client, "employment_status", None),
            "annual_income": float(annual_income) if annual_income is not None else None,
            "liquid_net_worth": float(liquid_net_worth) if liquid_net_worth is not None else None,
            "total_net_worth": float(total_net_worth) if total_net_worth is not None else None,
        }

        if household:
            profile["household_name"] = household.name
            profile["household_members"] = getattr(household, "member_count", None)

        return profile

    def _generate_objectives(self, questionnaire: RiskQuestionnaire) -> dict:
        """Generate investment objectives section."""
        objective_map = {
            1: ("Capital Preservation", "Preserve principal with minimal risk of loss."),
            2: ("Income Generation", "Generate steady income while preserving capital."),
            3: ("Growth and Income", "Balance capital appreciation with income generation."),
            4: ("Capital Growth", "Grow capital over time, accepting moderate volatility."),
            5: ("Aggressive Growth", "Maximize long-term growth, accepting higher volatility."),
        }

        primary = objective_map.get(questionnaire.q6_investment_goal, objective_map[3])

        return {
            "primary_objective": primary[0],
            "objective_description": primary[1],
            "secondary_objectives": [
                "Maintain adequate liquidity for planned withdrawals",
                "Minimize tax impact through efficient asset location",
                "Diversify across asset classes to reduce concentration risk",
            ],
            "constraints": self._generate_constraints(questionnaire),
        }

    def _generate_constraints(self, questionnaire: RiskQuestionnaire) -> list:
        """Generate investment constraints based on questionnaire."""
        constraints = []

        if questionnaire.q7_time_horizon_years < 5:
            constraints.append("Short time horizon requires emphasis on capital preservation and liquidity.")

        if questionnaire.q8_withdrawal_needs <= 2:
            constraints.append("Near-term withdrawal needs require maintaining adequate cash reserves.")

        if questionnaire.q4_income_stability <= 2:
            constraints.append("Income instability requires conservative positioning and emergency reserves.")

        if questionnaire.special_considerations:
            constraints.append(f"Special considerations: {questionnaire.special_considerations}")

        return constraints

    def _generate_risk_section(self, questionnaire: RiskQuestionnaire) -> dict:
        """Generate risk tolerance section."""
        risk_descriptions = {
            "conservative": {
                "level": "Conservative",
                "description": "Client has low tolerance for volatility and prioritizes capital preservation over growth.",
                "max_drawdown_tolerance": "10%",
                "volatility_expectation": "Low - expects minimal fluctuations in portfolio value.",
            },
            "moderately_conservative": {
                "level": "Moderately Conservative",
                "description": "Client prefers stability but accepts some volatility for modest growth potential.",
                "max_drawdown_tolerance": "15%",
                "volatility_expectation": "Below average - willing to accept some fluctuations for better returns.",
            },
            "moderate": {
                "level": "Moderate",
                "description": "Client seeks balance between growth and stability, accepting average market volatility.",
                "max_drawdown_tolerance": "20%",
                "volatility_expectation": "Average - accepts normal market fluctuations.",
            },
            "moderately_aggressive": {
                "level": "Moderately Aggressive",
                "description": "Client prioritizes growth and can tolerate above-average volatility.",
                "max_drawdown_tolerance": "30%",
                "volatility_expectation": "Above average - comfortable with significant short-term fluctuations.",
            },
            "aggressive": {
                "level": "Aggressive",
                "description": "Client seeks maximum growth and can tolerate high volatility and significant drawdowns.",
                "max_drawdown_tolerance": "40%+",
                "volatility_expectation": "High - accepts large fluctuations for maximum growth potential.",
            },
        }

        risk_level = questionnaire.risk_tolerance or "moderate"
        risk_info = risk_descriptions.get(risk_level, risk_descriptions["moderate"])

        return {
            **risk_info,
            "risk_score": questionnaire.total_score,
            "assessment_factors": {
                "investment_experience": questionnaire.q1_investment_experience,
                "risk_comfort": questionnaire.q2_risk_comfort,
                "loss_reaction": questionnaire.q3_loss_reaction,
                "financial_knowledge": questionnaire.q10_financial_knowledge,
            },
        }

    def _generate_time_horizon(self, questionnaire: RiskQuestionnaire) -> dict:
        """Generate time horizon section."""
        years = questionnaire.q7_time_horizon_years

        if years < 3:
            horizon_category = "Short-Term"
            implications = "Focus on capital preservation and liquidity. Limited equity exposure recommended."
        elif years < 7:
            horizon_category = "Medium-Term"
            implications = "Balanced approach appropriate. Some equity exposure for growth potential."
        elif years < 15:
            horizon_category = "Long-Term"
            implications = "Growth-oriented allocation appropriate. Can weather short-term volatility."
        else:
            horizon_category = "Very Long-Term"
            implications = "Maximum growth potential. Extended time horizon allows recovery from market downturns."

        return {
            "years": years,
            "category": horizon_category,
            "implications": implications,
            "key_milestones": [],
        }

    def _generate_asset_allocation(self, portfolio: ModelPortfolio) -> dict:
        """Generate asset allocation section."""
        return {
            "target_allocation": {
                "equities": float(portfolio.equity_allocation),
                "fixed_income": float(portfolio.fixed_income_allocation),
                "alternatives": float(portfolio.alternatives_allocation or 0),
                "cash": float(portfolio.cash_allocation or 0),
            },
            "equity_breakdown": {
                "us_large_cap": float(portfolio.large_cap_pct or 0),
                "us_mid_cap": float(portfolio.mid_cap_pct or 0),
                "us_small_cap": float(portfolio.small_cap_pct or 0),
                "international_developed": float(portfolio.international_developed_pct or 0),
                "emerging_markets": float(portfolio.emerging_markets_pct or 0),
            },
            "fixed_income_breakdown": {
                "government_bonds": float(portfolio.govt_bonds_pct or 0),
                "corporate_bonds": float(portfolio.corp_bonds_pct or 0),
                "tips": float(portfolio.tips_pct or 0),
                "high_yield": float(portfolio.high_yield_pct or 0),
                "international_bonds": float(portfolio.intl_bonds_pct or 0),
            },
            "allocation_ranges": {
                "equities": {
                    "target": float(portfolio.equity_allocation),
                    "minimum": max(0, float(portfolio.equity_allocation) - 10),
                    "maximum": min(100, float(portfolio.equity_allocation) + 10),
                },
                "fixed_income": {
                    "target": float(portfolio.fixed_income_allocation),
                    "minimum": max(0, float(portfolio.fixed_income_allocation) - 10),
                    "maximum": min(100, float(portfolio.fixed_income_allocation) + 10),
                },
            },
            "recommended_holdings": [
                {
                    "symbol": h.symbol,
                    "name": h.name,
                    "target_weight": float(h.target_weight),
                    "asset_class": h.asset_class,
                    "rationale": h.selection_rationale,
                }
                for h in portfolio.holdings
            ],
        }

    def _generate_guidelines(self, portfolio: ModelPortfolio) -> dict:
        """Generate investment guidelines section."""
        return {
            "permitted_investments": [
                "Exchange-traded funds (ETFs) from the approved list",
                "Index mutual funds with expense ratios below 0.50%",
                "US Treasury securities",
                "Investment-grade corporate bonds",
                "Money market funds for cash management",
            ],
            "prohibited_investments": [
                "Individual stocks (unless specifically approved)",
                "Options, futures, or other derivatives",
                "Private placements or illiquid investments",
                "Cryptocurrencies or digital assets",
                "Leveraged or inverse ETFs",
                "Penny stocks or OTC securities",
            ],
            "concentration_limits": {
                "single_security_max": "10% of portfolio",
                "single_sector_max": "25% of equity allocation",
                "single_issuer_bonds_max": "5% of fixed income allocation",
            },
            "tax_efficiency_guidelines": [
                "Hold tax-inefficient assets (bonds, REITs) in tax-advantaged accounts",
                "Hold tax-efficient assets (index ETFs) in taxable accounts",
                "Harvest tax losses when opportunities exceed $1,000",
                "Avoid wash sales across all accounts",
            ],
            "esg_considerations": "ESG compliant" if portfolio.esg_compliant else "Standard investment criteria (no ESG filter)",
        }

    def _generate_rebalancing_policy(self, portfolio: ModelPortfolio) -> dict:
        """Generate rebalancing policy section."""
        frequency = portfolio.rebalancing_frequency or "quarterly"

        return {
            "frequency": frequency.capitalize(),
            "frequency_description": {
                "monthly": "Portfolio reviewed monthly, rebalanced if thresholds exceeded.",
                "quarterly": "Portfolio reviewed quarterly, rebalanced if thresholds exceeded.",
                "semi_annual": "Portfolio reviewed semi-annually, rebalanced if thresholds exceeded.",
                "annual": "Portfolio reviewed annually, rebalanced if thresholds exceeded.",
            }.get(frequency, "Portfolio reviewed quarterly."),
            "rebalancing_thresholds": {
                "asset_class_drift": "±5% from target allocation triggers rebalancing",
                "individual_holding_drift": "±3% from target weight triggers rebalancing",
            },
            "rebalancing_approach": [
                "Use new contributions to rebalance when possible",
                "Consider tax implications before selling appreciated positions",
                "Prioritize rebalancing in tax-advantaged accounts",
                "Document rationale for any deviation from policy",
            ],
            "cash_flow_rebalancing": "New contributions will be directed to underweight asset classes to minimize transaction costs.",
        }

    def _generate_monitoring_section(self) -> dict:
        """Generate monitoring and reporting section."""
        return {
            "performance_reporting": {
                "frequency": "Quarterly",
                "metrics": [
                    "Time-weighted return vs. benchmark",
                    "Risk-adjusted return (Sharpe ratio)",
                    "Portfolio volatility",
                    "Maximum drawdown",
                ],
                "benchmark": "Blended benchmark based on target allocation",
            },
            "review_schedule": {
                "quarterly_review": "Performance review and rebalancing assessment",
                "annual_review": "Comprehensive IPS review and update",
                "ad_hoc_review": "Triggered by major life events or market conditions",
            },
            "communication": {
                "quarterly_statements": "Detailed portfolio statement with performance attribution",
                "annual_summary": "Year-end summary with tax reporting",
                "market_commentary": "As-needed updates during significant market events",
            },
            "ips_review_triggers": [
                "Material change in financial situation",
                "Change in investment objectives or risk tolerance",
                "Major life event (marriage, divorce, inheritance, retirement)",
                "Significant market event impacting long-term assumptions",
            ],
        }

    def _generate_fiduciary_section(
        self, advisor_name: Optional[str], firm_name: str
    ) -> dict:
        """Generate fiduciary acknowledgment section."""
        return {
            "fiduciary_standard": f"""
{firm_name} is a registered investment adviser and acts as a fiduciary to its clients.
As a fiduciary, {firm_name} is legally obligated to:

1. Act in the client's best interest at all times
2. Provide full and fair disclosure of all material facts
3. Avoid or disclose conflicts of interest
4. Seek best execution for client transactions
5. Maintain confidentiality of client information
            """.strip(),
            "fee_disclosure": {
                "fee_structure": "Fee-only advisory",
                "description": "Advisor is compensated solely by client fees. Advisor does not receive commissions, 12b-1 fees, or other compensation from third parties.",
                "conflicts": "Advisor has no financial incentive to recommend any particular investment product.",
            },
            "client_responsibilities": [
                "Notify Advisor of any material changes in financial situation",
                "Review quarterly statements and report any discrepancies",
                "Communicate changes in investment objectives or risk tolerance",
                "Provide accurate and complete information for planning purposes",
            ],
            "advisor_name": advisor_name or "Assigned Advisor",
            "firm_name": firm_name,
            "signature_block": {
                "client_signature_line": "________________________",
                "client_date_line": "Date: ____________",
                "advisor_signature_line": "________________________",
                "advisor_date_line": "Date: ____________",
            },
        }


if TYPE_CHECKING:
    from backend.models.client import Client
    from backend.models.household import Household
