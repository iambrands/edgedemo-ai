"""Unit tests for IMM-04 prospect stage gate enforcement."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from backend.services.prospect.prospect_service import ProspectService
from backend.models.prospect import ProspectStatus


class TestStageGates:
    """Test stage gate enforcement logic."""

    def test_stage_gates_defined(self):
        """All 7 pipeline stages have gate definitions."""
        gates = ProspectService.STAGE_GATES
        assert "contacted" in gates
        assert "qualified" in gates
        assert "proposal_sent" in gates
        assert "agreement_signed" in gates
        assert "onboarding" in gates
        assert "active_client" in gates

    def test_stage_order_defined(self):
        """Stage order has all 7 stages."""
        assert len(ProspectService.STAGE_ORDER) == 7
        assert ProspectService.STAGE_ORDER[0] == ProspectStatus.NEW
        assert ProspectService.STAGE_ORDER[-1] == ProspectStatus.ACTIVE_CLIENT

    def test_prospect_status_enum_extended(self):
        """ProspectStatus enum includes new IMM-04 values."""
        assert ProspectStatus.AGREEMENT_SIGNED.value == "agreement_signed"
        assert ProspectStatus.ONBOARDING.value == "onboarding"
        assert ProspectStatus.ACTIVE_CLIENT.value == "active_client"

    def test_gate_error_messages(self):
        """Each gate has a descriptive error message."""
        for stage, gate in ProspectService.STAGE_GATES.items():
            assert "error" in gate, f"Gate for {stage} missing error message"
            assert len(gate["error"]) > 10, f"Gate error for {stage} too short"
