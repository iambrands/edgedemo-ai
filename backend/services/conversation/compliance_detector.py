"""
Compliance detection engine.

Scans transcripts for regulatory concerns using configurable keyword/phrase
rules and AI-powered analysis via Anthropic Claude.
"""

import json
import logging
import os
import re
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

import anthropic
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.conversation import (
    ComplianceCategoryType,
    ComplianceFlag,
    ComplianceRiskLevel,
    ComplianceRule,
)

logger = logging.getLogger(__name__)


class ComplianceDetector:
    """Detects compliance concerns in conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
            logger.warning(
                "ANTHROPIC_API_KEY not set — AI compliance detection disabled"
            )

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def analyze_transcript(
        self,
        analysis_id: UUID,
        transcript: str,
        segments: List[Dict[str, Any]],
        advisor_id: Optional[UUID] = None,
    ) -> List[ComplianceFlag]:
        """Analyse transcript for compliance issues (rules + AI)."""
        rules = await self._get_rules(advisor_id)

        flags: List[ComplianceFlag] = []

        # Rule-based detection
        for rule in rules:
            rule_flags = self._apply_rule(
                analysis_id, transcript, segments, rule
            )
            flags.extend(rule_flags)

        # AI-based detection
        ai_flags = await self._ai_detection(
            analysis_id, transcript, segments
        )
        flags.extend(ai_flags)

        # De-duplicate overlapping flags
        return self._deduplicate_flags(flags)

    # ─────────────────────────────────────────────────────────────
    # Rule loading
    # ─────────────────────────────────────────────────────────────

    async def _get_rules(
        self, advisor_id: Optional[UUID]
    ) -> List[ComplianceRule]:
        """Get applicable compliance rules (system + advisor)."""
        conditions = [ComplianceRule.is_active.is_(True)]
        if advisor_id:
            conditions.append(
                (ComplianceRule.advisor_id == advisor_id)
                | (ComplianceRule.is_system.is_(True))
            )
        else:
            conditions.append(ComplianceRule.is_system.is_(True))

        result = await self.db.execute(
            select(ComplianceRule).where(and_(*conditions))
        )
        return result.scalars().all()

    # ─────────────────────────────────────────────────────────────
    # Rule-based detection
    # ─────────────────────────────────────────────────────────────

    def _apply_rule(
        self,
        analysis_id: UUID,
        transcript: str,
        segments: List[Dict[str, Any]],
        rule: ComplianceRule,
    ) -> List[ComplianceFlag]:
        """Apply a single rule to the transcript."""
        flags: List[ComplianceFlag] = []
        transcript_lower = transcript.lower()

        # Keyword detection
        for keyword in rule.keywords or []:
            for match in re.finditer(
                re.escape(keyword.lower()), transcript_lower
            ):
                seg_info = self._find_segment_for_position(
                    segments, match.start(), transcript
                )
                if seg_info:
                    flags.append(
                        self._create_flag(
                            analysis_id=analysis_id,
                            rule=rule,
                            matched_text=transcript[
                                match.start() : match.end() + 50
                            ],
                            segment_info=seg_info,
                        )
                    )

        # Phrase detection
        for phrase in rule.phrases or []:
            for match in re.finditer(
                re.escape(phrase.lower()), transcript_lower
            ):
                seg_info = self._find_segment_for_position(
                    segments, match.start(), transcript
                )
                if seg_info:
                    flags.append(
                        self._create_flag(
                            analysis_id=analysis_id,
                            rule=rule,
                            matched_text=transcript[
                                max(0, match.start() - 20) : match.end()
                                + 50
                            ],
                            segment_info=seg_info,
                        )
                    )

        return flags

    @staticmethod
    def _find_segment_for_position(
        segments: List[Dict[str, Any]],
        position: int,
        full_transcript: str,
    ) -> Optional[Dict[str, Any]]:
        """Find which segment contains a given character position."""
        current_pos = 0
        for seg in segments:
            seg_text = seg.get("text", "")
            seg_end = current_pos + len(seg_text)
            if current_pos <= position < seg_end:
                return {
                    "speaker": seg.get("speaker_label", "Unknown"),
                    "start_time": seg.get("start_time", 0),
                    "end_time": seg.get("end_time", 0),
                    "context_before": full_transcript[
                        max(0, position - 100) : position
                    ],
                    "context_after": full_transcript[
                        position : position + 200
                    ],
                }
            current_pos = seg_end + 1  # +1 for inter-segment space
        return None

    @staticmethod
    def _create_flag(
        analysis_id: UUID,
        rule: ComplianceRule,
        matched_text: str,
        segment_info: Dict[str, Any],
    ) -> ComplianceFlag:
        """Build a ComplianceFlag from a rule match."""
        return ComplianceFlag(
            analysis_id=analysis_id,
            category=rule.category,
            risk_level=rule.risk_level,
            flagged_text=matched_text.strip(),
            context_before=segment_info.get("context_before", ""),
            context_after=segment_info.get("context_after", ""),
            timestamp_start=segment_info.get("start_time", 0),
            timestamp_end=segment_info.get("end_time", 0),
            speaker=segment_info.get("speaker", "Unknown"),
            ai_explanation=f"Matched rule: {rule.name}",
            ai_confidence=Decimal("0.90"),
            regulatory_reference=rule.regulatory_reference,
            suggested_correction=rule.suggested_language,
        )

    # ─────────────────────────────────────────────────────────────
    # AI-based detection
    # ─────────────────────────────────────────────────────────────

    async def _ai_detection(
        self,
        analysis_id: UUID,
        transcript: str,
        segments: List[Dict[str, Any]],
    ) -> List[ComplianceFlag]:
        """Use Claude to detect compliance issues."""
        if not self.client:
            logger.info(
                "Anthropic client not available — skipping AI compliance detection"
            )
            return []

        prompt = (
            "Analyze this financial advisor conversation transcript "
            "for compliance concerns.\n\n"
            "Look for:\n"
            "1. Performance guarantees or promises of specific returns\n"
            "2. Unsuitable recommendations (not considering client's "
            "risk tolerance/situation)\n"
            "3. Missing risk disclosures\n"
            "4. Misleading statements about investments\n"
            "5. Unauthorized promises\n"
            "6. Privacy violations (sharing other client info)\n"
            "7. Fiduciary duty breaches\n\n"
            f"TRANSCRIPT:\n{transcript[:8000]}\n\n"
            "For each concern found, respond in JSON format:\n"
            "{\n"
            '  "flags": [\n'
            "    {\n"
            '      "category": "performance_guarantee|unsuitable_recommendation'
            "|missing_disclosure|prohibited_statement|misleading_information"
            '|unauthorized_promise|privacy_violation|fiduciary_breach|other",\n'
            '      "risk_level": "low|medium|high|critical",\n'
            '      "flagged_text": "exact quote from transcript",\n'
            '      "explanation": "why this is a concern",\n'
            '      "suggested_correction": "what should have been said instead",\n'
            '      "confidence": 0.85\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            'If no concerns found, return {"flags": []}'
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
                data = json.loads(text[start:end])

                flags: List[ComplianceFlag] = []
                for f in data.get("flags", []):
                    position = transcript.lower().find(
                        f.get("flagged_text", "").lower()[:50]
                    )
                    seg_info = (
                        self._find_segment_for_position(
                            segments, position, transcript
                        )
                        if position >= 0
                        else {}
                    ) or {}

                    flags.append(
                        ComplianceFlag(
                            analysis_id=analysis_id,
                            category=ComplianceCategoryType(
                                f["category"]
                            ),
                            risk_level=ComplianceRiskLevel(
                                f["risk_level"]
                            ),
                            flagged_text=f["flagged_text"],
                            context_before=seg_info.get(
                                "context_before", ""
                            ),
                            context_after=seg_info.get(
                                "context_after", ""
                            ),
                            timestamp_start=seg_info.get(
                                "start_time", 0
                            ),
                            timestamp_end=seg_info.get("end_time", 0),
                            speaker=seg_info.get("speaker", "Unknown"),
                            ai_explanation=f["explanation"],
                            ai_confidence=Decimal(
                                str(f.get("confidence", 0.85))
                            ),
                            suggested_correction=f.get(
                                "suggested_correction"
                            ),
                        )
                    )
                return flags
        except Exception:
            logger.exception("AI compliance detection failed")

        return []

    # ─────────────────────────────────────────────────────────────
    # De-duplication
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def _deduplicate_flags(
        flags: List[ComplianceFlag],
    ) -> List[ComplianceFlag]:
        """Remove duplicate / overlapping flags, keeping highest risk."""
        if not flags:
            return []

        flags.sort(key=lambda f: f.timestamp_start)

        unique = [flags[0]]
        for flag in flags[1:]:
            last = unique[-1]
            if (
                flag.timestamp_start >= last.timestamp_end
                or flag.flagged_text != last.flagged_text
            ):
                unique.append(flag)
            elif flag.risk_level.value > last.risk_level.value:
                unique[-1] = flag

        return unique
