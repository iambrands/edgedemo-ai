"""Behavioral Intelligence Model — client-facing communication layer."""

import logging
from typing import Optional

from .schemas import (
    BIMResponse,
    BehavioralIntervention,
    CIMResponse,
)

logger = logging.getLogger(__name__)


class BIMService:
    """Behavioral Intelligence Model. Adapts tone and content to client profile."""

    def generate_message(
        self,
        bim_input: dict,
        behavioral_profile: str = "balanced",
        sophistication: str = "intermediate",
    ) -> BIMResponse:
        """Adapt tone based on profile, adjust sophistication, include nudges."""
        message = bim_input.get("message", "Your portfolio has been reviewed.")
        key_points = bim_input.get("key_points", [])
        interventions: list[BehavioralIntervention] = []
        if behavioral_profile == "anxious":
            interventions.append(
                BehavioralIntervention(
                    bias_detected="Loss aversion",
                    intervention="Emphasize long-term stability.",
                    priority="HIGH",
                )
            )
        if "recency" in str(bim_input).lower():
            interventions.append(
                BehavioralIntervention(
                    bias_detected="Recency bias",
                    intervention="Consider historical context.",
                    priority="MEDIUM",
                )
            )
        return BIMResponse(
            message=message,
            tone="REASSURING" if behavioral_profile == "anxious" else "EDUCATIONAL",
            key_points=key_points,
            behavioral_interventions=interventions,
            call_to_action=bim_input.get("call_to_action"),
            follow_up_suggested=bim_input.get("follow_up", False),
            escalation_needed=False,
        )

    def generate_rejection_message(
        self, behavioral_profile: str, cim_output: CIMResponse
    ) -> str:
        """When CIM rejects, explain in client-appropriate language."""
        if behavioral_profile == "novice":
            return (
                "After review, we're not able to proceed with this recommendation "
                "at this time. Our compliance team has identified considerations that "
                "require further discussion with your advisor. Please reach out to "
                "schedule a follow-up."
            )
        return (
            f"The recommendation did not meet our suitability standards "
            f"(rules: {', '.join(cim_output.risk_labels)}). "
            "We recommend discussing alternatives with your advisor."
        )

    def generate_coaching_plan(self, client_id: str) -> dict:
        """Behavioral nudges, literacy content, action items."""
        return {
            "client_id": client_id,
            "nudges": [
                "Consider rebalancing if allocation has drifted >5%.",
                "Review tax-loss harvesting opportunities annually.",
            ],
            "educational_content": [],
            "action_items": [],
        }
