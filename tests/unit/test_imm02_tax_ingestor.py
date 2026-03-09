"""Unit tests for IMM-02 tax document ingestor."""

import pytest


def test_mock_extraction_returns_valid():
    from backend.services.tax.document_ingestor import _mock_extraction
    data = _mock_extraction()
    assert "tax_year" in data
    assert "filing_status" in data
    assert "agi" in data
    assert "raw_confidence" in data
    assert 0 < data["raw_confidence"] <= 1.0
    assert isinstance(data["capital_gains"], dict)


def test_mock_extraction_fields():
    from backend.services.tax.document_ingestor import _mock_extraction
    data = _mock_extraction()
    assert data["tax_year"] == 2025
    assert data["filing_status"] == "mfj"
    assert data["marginal_rate"] == 0.32
