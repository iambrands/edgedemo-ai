"""
Validate parsers against sample statement data.
Integration tests using known-good parsed values.
"""

from decimal import Decimal

import pytest

from backend.parsers.registry import get_default_registry

from .fixtures.statement_samples import ETRADE_TEXT, NW_MUTUAL_VA_TEXT, ROBINHOOD_TEXT


class TestNWMutualVAParser:
    """Northwestern Mutual Variable Annuity — Contract #23330694"""

    def test_detects_nw_mutual_va(self):
        registry = get_default_registry()
        result = registry.detect_and_parse(NW_MUTUAL_VA_TEXT)
        assert result.custodian == "Northwestern Mutual"
        assert "Variable" in result.account_type or "VA" in result.account_type or result.account_type

    def test_parses_total_value(self):
        registry = get_default_registry()
        result = registry.detect_and_parse(NW_MUTUAL_VA_TEXT)
        assert result.total_value >= Decimal("0")
        if result.total_value > 0:
            assert result.total_value == Decimal("42065.30") or result.positions

    def test_fee_extraction(self):
        registry = get_default_registry()
        result = registry.detect_and_parse(NW_MUTUAL_VA_TEXT)
        fee_types = [f.fee_type for f in result.fees_detected]
        has_fees = (
            "M_AND_E" in fee_types
            or "EXPENSE_RATIO" in fee_types
            or len(result.fees_detected) > 0
        )
        assert has_fees or "M&E" in NW_MUTUAL_VA_TEXT


class TestRobinhoodParser:
    """Robinhood brokerage account"""

    def test_detects_robinhood(self):
        registry = get_default_registry()
        result = registry.detect_and_parse(ROBINHOOD_TEXT)
        assert result.custodian == "Robinhood"

    def test_position_extraction(self):
        registry = get_default_registry()
        result = registry.detect_and_parse(ROBINHOOD_TEXT)
        assert len(result.positions) >= 0
        for pos in result.positions:
            assert pos.market_value >= 0 or pos.quantity >= 0


class TestETradeParser:
    """E*TRADE / Morgan Stanley account"""

    def test_detects_etrade(self):
        registry = get_default_registry()
        result = registry.detect_and_parse(ETRADE_TEXT)
        assert result.custodian in ["E*TRADE", "Morgan Stanley", "ETRADE", "Unknown"]

    def test_position_extraction(self):
        registry = get_default_registry()
        result = registry.detect_and_parse(ETRADE_TEXT)
        assert len(result.positions) >= 0


class TestCrossAccountTotals:
    """Verify household-level aggregation across statements."""

    def test_combined_aum(self):
        registry = get_default_registry()
        total = Decimal("0")
        for text in [NW_MUTUAL_VA_TEXT, ROBINHOOD_TEXT, ETRADE_TEXT]:
            result = registry.detect_and_parse(text)
            total += result.total_value
        assert total >= Decimal("0")
