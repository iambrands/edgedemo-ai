"""
Main conversation intelligence service.

Orchestrates the full analysis pipeline: transcript metrics, topic extraction,
sentiment analysis, compliance detection, action-item extraction, speaker
segmentation, and AI summary generation.
"""

import json
import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

import anthropic
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.conversation import (
    ActionItemStatus,
    ComplianceFlag,
    ComplianceRiskLevel,
    ConversationActionItem,
    ConversationAnalysis,
    ConversationInsight,
    SentimentType,
    SpeakerSegment,
)

from .action_extractor import ActionExtractor
from .compliance_detector import ComplianceDetector
from .transcript_analyzer import TranscriptAnalyzer

logger = logging.getLogger(__name__)


class ConversationService:
    """Main service for conversation intelligence."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.analyzer = TranscriptAnalyzer()
        self.compliance = ComplianceDetector(db)
        self.actions = ActionExtractor()

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
            logger.warning(
                "ANTHROPIC_API_KEY not set — AI sentiment/summary disabled"
            )

    # ─────────────────────────────────────────────────────────────
    # Full Analysis Pipeline
    # ─────────────────────────────────────────────────────────────

    async def analyze_meeting(
        self,
        meeting_id: UUID,
        advisor_id: UUID,
        transcript: str,
        segments: List[Dict[str, Any]],
        client_id: Optional[UUID] = None,
    ) -> ConversationAnalysis:
        """Run full analysis pipeline on a meeting transcript."""

        # Check for existing analysis
        existing = await self.db.execute(
            select(ConversationAnalysis).where(
                ConversationAnalysis.meeting_id == meeting_id
            )
        )
        analysis = existing.scalar_one_or_none()

        if not analysis:
            analysis = ConversationAnalysis(
                meeting_id=meeting_id,
                advisor_id=advisor_id,
                client_id=client_id,
                analysis_status="processing",
            )
            self.db.add(analysis)
            await self.db.commit()
            await self.db.refresh(analysis)

        try:
            # 1. Basic metrics
            metrics = self.analyzer.analyze_segments(segments)
            for key, value in metrics.items():
                setattr(analysis, key, value)

            # 2. Topic extraction
            full_text = " ".join(
                s.get("text", "") for s in segments
            )
            topics = self.analyzer.extract_topics(full_text)
            analysis.topics_discussed = topics["topics_discussed"]
            analysis.topic_breakdown = topics["topic_breakdown"]
            analysis.primary_topic = topics["primary_topic"]

            # 3. Sentiment analysis
            sentiment = await self._analyze_sentiment(
                full_text, segments
            )
            analysis.overall_sentiment = sentiment["overall"]
            analysis.sentiment_score = sentiment["score"]
            analysis.client_sentiment = sentiment["client"]
            analysis.client_sentiment_score = sentiment[
                "client_score"
            ]
            analysis.sentiment_timeline = sentiment["timeline"]

            # 4. Engagement score
            analysis.engagement_score = (
                self.analyzer.calculate_engagement_score(
                    metrics, float(sentiment["score"] or 0)
                )
            )

            # 5. Compliance detection
            compliance_flags = (
                await self.compliance.analyze_transcript(
                    analysis.id, transcript, segments, advisor_id
                )
            )
            for flag in compliance_flags:
                self.db.add(flag)
            analysis.compliance_flags_count = len(compliance_flags)
            analysis.compliance_risk_level = self._get_max_risk(
                compliance_flags
            )

            # 6. Action items extraction
            action_items = await self.actions.extract_actions(
                analysis.id, transcript, segments
            )
            for item in action_items:
                self.db.add(item)
            analysis.action_items_count = len(action_items)

            # 7. Speaker segments
            for seg in segments:
                speaker_seg = SpeakerSegment(
                    analysis_id=analysis.id,
                    speaker_label=seg.get(
                        "speaker_label", "Unknown"
                    ),
                    start_time=seg.get("start_time", 0),
                    end_time=seg.get("end_time", 0),
                    duration_seconds=seg.get(
                        "duration_seconds", 0
                    ),
                    text=seg.get("text", ""),
                    word_count=len(seg.get("text", "").split()),
                    sentiment=SentimentType.NEUTRAL,
                    contains_question="?" in seg.get("text", ""),
                )
                self.db.add(speaker_seg)

            # 8. AI Summary
            summary = await self._generate_summary(
                full_text, analysis
            )
            analysis.executive_summary = summary["executive"]
            analysis.detailed_summary = summary["detailed"]
            analysis.key_points = summary["key_points"]
            analysis.decisions_made = summary["decisions"]
            analysis.concerns_raised = summary["concerns"]
            analysis.follow_up_recommendations = summary[
                "follow_ups"
            ]

            analysis.analysis_status = "completed"
            analysis.analyzed_at = datetime.utcnow()

        except Exception:
            logger.exception(
                "Analysis pipeline failed for meeting %s",
                meeting_id,
            )
            analysis.analysis_status = "failed"
            analysis.raw_analysis = {"error": "pipeline_failed"}

        await self.db.commit()
        return analysis

    # ─────────────────────────────────────────────────────────────
    # Sentiment
    # ─────────────────────────────────────────────────────────────

    async def _analyze_sentiment(
        self,
        text: str,
        segments: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Analyse sentiment using Claude."""
        fallback = {
            "overall": SentimentType.NEUTRAL,
            "score": Decimal("0"),
            "client": SentimentType.NEUTRAL,
            "client_score": Decimal("0"),
            "timeline": [],
        }

        if not self.client:
            return fallback

        prompt = (
            "Analyze the sentiment of this financial advisor "
            "conversation.\n\n"
            f"TRANSCRIPT:\n{text[:6000]}\n\n"
            "Provide sentiment analysis in JSON:\n"
            "{\n"
            '  "overall_sentiment": "very_positive|positive|neutral'
            '|negative|very_negative",\n'
            '  "overall_score": 0.5,\n'
            '  "client_sentiment": "very_positive|positive|neutral'
            '|negative|very_negative",\n'
            '  "client_score": 0.3,\n'
            '  "key_emotional_moments": ["moment 1", "moment 2"]\n'
            "}\n\n"
            "Score range: -1 (very negative) to 1 (very positive)"
        )

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            content = response.content[0].text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(content[start:end])
                return {
                    "overall": SentimentType(
                        data.get("overall_sentiment", "neutral")
                    ),
                    "score": Decimal(
                        str(data.get("overall_score", 0))
                    ),
                    "client": SentimentType(
                        data.get("client_sentiment", "neutral")
                    ),
                    "client_score": Decimal(
                        str(data.get("client_score", 0))
                    ),
                    "timeline": [],
                }
        except Exception:
            logger.exception("Sentiment analysis failed")

        return fallback

    # ─────────────────────────────────────────────────────────────
    # Summary
    # ─────────────────────────────────────────────────────────────

    async def _generate_summary(
        self,
        text: str,
        analysis: ConversationAnalysis,
    ) -> Dict[str, Any]:
        """Generate AI summary of conversation."""
        fallback: Dict[str, Any] = {
            "executive": "",
            "detailed": "",
            "key_points": [],
            "decisions": [],
            "concerns": [],
            "follow_ups": [],
        }

        if not self.client:
            return fallback

        prompt = (
            "Summarize this financial advisor conversation.\n\n"
            f"TRANSCRIPT:\n{text[:7000]}\n\n"
            "Provide summary in JSON:\n"
            "{\n"
            '  "executive_summary": "2-3 sentence high-level summary",\n'
            '  "detailed_summary": "Longer summary covering main '
            'discussion points",\n'
            '  "key_points": ["point 1", "point 2", "point 3"],\n'
            '  "decisions_made": ["decision 1"],\n'
            '  "concerns_raised": ["concern 1"],\n'
            '  "follow_up_recommendations": ["recommendation 1", '
            '"recommendation 2"]\n'
            "}"
        )

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            content = response.content[0].text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(content[start:end])
                return {
                    "executive": data.get(
                        "executive_summary", ""
                    ),
                    "detailed": data.get("detailed_summary", ""),
                    "key_points": data.get("key_points", []),
                    "decisions": data.get("decisions_made", []),
                    "concerns": data.get("concerns_raised", []),
                    "follow_ups": data.get(
                        "follow_up_recommendations", []
                    ),
                }
        except Exception:
            logger.exception("Summary generation failed")

        return fallback

    # ─────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def _get_max_risk(
        flags: List[ComplianceFlag],
    ) -> ComplianceRiskLevel:
        """Return the highest risk level among a list of flags."""
        if not flags:
            return ComplianceRiskLevel.LOW
        risk_order = ["critical", "high", "medium", "low"]
        for risk in risk_order:
            if any(f.risk_level.value == risk for f in flags):
                return ComplianceRiskLevel(risk)
        return ComplianceRiskLevel.LOW

    # ─────────────────────────────────────────────────────────────
    # Retrieval Methods
    # ─────────────────────────────────────────────────────────────

    async def get_analysis(
        self, analysis_id: UUID
    ) -> Optional[ConversationAnalysis]:
        """Get analysis by ID with relationships."""
        result = await self.db.execute(
            select(ConversationAnalysis)
            .options(
                selectinload(ConversationAnalysis.compliance_flags),
                selectinload(ConversationAnalysis.action_items),
            )
            .where(ConversationAnalysis.id == analysis_id)
        )
        return result.scalar_one_or_none()

    async def get_analysis_by_meeting(
        self, meeting_id: UUID
    ) -> Optional[ConversationAnalysis]:
        """Get analysis for a meeting."""
        result = await self.db.execute(
            select(ConversationAnalysis)
            .options(
                selectinload(ConversationAnalysis.compliance_flags),
                selectinload(ConversationAnalysis.action_items),
            )
            .where(ConversationAnalysis.meeting_id == meeting_id)
        )
        return result.scalar_one_or_none()

    async def list_analyses(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID] = None,
        days: int = 30,
    ) -> List[ConversationAnalysis]:
        """List analyses with filters."""
        since = datetime.utcnow() - timedelta(days=days)

        query = select(ConversationAnalysis).where(
            and_(
                ConversationAnalysis.advisor_id == advisor_id,
                ConversationAnalysis.analyzed_at >= since,
            )
        )
        if client_id:
            query = query.where(
                ConversationAnalysis.client_id == client_id
            )
        query = query.order_by(
            ConversationAnalysis.analyzed_at.desc()
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    # ─────────────────────────────────────────────────────────────
    # Compliance Management
    # ─────────────────────────────────────────────────────────────

    async def review_compliance_flag(
        self,
        flag_id: UUID,
        reviewed_by: UUID,
        status: str,
        notes: Optional[str] = None,
        remediation_action: Optional[str] = None,
    ) -> ComplianceFlag:
        """Review a compliance flag."""
        result = await self.db.execute(
            select(ComplianceFlag).where(
                ComplianceFlag.id == flag_id
            )
        )
        flag = result.scalar_one_or_none()
        if not flag:
            raise ValueError("Compliance flag not found")

        flag.status = status
        flag.reviewed_by = reviewed_by
        flag.reviewed_at = datetime.utcnow()
        flag.review_notes = notes

        if remediation_action:
            flag.remediation_required = True
            flag.remediation_action = remediation_action

        await self.db.commit()
        return flag

    async def get_pending_compliance_flags(
        self, advisor_id: UUID
    ) -> List[ComplianceFlag]:
        """Get unreviewed compliance flags for an advisor."""
        result = await self.db.execute(
            select(ComplianceFlag)
            .join(ConversationAnalysis)
            .where(
                and_(
                    ConversationAnalysis.advisor_id == advisor_id,
                    ComplianceFlag.status == "pending",
                )
            )
            .order_by(ComplianceFlag.risk_level.desc())
        )
        return result.scalars().all()

    # ─────────────────────────────────────────────────────────────
    # Action Items
    # ─────────────────────────────────────────────────────────────

    async def update_action_item(
        self,
        item_id: UUID,
        status: Optional[ActionItemStatus] = None,
        notes: Optional[str] = None,
    ) -> ConversationActionItem:
        """Update an action item's status or notes."""
        result = await self.db.execute(
            select(ConversationActionItem).where(
                ConversationActionItem.id == item_id
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            raise ValueError("Action item not found")

        if status:
            item.status = status
            if status == ActionItemStatus.COMPLETED:
                item.completed_at = datetime.utcnow()
        if notes:
            item.completion_notes = notes

        await self.db.commit()
        return item

    async def get_pending_action_items(
        self, advisor_id: UUID
    ) -> List[ConversationActionItem]:
        """Get pending / in-progress / overdue action items."""
        result = await self.db.execute(
            select(ConversationActionItem)
            .join(ConversationAnalysis)
            .where(
                and_(
                    ConversationAnalysis.advisor_id == advisor_id,
                    ConversationActionItem.status.in_(
                        [
                            ActionItemStatus.PENDING,
                            ActionItemStatus.IN_PROGRESS,
                            ActionItemStatus.OVERDUE,
                        ]
                    ),
                )
            )
            .order_by(ConversationActionItem.due_date.asc())
        )
        return result.scalars().all()
