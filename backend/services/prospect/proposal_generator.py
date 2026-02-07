"""
AI-powered proposal generation.

Creates personalised investment proposals for prospects using the Anthropic
Claude API.  Falls back to template-based content when the API key is not
configured or the AI call fails.
"""

import json
import logging
import os
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

import anthropic
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.prospect import (
    ActivityType,
    Proposal,
    ProposalStatus,
    Prospect,
    ProspectActivity,
)

logger = logging.getLogger(__name__)


class ProposalGenerator:
    """Generates AI-powered investment proposals."""

    def __init__(self, db: AsyncSession):
        self.db = db
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
            logger.warning(
                "ANTHROPIC_API_KEY not set — AI proposal generation disabled"
            )

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def generate_proposal(
        self,
        prospect_id: UUID,
        advisor_id: UUID,
        custom_params: Optional[Dict[str, Any]] = None,
    ) -> Proposal:
        """Generate a complete proposal for a prospect."""
        prospect = await self._get_prospect(prospect_id)
        if not prospect:
            raise ValueError("Prospect not found")

        # Gather context
        context = await self._build_prospect_context(prospect)

        # Generate proposal content via AI (or fallback)
        content = await self._generate_content(context, custom_params)

        # Calculate estimated fee
        estimated_fee = None
        if prospect.estimated_aum:
            estimated_fee = prospect.estimated_aum * Decimal("0.01")

        proposal = Proposal(
            prospect_id=prospect_id,
            advisor_id=advisor_id,
            title=(
                f"Investment Proposal for "
                f"{prospect.first_name} {prospect.last_name}"
            ),
            proposal_number=await self._generate_proposal_number(advisor_id),
            status=ProposalStatus.DRAFT,
            executive_summary=content.get("executive_summary"),
            investment_philosophy=content.get("investment_philosophy"),
            proposed_strategy=content.get("proposed_strategy"),
            fee_structure=content.get("fee_structure"),
            proposed_aum=prospect.estimated_aum,
            proposed_fee_percent=Decimal("0.0100"),  # 1 % default
            estimated_annual_fee=estimated_fee,
            recommended_models=content.get("recommended_models"),
            risk_profile=prospect.risk_tolerance or "moderate",
            risk_assessment=content.get("risk_assessment"),
            valid_until=date.today() + timedelta(days=30),
            is_ai_generated=True,
            ai_generation_params=custom_params,
            ai_confidence_score=Decimal(
                str(content.get("confidence", 0.85))
            ),
        )

        self.db.add(proposal)
        await self.db.commit()
        await self.db.refresh(proposal)

        return proposal

    # ─────────────────────────────────────────────────────────────
    # Internals
    # ─────────────────────────────────────────────────────────────

    async def _get_prospect(
        self, prospect_id: UUID
    ) -> Optional[Prospect]:
        result = await self.db.execute(
            select(Prospect).where(Prospect.id == prospect_id)
        )
        return result.scalar_one_or_none()

    async def _build_prospect_context(
        self, prospect: Prospect
    ) -> Dict[str, Any]:
        """Build comprehensive context for AI generation."""
        result = await self.db.execute(
            select(ProspectActivity)
            .where(ProspectActivity.prospect_id == prospect.id)
            .order_by(ProspectActivity.activity_date.desc())
            .limit(10)
        )
        activities = result.scalars().all()

        return {
            "name": f"{prospect.first_name} {prospect.last_name}",
            "company": prospect.company,
            "title": prospect.title,
            "industry": prospect.industry,
            "estimated_aum": (
                float(prospect.estimated_aum)
                if prospect.estimated_aum
                else None
            ),
            "annual_income": (
                float(prospect.annual_income)
                if prospect.annual_income
                else None
            ),
            "net_worth": (
                float(prospect.net_worth) if prospect.net_worth else None
            ),
            "risk_tolerance": prospect.risk_tolerance,
            "investment_goals": prospect.investment_goals or [],
            "time_horizon": prospect.time_horizon,
            "investment_experience": prospect.investment_experience,
            "interested_services": prospect.interested_services or [],
            "current_advisor": prospect.current_advisor,
            "notes": prospect.notes,
            "recent_activities": [
                {
                    "type": a.activity_type.value,
                    "date": a.activity_date.isoformat(),
                    "subject": a.subject,
                }
                for a in activities
            ],
        }

    async def _generate_content(
        self,
        context: Dict[str, Any],
        custom_params: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate proposal content using Claude, with fallback."""

        if not self.client:
            logger.info(
                "Anthropic client not available — using fallback content"
            )
            return self._fallback_content(context)

        # Format monetary values safely
        def _fmt(val: Any) -> str:
            if val is None:
                return "Unknown"
            try:
                return f"{val:,.0f}"
            except (TypeError, ValueError):
                return str(val)

        prompt = (
            "You are an expert financial advisor creating a personalised "
            "investment proposal.\n\n"
            "**Prospect Profile:**\n"
            f"- Name: {context['name']}\n"
            f"- Company: {context.get('company') or 'N/A'}\n"
            f"- Title: {context.get('title') or 'N/A'}\n"
            f"- Industry: {context.get('industry') or 'N/A'}\n"
            f"- Estimated Assets: ${_fmt(context.get('estimated_aum'))}\n"
            f"- Annual Income: ${_fmt(context.get('annual_income'))}\n"
            f"- Net Worth: ${_fmt(context.get('net_worth'))}\n"
            f"- Risk Tolerance: {context.get('risk_tolerance') or 'Moderate'}\n"
            f"- Investment Goals: {', '.join(context.get('investment_goals') or ['Wealth accumulation'])}\n"
            f"- Time Horizon: {context.get('time_horizon') or 'Long-term'}\n"
            f"- Investment Experience: {context.get('investment_experience') or 'Intermediate'}\n"
            f"- Interested In: {', '.join(context.get('interested_services') or ['Wealth management'])}\n"
            f"- Current Advisor: {context.get('current_advisor') or 'None'}\n\n"
            f"**Additional Notes:** {context.get('notes') or 'None'}\n\n"
            "Generate a comprehensive investment proposal with the following "
            "sections. Be specific, professional, and personalised.\n\n"
            "Respond in JSON format:\n"
            "{\n"
            '    "executive_summary": "2-3 paragraph executive summary",\n'
            '    "investment_philosophy": "Firm philosophy tailored to their needs",\n'
            '    "proposed_strategy": "Detailed strategy recommendation",\n'
            '    "fee_structure": "Clear fee explanation",\n'
            '    "risk_assessment": "Risk profile assessment",\n'
            '    "recommended_models": [\n'
            '        {"name": "Model name", "allocation_pct": 60, "description": "Why"}\n'
            "    ],\n"
            '    "confidence": 0.85\n'
            "}"
        )

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])

            logger.warning("Could not parse JSON from AI response")
        except Exception:
            logger.exception("AI proposal generation failed")

        return self._fallback_content(context)

    @staticmethod
    def _fallback_content(context: Dict[str, Any]) -> Dict[str, Any]:
        """Template-based fallback when AI is unavailable."""
        name = context.get("name", "the prospect")
        risk = context.get("risk_tolerance") or "moderate"
        return {
            "executive_summary": (
                f"We are pleased to present this investment proposal for "
                f"{name}. Based on our initial discussions, we have "
                f"crafted a strategy aligned with your financial goals "
                f"and risk tolerance."
            ),
            "investment_philosophy": (
                "Our firm believes in a disciplined, long-term approach "
                "to wealth management, combining evidence-based investing "
                "with personalised financial planning."
            ),
            "proposed_strategy": (
                "Based on your profile, we recommend a diversified "
                "portfolio spanning domestic and international equities, "
                "fixed income, and alternative investments."
            ),
            "fee_structure": (
                "Our management fee is 1 % annually on assets under "
                "management, with no hidden charges or transaction fees."
            ),
            "risk_assessment": (
                f"Based on your {risk} risk tolerance, we will "
                f"construct a portfolio that balances growth potential "
                f"with downside protection."
            ),
            "recommended_models": [],
            "confidence": 0.70,
        }

    async def _generate_proposal_number(self, advisor_id: UUID) -> str:
        """Generate a unique proposal number."""
        result = await self.db.execute(
            select(func.count(Proposal.id)).where(
                Proposal.advisor_id == advisor_id
            )
        )
        count = result.scalar() or 0
        return f"PROP-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
