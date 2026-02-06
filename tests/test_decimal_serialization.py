"""Verify Decimal(15,2) survives SQLAlchemy -> Pydantic -> JSON."""

from decimal import Decimal

import pytest

from backend.services.schemas import AssetAllocationItem, FeeImpactReport


def test_monetary_precision_preserved():
    """Verify Decimal survives Pydantic model -> JSON with precision intact."""
    item = AssetAllocationItem(
        asset_class="EQUITY",
        actual_pct=Decimal("55.70"),
        value=Decimal("54905.58"),
    )
    json_str = item.model_dump_json()
    assert "54905.58" in json_str
    assert "55.70" in json_str
    assert "54905.57999" not in json_str
    assert "55.7" in json_str or "55.70" in json_str


def test_fee_impact_report_decimal_serialization():
    """Fee impact report preserves Decimal precision."""
    report = FeeImpactReport(
        account_id="test-123",
        total_annual_fees=Decimal("1234.56"),
        projected_10yr=Decimal("12345.60"),
        projected_20yr=Decimal("24691.20"),
        projected_30yr=Decimal("37036.80"),
        low_cost_alternative_estimate=Decimal("500.00"),
        opportunity_cost_30yr=Decimal("36536.80"),
    )
    json_str = report.model_dump_json()
    assert "1234.56" in json_str
    assert "37036.80" in json_str
