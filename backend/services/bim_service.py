"""Behavioral Intelligence Model — client-facing communication layer."""

import logging
from datetime import datetime
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

    async def generate_meeting_prep(
        self, household_data: dict, meeting_type: str = "review"
    ) -> dict:
        """Generate meeting preparation materials based on household data."""
        total_value = sum(
            a.get("balance", 0) for a in household_data.get("accounts", [])
        )
        num_accounts = len(household_data.get("accounts", []))
        num_alerts = len(household_data.get("alerts", []))
        risk = household_data.get("risk_tolerance", "moderate")
        objective = household_data.get("investment_objective", "growth")

        return {
            "household_name": household_data.get("name"),
            "meeting_type": meeting_type,
            "generated_at": datetime.utcnow().isoformat(),
            "executive_summary": (
                f"{household_data.get('name')} has ${total_value:,.2f} across "
                f"{num_accounts} accounts. Risk tolerance: {risk}. "
                f"Investment objective: {objective}."
            ),
            "key_talking_points": [
                "Review portfolio performance since last meeting",
                "Discuss any changes in financial goals or risk tolerance",
                "Review upcoming cash flow needs",
                f"Address {num_alerts} alerts identified by the system",
            ],
            "alerts_to_address": household_data.get("alerts", [])[:5],
            "suggested_actions": [
                "Review asset allocation drift",
                "Check for tax-loss harvesting opportunities",
                "Update beneficiary designations if needed",
            ],
            "behavioral_insights": [
                "Client has historically been loss-averse -- frame rebalancing in terms of risk reduction",
                "Previous meetings indicate preference for visual charts over tables",
                "Client responds well to historical context and long-term perspective",
            ],
            "questions_to_ask": [
                "Have there been any changes to your income or expenses?",
                "Are you anticipating any large purchases or life events?",
                "How are you feeling about the current market environment?",
                "Do you have any questions about the fees on your accounts?",
            ],
            "documents_to_review": [
                "Quarterly performance report",
                "Updated financial plan",
                "Fee disclosure summary",
            ],
        }

    async def generate_client_narrative(
        self, household_data: dict, narrative_type: str = "quarterly_review"
    ) -> dict:
        """Generate personalized client narrative for reports or communications."""
        total_value = sum(
            a.get("balance", 0) for a in household_data.get("accounts", [])
        )
        risk = household_data.get("risk_tolerance", "moderate")
        objective = household_data.get("investment_objective", "growth")
        members = household_data.get("members", ["Client"])
        primary = members[0] if members else "Client"

        content = ""
        if narrative_type == "quarterly_review":
            content = (
                f"Dear {primary},\n\n"
                f"As we close out another quarter, I wanted to share an update on "
                f"your portfolio and our perspective on the path ahead.\n\n"
                f"Your portfolio is currently valued at approximately "
                f"${total_value:,.2f}, reflecting the investment strategy we've "
                f"built together based on your {risk} risk tolerance and "
                f"{objective} objectives.\n\n"
                f"[This narrative can be further tailored to include specific "
                f"performance metrics, market commentary, or personal details "
                f"relevant to this client's situation.]\n\n"
                f"I look forward to our upcoming review meeting where we can "
                f"discuss any questions you may have.\n\n"
                f"Warm regards,\n[Advisor Name]"
            )
        elif narrative_type == "annual_summary":
            content = (
                f"Dear {primary},\n\n"
                f"As we reflect on the past year, I want to highlight the "
                f"progress we've made toward your financial goals.\n\n"
                f"Your portfolio stands at ${total_value:,.2f}. Over the year "
                f"we have maintained alignment with your {risk} risk profile "
                f"while pursuing {objective} objectives.\n\n"
                f"Warm regards,\n[Advisor Name]"
            )
        elif narrative_type == "market_update":
            content = (
                f"Dear {primary},\n\n"
                f"Given recent market activity, I wanted to reach out with a "
                f"brief update on how your portfolio is positioned.\n\n"
                f"Your current allocation remains aligned with your {risk} "
                f"risk tolerance. No immediate action is recommended, but I'm "
                f"available to discuss any concerns.\n\n"
                f"Best regards,\n[Advisor Name]"
            )

        return {
            "type": narrative_type,
            "generated_at": datetime.utcnow().isoformat(),
            "content": content,
            "can_be_further_tailored": True,
            "suggested_customizations": [
                "Add specific portfolio performance numbers",
                "Include relevant market commentary for client's sector exposures",
                "Reference any life events discussed in previous meetings",
                "Adjust tone based on client's communication preferences",
            ],
        }
