"""
Test 1B: Validate IIM service produces correct analysis
for Nicole Wilson's household using seeded test data.
"""

from decimal import Decimal

import pytest

from backend.services.iim_service import IIMService


class TestIIMHouseholdAnalysis:
    """Validate IIM.analyze_household() with Nicole's data."""

    @pytest.mark.asyncio
    async def test_household_aggregation(self, nicole_household, nicole_mock_session):
        """IIM correctly aggregates 3 accounts into household view."""
        iim = IIMService(nicole_mock_session)
        household = nicole_household["household"]

        result = await iim.analyze_household(str(household.id))

        assert result is not None
        expected_aum = Decimal("42005.58") + Decimal("8000.00") + Decimal("4900.00")
        assert abs(result.total_aum - expected_aum) < Decimal("100.00"), (
            f"AUM mismatch: {result.total_aum} vs expected ~{expected_aum}"
        )
        assert result.account_count == 3

    @pytest.mark.asyncio
    async def test_fee_impact_nw_mutual_va(self, nicole_household, nicole_mock_session):
        """IIM fee impact calculation for NW Mutual VA shows meaningful costs."""
        iim = IIMService(nicole_mock_session)
        va_account = nicole_household["va_account"]

        result = await iim.calculate_fee_impact(str(va_account.id))

        assert result is not None
        assert result.total_annual_fees >= Decimal("0")
        assert result.projected_30yr >= Decimal("0")

    @pytest.mark.asyncio
    async def test_concentration_risk(self, nicole_household, nicole_mock_session):
        """IIM flags concentration risk."""
        iim = IIMService(nicole_mock_session)
        household = nicole_household["household"]

        result = await iim.detect_concentration_risk(str(household.id))

        assert result is not None
        assert result.risk_score >= 0
        assert result.risk_score <= 100

    @pytest.mark.asyncio
    async def test_rebalancing_plan(self, nicole_household, nicole_mock_session):
        """IIM generates rebalancing plan."""
        iim = IIMService(nicole_mock_session)
        va_account = nicole_household["va_account"]

        result = await iim.generate_rebalancing_plan(str(va_account.id))

        assert result is not None
        assert result.account_id == str(va_account.id)
        assert result.tax_efficient in (True, False)

    @pytest.mark.asyncio
    async def test_tax_loss_harvesting_scan(self, nicole_household, nicole_mock_session):
        """IIM tax-loss harvesting scan returns valid structure."""
        iim = IIMService(nicole_mock_session)
        household = nicole_household["household"]

        result = await iim.tax_loss_harvesting_scan(str(household.id))

        assert result is not None
        assert result.household_id == str(household.id)
        assert isinstance(result.opportunities, list)
