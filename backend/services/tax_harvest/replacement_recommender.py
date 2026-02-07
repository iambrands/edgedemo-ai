"""
AI-powered replacement security recommendations.
Finds suitable replacements that maintain market exposure while avoiding
wash sales on substantially identical securities.
"""

import json
import logging
import os
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

import anthropic
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.tax_harvest import (
    HarvestOpportunity,
    SecurityRelationship,
    SecurityRelationType,
)

logger = logging.getLogger(__name__)


class ReplacementRecommender:
    """Generates AI-powered replacement security recommendations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
            logger.warning(
                "ANTHROPIC_API_KEY not set — AI replacement recommendations disabled"
            )

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def get_recommendations(
        self,
        opportunity: HarvestOpportunity,
        max_recommendations: int = 3,
    ) -> List[Dict[str, Any]]:
        """Get replacement security recommendations for a harvest opportunity."""
        # Pre-defined replacements from the security_relationships table
        db_replacements = await self._get_db_replacements(
            opportunity.symbol, opportunity.cusip
        )

        # AI-generated recommendations (if API key is available)
        ai_recommendations = await self._get_ai_recommendations(opportunity)

        # Merge, dedupe, sort by correlation
        all_recommendations = self._merge_recommendations(
            db_replacements, ai_recommendations, max_recommendations
        )

        # Remove any that would trigger a wash sale
        safe_recommendations = await self._filter_wash_sale_risks(
            opportunity.symbol, all_recommendations
        )

        return safe_recommendations[:max_recommendations]

    # ─────────────────────────────────────────────────────────────
    # Database-sourced replacements
    # ─────────────────────────────────────────────────────────────

    async def _get_db_replacements(
        self,
        symbol: str,
        cusip: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Get replacement candidates from security_relationships."""
        result = await self.db.execute(
            select(SecurityRelationship).where(
                and_(
                    or_(
                        SecurityRelationship.symbol_a == symbol,
                        SecurityRelationship.symbol_b == symbol,
                    ),
                    SecurityRelationship.relation_type.in_(
                        [
                            SecurityRelationType.REPLACEMENT_CANDIDATE,
                            SecurityRelationType.SAME_SECTOR_ETF,
                            SecurityRelationType.CORRELATED,
                        ]
                    ),
                    SecurityRelationship.is_active.is_(True),
                )
            )
        )
        relationships = result.scalars().all()

        replacements: List[Dict[str, Any]] = []
        for rel in relationships:
            other_symbol = (
                rel.symbol_b if rel.symbol_a == symbol else rel.symbol_a
            )
            replacements.append(
                {
                    "symbol": other_symbol,
                    "reason": rel.reason
                    or f"High correlation with {symbol}",
                    "correlation": float(
                        rel.correlation_coefficient or rel.confidence_score
                    ),
                    "source": "database",
                    "relation_type": rel.relation_type.value,
                }
            )

        return replacements

    # ─────────────────────────────────────────────────────────────
    # AI-powered recommendations (Anthropic Claude)
    # ─────────────────────────────────────────────────────────────

    async def _get_ai_recommendations(
        self,
        opportunity: HarvestOpportunity,
    ) -> List[Dict[str, Any]]:
        """Get AI-powered replacement recommendations via Claude."""
        if not self.client:
            return []

        prompt = (
            "You are a financial advisor assistant helping with tax-loss harvesting.\n\n"
            f"A client needs to sell {opportunity.symbol} ({opportunity.security_name}) "
            f"to harvest a tax loss of ${float(opportunity.unrealized_loss):,.2f}.\n\n"
            f"To avoid a wash sale, they cannot buy back {opportunity.symbol} or any "
            "substantially identical security for 30 days. However, they want to "
            "maintain similar market exposure.\n\n"
            "Please recommend 3 replacement securities that:\n"
            "1. Provide similar market exposure/sector allocation\n"
            "2. Are NOT substantially identical (would trigger wash sale)\n"
            "3. Are liquid ETFs or stocks\n"
            "4. Have low expense ratios (for ETFs)\n\n"
            f"For {opportunity.symbol}, identify:\n"
            "- What index/sector/theme it tracks\n"
            "- Similar but legally distinct alternatives\n\n"
            "Respond in JSON format:\n"
            "{\n"
            '    "analysis": "Brief analysis of the security being sold",\n'
            '    "recommendations": [\n'
            "        {\n"
            '            "symbol": "TICKER",\n'
            '            "name": "Full name",\n'
            '            "reason": "Why this is a good replacement",\n'
            '            "exposure": "What exposure it provides",\n'
            '            "estimated_correlation": 0.85,\n'
            '            "wash_sale_safe": true\n'
            "        }\n"
            "    ]\n"
            "}"
        )

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )

            content = response.content[0].text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(content[start:end])
                recommendations = data.get("recommendations", [])

                return [
                    {
                        "symbol": r["symbol"],
                        "name": r.get("name", ""),
                        "reason": r["reason"],
                        "correlation": r.get("estimated_correlation", 0.85),
                        "source": "ai",
                        "exposure": r.get("exposure", ""),
                        "wash_sale_safe": r.get("wash_sale_safe", True),
                    }
                    for r in recommendations
                ]
        except Exception:
            logger.exception("AI replacement recommendation failed")

        return []

    # ─────────────────────────────────────────────────────────────
    # Merge & filter helpers
    # ─────────────────────────────────────────────────────────────

    def _merge_recommendations(
        self,
        db_recs: List[Dict[str, Any]],
        ai_recs: List[Dict[str, Any]],
        max_count: int,
    ) -> List[Dict[str, Any]]:
        """Merge and dedupe recommendations, prioritising database-sourced."""
        seen_symbols: set[str] = set()
        merged: List[Dict[str, Any]] = []

        # Database first (more reliable)
        for rec in db_recs:
            if rec["symbol"] not in seen_symbols:
                seen_symbols.add(rec["symbol"])
                merged.append(rec)

        # Then AI recommendations
        for rec in ai_recs:
            if rec["symbol"] not in seen_symbols:
                seen_symbols.add(rec["symbol"])
                merged.append(rec)

        # Sort by correlation descending
        merged.sort(key=lambda x: x.get("correlation", 0), reverse=True)

        return merged[: max_count * 2]  # return extra for post-filtering

    async def _filter_wash_sale_risks(
        self,
        original_symbol: str,
        recommendations: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Remove recommendations that are substantially identical (wash sale risk)."""
        result = await self.db.execute(
            select(SecurityRelationship).where(
                and_(
                    or_(
                        SecurityRelationship.symbol_a == original_symbol,
                        SecurityRelationship.symbol_b == original_symbol,
                    ),
                    SecurityRelationship.relation_type
                    == SecurityRelationType.SUBSTANTIALLY_IDENTICAL,
                    SecurityRelationship.is_active.is_(True),
                )
            )
        )
        identical_rels = result.scalars().all()

        blocked_symbols = {original_symbol}
        for rel in identical_rels:
            blocked_symbols.add(rel.symbol_a)
            blocked_symbols.add(rel.symbol_b)

        return [
            r for r in recommendations if r["symbol"] not in blocked_symbols
        ]
