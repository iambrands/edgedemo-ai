"""Tests for ETF Portfolio Builder and IPS Generator."""

import pytest
from decimal import Decimal
from uuid import uuid4

from backend.services.portfolio_builder_service import PortfolioBuilderService
from backend.services.ips_generator_service import IPSGeneratorService
from backend.models.portfolio_models import RiskQuestionnaire, RiskToleranceLevel
from backend.data.etf_universe import ETF_UNIVERSE, PRESET_PORTFOLIOS


class TestPortfolioBuilder:
    """Tests for PortfolioBuilderService."""

    def setup_method(self):
        self.service = PortfolioBuilderService()

    def test_score_conservative_questionnaire(self):
        """Low scores should result in conservative profile."""
        questionnaire = RiskQuestionnaire(
            client_id=uuid4(),
            q1_investment_experience=1,
            q2_risk_comfort=1,
            q3_loss_reaction=1,
            q4_income_stability=2,
            q5_emergency_fund=2,
            q6_investment_goal=1,
            q7_time_horizon_years=3,
            q8_withdrawal_needs=1,
            q9_portfolio_volatility=1,
            q10_financial_knowledge=1,
        )

        scores = self.service.score_questionnaire(questionnaire)

        assert scores["risk_tolerance"] == "conservative"
        assert scores["recommended_equity_pct"] <= 30

    def test_score_aggressive_questionnaire(self):
        """High scores should result in aggressive profile."""
        questionnaire = RiskQuestionnaire(
            client_id=uuid4(),
            q1_investment_experience=5,
            q2_risk_comfort=5,
            q3_loss_reaction=5,
            q4_income_stability=5,
            q5_emergency_fund=5,
            q6_investment_goal=5,
            q7_time_horizon_years=30,
            q8_withdrawal_needs=5,
            q9_portfolio_volatility=5,
            q10_financial_knowledge=5,
        )

        scores = self.service.score_questionnaire(questionnaire)

        assert scores["risk_tolerance"] == "aggressive"
        assert scores["recommended_equity_pct"] >= 90

    def test_preset_portfolios_sum_to_100(self):
        """All preset portfolios should sum to 100%."""
        for level, preset in PRESET_PORTFOLIOS.items():
            total = (
                preset["equity_allocation"]
                + preset["fixed_income_allocation"]
                + preset.get("alternatives_allocation", 0)
                + preset.get("cash_allocation", 0)
            )
            assert total == 100, f"{level} portfolio sums to {total}, not 100"

    def test_preset_holdings_sum_to_100(self):
        """Holdings in each preset should sum to 100%."""
        for level, preset in PRESET_PORTFOLIOS.items():
            total = sum(h["weight"] for h in preset["holdings"])
            assert total == 100, f"{level} holdings sum to {total}, not 100"

    def test_build_portfolio_creates_holdings(self):
        """Building a portfolio should create holdings."""
        questionnaire = RiskQuestionnaire(
            client_id=uuid4(),
            q1_investment_experience=3,
            q2_risk_comfort=3,
            q3_loss_reaction=3,
            q4_income_stability=3,
            q5_emergency_fund=3,
            q6_investment_goal=3,
            q7_time_horizon_years=10,
            q8_withdrawal_needs=3,
            q9_portfolio_volatility=3,
            q10_financial_knowledge=3,
        )

        portfolio = self.service.build_portfolio_from_questionnaire(questionnaire)

        assert len(portfolio.holdings) > 0
        assert portfolio.equity_allocation > 0
        assert portfolio.fixed_income_allocation > 0

    def test_etf_universe_has_required_asset_classes(self):
        """ETF universe should cover all major asset classes."""
        asset_classes = set(etf["asset_class"] for etf in ETF_UNIVERSE.values())

        assert "equity" in asset_classes
        assert "fixed_income" in asset_classes
        assert "alternatives" in asset_classes
        assert "cash" in asset_classes

    def test_portfolio_metrics_calculation(self):
        """Portfolio metrics should be calculated correctly."""
        questionnaire = RiskQuestionnaire(
            client_id=uuid4(),
            q1_investment_experience=3,
            q2_risk_comfort=3,
            q3_loss_reaction=3,
            q4_income_stability=3,
            q5_emergency_fund=3,
            q6_investment_goal=3,
            q7_time_horizon_years=10,
            q8_withdrawal_needs=3,
            q9_portfolio_volatility=3,
            q10_financial_knowledge=3,
        )

        portfolio = self.service.build_portfolio_from_questionnaire(questionnaire)
        metrics = self.service.calculate_portfolio_metrics(portfolio)

        assert "weighted_expense_ratio" in metrics
        assert "weighted_expense_ratio_bps" in metrics
        assert metrics["weighted_expense_ratio"] < 0.01
        assert metrics["num_holdings"] > 5


