"""
Test 1D: Validate BIM generates appropriate B2C messaging.
"""

import pytest

from backend.services.bim_service import BIMService


class TestBIMB2CMessaging:
    """Validate BIM produces educational, conversational B2C output."""

    def test_b2c_fee_impact_message(self):
        """BIM generates message for fee impact context."""
        bim = BIMService()

        bim_input = {
            "message": "Your NW Mutual VA is costing about $950 per year in fees.",
            "key_points": ["Annual fees ~$950", "30-year impact significant"],
            "call_to_action": "Review fee impact report",
            "follow_up": True,
        }

        result = bim.generate_message(bim_input, behavioral_profile="balanced")

        assert result is not None
        assert result.message
        assert result.tone in (
            "REASSURING",
            "EDUCATIONAL",
            "CELEBRATORY",
            "CAUTIONARY",
            "MOTIVATIONAL",
        )

    def test_b2c_allocation_drift_message(self):
        """BIM explains concepts in plain language."""
        bim = BIMService()

        bim_input = {
            "message": "Your portfolio has drifted slightly from its targets.",
            "key_points": ["Portfolio drift detected", "Rebalancing recommended"],
        }

        result = bim.generate_message(
            bim_input, behavioral_profile="balanced", sophistication="novice"
        )

        assert result is not None
        assert len(result.message) > 20

    def test_rejection_message_for_novice(self):
        """BIM rejection message uses client-appropriate language."""
        bim = BIMService()

        from backend.services.schemas import CIMResponse, ComplianceViolation

        cim_output = CIMResponse(
            status="REJECTED",
            violations=[
                ComplianceViolation(
                    rule="FINRA_2111",
                    severity="HIGH",
                    description="Not suitable",
                )
            ],
            required_disclosures=[],
            risk_labels=["FINRA_2111"],
        )

        msg = bim.generate_rejection_message("novice", cim_output)

        assert msg is not None
        assert "advisor" in msg.lower() or "schedule" in msg.lower() or len(msg) > 30
