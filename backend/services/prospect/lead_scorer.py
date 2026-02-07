"""
Lead scoring engine.

Calculates fit, intent, and engagement scores for prospects based on
configurable rules.  Each score component (fit, intent, engagement) is
computed independently and combined with configurable weights into a
single 0-100 lead score.
"""

import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.prospect import (
    LeadScoringRule,
    Prospect,
    ProspectActivity,
    ProspectStatus,
)

logger = logging.getLogger(__name__)


class LeadScorer:
    """Calculates and updates lead scores for prospects."""

    # Default rules used when an advisor has no custom rules configured.
    DEFAULT_RULES: List[Dict] = [
        # --- Fit scoring (ideal-client match) ---
        {
            "rule_name": "high_aum",
            "rule_category": "fit",
            "field_name": "estimated_aum",
            "operator": "gte",
            "value": "500000",
            "points": 25,
        },
        {
            "rule_name": "very_high_aum",
            "rule_category": "fit",
            "field_name": "estimated_aum",
            "operator": "gte",
            "value": "1000000",
            "points": 15,
        },
        {
            "rule_name": "has_income",
            "rule_category": "fit",
            "field_name": "annual_income",
            "operator": "gte",
            "value": "150000",
            "points": 15,
        },
        {
            "rule_name": "referral_source",
            "rule_category": "fit",
            "field_name": "lead_source",
            "operator": "eq",
            "value": "referral",
            "points": 20,
        },
        {
            "rule_name": "existing_client_referral",
            "rule_category": "fit",
            "field_name": "lead_source",
            "operator": "eq",
            "value": "existing_client",
            "points": 25,
        },
        # --- Intent scoring (buying signals) ---
        {
            "rule_name": "meeting_scheduled",
            "rule_category": "intent",
            "field_name": "status",
            "operator": "eq",
            "value": "meeting_scheduled",
            "points": 20,
        },
        {
            "rule_name": "meeting_completed",
            "rule_category": "intent",
            "field_name": "status",
            "operator": "eq",
            "value": "meeting_completed",
            "points": 30,
        },
        {
            "rule_name": "requested_proposal",
            "rule_category": "intent",
            "field_name": "status",
            "operator": "eq",
            "value": "proposal_sent",
            "points": 25,
        },
        {
            "rule_name": "has_current_advisor",
            "rule_category": "intent",
            "field_name": "current_advisor",
            "operator": "not_empty",
            "value": "",
            "points": 10,
        },
    ]

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def score_prospect(self, prospect_id: UUID) -> Prospect:
        """Calculate and persist all scores for a single prospect."""
        prospect = await self._get_prospect(prospect_id)
        if not prospect:
            raise ValueError("Prospect not found")

        rules = await self._get_rules(prospect.advisor_id)

        # Component scores
        fit_score = self._calculate_fit_score(prospect, rules)
        intent_score = self._calculate_intent_score(prospect, rules)
        engagement_score = await self._calculate_engagement_score(prospect)

        # Weighted total
        total_score = int(
            fit_score * 0.35
            + intent_score * 0.35
            + engagement_score * 0.30
        )

        prospect.fit_score = fit_score
        prospect.intent_score = intent_score
        prospect.engagement_score = engagement_score
        prospect.lead_score = min(total_score, 100)
        prospect.score_factors = {
            "fit": {"score": fit_score, "weight": 0.35},
            "intent": {"score": intent_score, "weight": 0.35},
            "engagement": {"score": engagement_score, "weight": 0.30},
        }
        prospect.last_scored_at = datetime.utcnow()

        await self.db.commit()
        return prospect

    async def score_all_prospects(self, advisor_id: UUID) -> int:
        """Re-score every active prospect for an advisor. Returns count."""
        result = await self.db.execute(
            select(Prospect).where(
                and_(
                    Prospect.advisor_id == advisor_id,
                    Prospect.status.notin_(
                        [ProspectStatus.WON, ProspectStatus.LOST]
                    ),
                )
            )
        )
        prospects = result.scalars().all()

        for prospect in prospects:
            await self.score_prospect(prospect.id)

        return len(prospects)

    # ─────────────────────────────────────────────────────────────
    # Internals
    # ─────────────────────────────────────────────────────────────

    async def _get_prospect(self, prospect_id: UUID) -> Optional[Prospect]:
        result = await self.db.execute(
            select(Prospect).where(Prospect.id == prospect_id)
        )
        return result.scalar_one_or_none()

    async def _get_rules(
        self, advisor_id: UUID
    ) -> List[LeadScoringRule]:
        """Return custom rules for the advisor, falling back to defaults."""
        result = await self.db.execute(
            select(LeadScoringRule)
            .where(
                and_(
                    LeadScoringRule.advisor_id == advisor_id,
                    LeadScoringRule.is_active.is_(True),
                )
            )
            .order_by(LeadScoringRule.priority)
        )
        rules = result.scalars().all()

        if rules:
            return rules

        # Synthesise default rule objects (not persisted)
        return [
            LeadScoringRule(**r, advisor_id=advisor_id)
            for r in self.DEFAULT_RULES
        ]

    # ── Component scorers ────────────────────────────────────────

    def _calculate_fit_score(
        self, prospect: Prospect, rules: List[LeadScoringRule]
    ) -> int:
        """Score based on demographic / financial criteria."""
        score = 0
        for rule in rules:
            if rule.rule_category != "fit":
                continue
            if self._evaluate_rule(prospect, rule):
                score += rule.points
        return min(score, 100)

    def _calculate_intent_score(
        self, prospect: Prospect, rules: List[LeadScoringRule]
    ) -> int:
        """Score based on buying signals."""
        score = 0
        for rule in rules:
            if rule.rule_category != "intent":
                continue
            if self._evaluate_rule(prospect, rule):
                score += rule.points
        return min(score, 100)

    async def _calculate_engagement_score(
        self, prospect: Prospect
    ) -> int:
        """Score based on recent activity volume and quality."""
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        # Total recent activities
        result = await self.db.execute(
            select(func.count(ProspectActivity.id)).where(
                and_(
                    ProspectActivity.prospect_id == prospect.id,
                    ProspectActivity.activity_date >= thirty_days_ago,
                )
            )
        )
        activity_count = result.scalar() or 0

        # Successful contact (connected calls)
        result = await self.db.execute(
            select(func.count(ProspectActivity.id)).where(
                and_(
                    ProspectActivity.prospect_id == prospect.id,
                    ProspectActivity.activity_date >= thirty_days_ago,
                    ProspectActivity.call_outcome == "connected",
                )
            )
        )
        connected_calls = result.scalar() or 0

        score = 0
        score += min(activity_count * 5, 40)     # up to 40 pts for volume
        score += min(connected_calls * 15, 30)   # up to 30 pts for contact

        # Recency bonus
        if prospect.stage_entered_at:
            days_since_stage = (now - prospect.stage_entered_at).days
            if days_since_stage <= 7:
                score += 20
            elif days_since_stage <= 14:
                score += 10

        return min(score, 100)

    # ── Rule evaluator ───────────────────────────────────────────

    def _evaluate_rule(
        self, prospect: Prospect, rule: LeadScoringRule
    ) -> bool:
        """Evaluate a single scoring rule against a prospect."""
        field_value = getattr(prospect, rule.field_name, None)

        if field_value is None and rule.operator != "not_empty":
            return False

        rule_value = rule.value

        # Type coercion
        if isinstance(field_value, Decimal):
            try:
                rule_value = Decimal(rule_value)
            except Exception:
                return False
        elif isinstance(field_value, int):
            try:
                rule_value = int(rule_value)
            except Exception:
                return False

        # Operator dispatch
        if rule.operator == "eq":
            return str(field_value) == str(rule_value)
        if rule.operator == "neq":
            return str(field_value) != str(rule_value)
        if rule.operator == "gt":
            return field_value > rule_value
        if rule.operator == "gte":
            return field_value >= rule_value
        if rule.operator == "lt":
            return field_value < rule_value
        if rule.operator == "lte":
            return field_value <= rule_value
        if rule.operator == "contains":
            return rule_value.lower() in str(field_value).lower()
        if rule.operator == "not_empty":
            return field_value is not None and str(field_value).strip() != ""
        if rule.operator == "in":
            values = (
                json.loads(rule_value)
                if isinstance(rule_value, str)
                else rule_value
            )
            return field_value in values

        return False