class TestIPSGenerator:
    """Tests for IPSGeneratorService."""

    def setup_method(self):
        self.ips_service = IPSGeneratorService()
        self.portfolio_service = PortfolioBuilderService()

    def test_generate_ips_all_sections(self):
        """Generated IPS should have all required sections."""
        class MockClient:
            id = uuid4()
            first_name = "Nicole"
            last_name = "Wilson"
            date_of_birth = None
            annual_income = Decimal("75000")
            liquid_net_worth = Decimal("50000")
            total_net_worth = Decimal("100000")

        questionnaire = RiskQuestionnaire(
            client_id=MockClient.id,
            q1_investment_experience=3,
            q2_risk_comfort=3,
            q3_loss_reaction=3,
            q4_income_stability=4,
            q5_emergency_fund=3,
            q6_investment_goal=3,
            q7_time_horizon_years=15,
            q8_withdrawal_needs=4,
            q9_portfolio_volatility=3,
            q10_financial_knowledge=3,
        )

        scores = self.portfolio_service.score_questionnaire(questionnaire)
        questionnaire.total_score = scores["total_score"]
        questionnaire.risk_tolerance = scores["risk_tolerance"]

        portfolio = self.portfolio_service.build_portfolio_from_questionnaire(questionnaire)

        ips = self.ips_service.generate_ips(
            client=MockClient(),
            questionnaire=questionnaire,
            portfolio=portfolio,
        )

        assert ips.executive_summary is not None
        assert ips.client_profile_section is not None
        assert ips.investment_objectives_section is not None
        assert ips.risk_tolerance_section is not None
        assert ips.time_horizon_section is not None
        assert ips.asset_allocation_section is not None
        assert ips.investment_guidelines_section is not None
        assert ips.rebalancing_policy_section is not None
        assert ips.monitoring_section is not None
        assert ips.fiduciary_acknowledgment_section is not None

    def test_ips_fiduciary_language(self):
        """IPS should include fiduciary standard language."""
        class MockClient:
            id = uuid4()
            first_name = "Test"
            last_name = "Client"
            date_of_birth = None
            annual_income = None
            liquid_net_worth = None
            total_net_worth = None

        questionnaire = RiskQuestionnaire(
            client_id=MockClient.id,
            q1_investment_experience=3,
            q2_risk_comfort=3,
            q3_loss_reaction=3,
            q4_income_stability=3,
            q5_emergency_fund=3,
            q6_investment_goal=3,
            q7_time_horizon_years=10,
            q8_withdrawal_needs=3,
            q9_portfolio_volatility=3,
            q10_financial_knowledge=3,
            total_score=30,
            risk_tolerance="moderate",
        )

        portfolio = self.portfolio_service.build_portfolio_from_questionnaire(questionnaire)

        ips = self.ips_service.generate_ips(
            client=MockClient(),
            questionnaire=questionnaire,
            portfolio=portfolio,
            firm_name="IAB Advisors",
        )

        fiduciary = ips.fiduciary_acknowledgment_section

        assert "fiduciary" in fiduciary["fiduciary_standard"].lower()
        assert "best interest" in fiduciary["fiduciary_standard"].lower()
        assert fiduciary["fee_disclosure"]["fee_structure"] == "Fee-only advisory"
