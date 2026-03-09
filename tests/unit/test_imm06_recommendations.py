"""Unit tests for IMM-06 recommendation pipeline."""

import pytest
from backend.services.iim.recommendation import ActionableRecommendation, TaxImpact
from backend.services.iim.order_builder import build_order_preview


class TestActionableRecommendation:
    def test_creates_with_defaults(self):
        rec = ActionableRecommendation(
            advisor_id="adv-001",
            client_id="cli-001",
            rec_type="BUY",
            symbol="AAPL",
            quantity=10,
        )
        assert rec.rec_id
        assert rec.confidence == 0.5
        assert rec.compliance_status == "APPROVED"
        assert rec.expires_at is not None

    def test_to_dict(self):
        rec = ActionableRecommendation(
            advisor_id="adv-001",
            client_id="cli-001",
            rec_type="SELL",
            symbol="MSFT",
            quantity=5,
            rationale="Reduce concentration",
        )
        d = rec.to_dict()
        assert d["symbol"] == "MSFT"
        assert d["rec_type"] == "SELL"
        assert "tax_impact" in d
        assert isinstance(d["compliance_flags"], list)


class TestOrderBuilder:
    def test_buy_order_preview(self):
        rec = ActionableRecommendation(rec_type="BUY", symbol="AAPL", quantity=10)
        order = build_order_preview(rec)
        assert order["symbol"] == "AAPL"
        assert order["side"] == "buy"
        assert order["quantity"] == 10
        assert order["class"] == "equity"

    def test_sell_order_preview(self):
        rec = ActionableRecommendation(rec_type="SELL", symbol="MSFT", quantity=5)
        order = build_order_preview(rec)
        assert order["side"] == "sell"
        assert order["quantity"] == 5

    def test_tlh_creates_sell(self):
        rec = ActionableRecommendation(rec_type="TLH", symbol="INTC", quantity=20)
        order = build_order_preview(rec)
        assert order["side"] == "sell"

    def test_minimum_quantity_one(self):
        rec = ActionableRecommendation(rec_type="BUY", symbol="AAPL", quantity=0)
        order = build_order_preview(rec)
        assert order["quantity"] == 1
