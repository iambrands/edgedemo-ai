"""Unit tests for IMM-03 CIM compliance rule checks."""

import pytest
from backend.services.cim_service import ComplianceRulesEngine


class TestFiduciaryCheck:
    def setup_method(self):
        self.engine = ComplianceRulesEngine()

    def test_within_threshold(self):
        result = self.engine.check_ia_act_fiduciary(
            {"current_allocation": {"equity": 60, "fixed_income": 30, "alternatives": 10}},
            {"target_allocation": {"equity": 55, "fixed_income": 30, "alternatives": 15}},
        )
        assert result.passed is True

    def test_exceeds_threshold(self):
        result = self.engine.check_ia_act_fiduciary(
            {"current_allocation": {"equity": 80, "fixed_income": 10, "alternatives": 10}},
            {"target_allocation": {"equity": 55, "fixed_income": 30, "alternatives": 15}},
        )
        assert result.passed is False
        assert result.details["max_drift_pct"] >= 20


class TestSuitabilityCheck:
    def setup_method(self):
        self.engine = ComplianceRulesEngine()

    def test_options_for_conservative_blocked(self):
        result = self.engine.check_series65_suitability(
            {"strategy_type": "Covered Call Option Strategy", "risk_level": 4, "liquidity_rating": 3},
            {"profile_type": "conservative", "time_horizon_years": 10, "risk_tolerance": 2},
        )
        assert result.passed is False
        assert result.severity == "BLOCKING"

    def test_suitable_recommendation_passes(self):
        result = self.engine.check_series65_suitability(
            {"strategy_type": "Balanced ETF", "risk_level": 3, "liquidity_rating": 5},
            {"profile_type": "moderate", "time_horizon_years": 15, "risk_tolerance": 3},
        )
        assert result.passed is True


class TestADVCurrency:
    def setup_method(self):
        self.engine = ComplianceRulesEngine()

    def test_current_adv_passes(self):
        result = self.engine.check_adv_currency({"days_since_update": 200})
        assert result.passed is True

    def test_stale_adv_fails(self):
        result = self.engine.check_adv_currency({"days_since_update": 400})
        assert result.passed is False
        assert result.severity == "BLOCKING"

    def test_near_expiry_warning(self):
        result = self.engine.check_adv_currency({"days_since_update": 320})
        assert result.severity == "WARNING"


class TestConflictOfInterest:
    def setup_method(self):
        self.engine = ComplianceRulesEngine()

    def test_no_conflict(self):
        result = self.engine.check_conflict_of_interest({"involves_advisor_account": False})
        assert result.passed is True

    def test_principal_trade_blocked(self):
        result = self.engine.check_conflict_of_interest({"involves_advisor_account": True})
        assert result.passed is False
        assert result.severity == "BLOCKING"


class TestSuitabilityScore:
    @pytest.mark.asyncio
    async def test_score_perfect(self):
        from backend.services.cim_service import CIMService
        from unittest.mock import AsyncMock
        cim = CIMService(AsyncMock())
        result = await cim.compute_suitability_score(
            {"risk_tolerance": 3, "sophistication_level": 3, "liquidity_needs": 3},
            {"risk_level": 3, "complexity_rating": 1, "liquidity_rating": 5},
        )
        assert result["score"] == 100
        assert result["passed"] is True
        assert result["blocking"] is False

    @pytest.mark.asyncio
    async def test_score_blocking(self):
        from backend.services.cim_service import CIMService
        from unittest.mock import AsyncMock
        cim = CIMService(AsyncMock())
        result = await cim.compute_suitability_score(
            {"risk_tolerance": 1, "sophistication_level": 1, "liquidity_needs": 5},
            {"risk_level": 5, "complexity_rating": 5, "liquidity_rating": 1},
        )
        assert result["blocking"] is True
        assert result["score"] < 60
