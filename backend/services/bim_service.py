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

    async def compute_tax_aversion_score(self, client_id, db) -> float:
        """
        Compute tax aversion score from most recent tax profile.
        Higher effective rate + large STCG + low estimated payments = higher aversion.
        Returns 0.0-1.0, stores in bim_scores table.
        """
        try:
            from sqlalchemy import select
            from backend.models.tax_profile import TaxProfile
            from backend.models.bim_score import BIMScore

            result = await db.execute(
                select(TaxProfile)
                .where(TaxProfile.client_id == client_id)
                .order_by(TaxProfile.tax_year.desc())
                .limit(1)
            )
            profile = result.scalar_one_or_none()
            if not profile:
                return 0.5

            score = 0.5
            if profile.effective_rate and float(profile.effective_rate) > 0.30:
                score += 0.20
            cg = profile.capital_gains or {}
            st = cg.get("short_term", 0)
            lt = cg.get("long_term", 0)
            if st > lt and st > 0:
                score += 0.15
            raw = profile.raw_data or {}
            est_paid = raw.get("estimated_tax_paid", 0)
            total_tax = raw.get("total_tax", 1)
            if total_tax > 0 and est_paid < (total_tax * 0.80):
                score += 0.15

            score = min(1.0, max(0.0, score))

            bim_score = BIMScore(
                client_id=client_id,
                score_type="tax_aversion",
                score=score,
                metadata_json={"effective_rate": str(profile.effective_rate), "stcg": st, "ltcg": lt},
            )
            db.add(bim_score)
            await db.flush()
            return score
        except Exception as e:
            logger.warning("Tax aversion scoring failed: %s", e)
            return 0.5

    async def compute_tlh_opportunity_score(self, client_id, portfolio: list, db) -> float:
        """
        Scan portfolio for unrealized losses > $500.
        Higher score when client has high STCG (harvesting more valuable).
        Returns 0.0-1.0, stores in bim_scores table.
        """
        try:
            from backend.models.bim_score import BIMScore

            losses = [p for p in portfolio if p.get("unrealized_gain", 0) < -500]
            total_loss = sum(abs(p.get("unrealized_gain", 0)) for p in losses)

            if not losses:
                return 0.0

            score = min(0.5, len(losses) * 0.1)
            if total_loss > 5000:
                score += 0.3
            elif total_loss > 1000:
                score += 0.15

            score = min(1.0, max(0.0, score))

            bim_score = BIMScore(
                client_id=client_id,
                score_type="tlh_opportunity",
                score=score,
                metadata_json={"loss_count": len(losses), "total_loss": total_loss},
            )
            db.add(bim_score)
            await db.flush()
            return score
        except Exception as e:
            logger.warning("TLH opportunity scoring failed: %s", e)
            return 0.0

    async def compute_recommendation_confidence(self, rec, client_id, db) -> float:
        """
        Weighted composite confidence score for IMM-06 recommendations.
        IIM signal (0.40) + BIM alignment (0.35) + CIM compliance (0.25)
        """
        try:
            from sqlalchemy import select
            from backend.models.bim_score import BIMScore

            iim_signal = getattr(rec, 'confidence', 0.5) * 0.40

            alignment = 0.5
            scores_result = await db.execute(
                select(BIMScore).where(
                    BIMScore.client_id == client_id,
                    BIMScore.score_type == "tax_aversion",
                ).order_by(BIMScore.computed_at.desc()).limit(1)
            )
            tax_score = scores_result.scalar_one_or_none()
            rec_type = getattr(rec, 'rec_type', '')
            if tax_score:
                tax_val = float(tax_score.score)
                if tax_val > 0.7 and rec_type in ('TLH', 'tax_loss_harvest'):
                    alignment = 0.9
                elif tax_val > 0.7 and rec_type in ('BUY',) and getattr(rec, 'risk_level', 3) > 3:
                    alignment = 0.3
            bim_component = alignment * 0.35

            compliance_status = getattr(rec, 'compliance_status', 'APPROVED')
            cim_map = {'APPROVED': 1.0, 'WARNING': 0.6, 'BLOCKED': 0.0}
            cim_component = cim_map.get(compliance_status, 0.5) * 0.25

            return round(iim_signal + bim_component + cim_component, 4)
        except Exception as e:
            logger.warning("Confidence scoring failed: %s", e)
            return 0.5
