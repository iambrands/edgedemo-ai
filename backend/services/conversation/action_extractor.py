"""
Action item extraction from conversations.

Uses Anthropic Claude to identify commitments, follow-ups, document requests,
and research tasks mentioned during meetings.
"""

import json
import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List
from uuid import UUID

import anthropic

from backend.models.conversation import (
    ActionItemPriority,
    ActionItemStatus,
    ConversationActionItem,
)

logger = logging.getLogger(__name__)


class ActionExtractor:
    """Extracts action items from conversation transcripts."""

    def __init__(self) -> None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
            logger.warning(
                "ANTHROPIC_API_KEY not set — AI action extraction disabled"
            )

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def extract_actions(
        self,
        analysis_id: UUID,
        transcript: str,
        segments: List[Dict[str, Any]],
    ) -> List[ConversationActionItem]:
        """Extract action items from a transcript."""
        if not self.client:
            logger.info(
                "Anthropic client not available — skipping action extraction"
            )
            return []

        prompt = (
            "Analyze this financial advisor conversation and extract "
            "all action items, commitments, and follow-ups.\n\n"
            "Look for:\n"
            '1. Explicit commitments ("I will send you...", '
            '"Let me get back to you on...")\n'
            '2. Client requests ("Can you look into...", "I need...")\n'
            "3. Scheduled follow-ups (\"Let's talk next week about...\")\n"
            '4. Document requests ("I\'ll need a copy of...")\n'
            '5. Research tasks ("I\'ll research options for...")\n\n'
            f"TRANSCRIPT:\n{transcript[:8000]}\n\n"
            "Extract action items in JSON format:\n"
            "{\n"
            '  "action_items": [\n'
            "    {\n"
            '      "title": "Brief description of the action",\n'
            '      "description": "More detailed explanation if needed",\n'
            '      "source_text": "Exact quote that triggered this action",\n'
            '      "owner_type": "advisor|client",\n'
            '      "priority": "low|medium|high|urgent",\n'
            '      "category": "follow_up|document|research|meeting|review|other",\n'
            '      "suggested_due_days": 7,\n'
            '      "confidence": 0.85\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(text[start:end])

                items: List[ConversationActionItem] = []
                for a in data.get("action_items", []):
                    # Attempt to locate source text in segments
                    timestamp = None
                    speaker = None
                    source = a.get("source_text", "")
                    if source:
                        position = transcript.lower().find(
                            source.lower()[:30]
                        )
                        if position >= 0:
                            for seg in segments:
                                seg_text = seg.get("text", "").lower()
                                window = transcript[
                                    max(0, position - 50) : position
                                    + 100
                                ].lower()
                                if seg_text and seg_text in window:
                                    timestamp = seg.get("start_time")
                                    speaker = seg.get("speaker_label")
                                    break

                    due_days = a.get("suggested_due_days", 7)

                    items.append(
                        ConversationActionItem(
                            analysis_id=analysis_id,
                            title=a["title"],
                            description=a.get("description"),
                            source_text=source or None,
                            timestamp=timestamp,
                            speaker=speaker,
                            owner_type=a.get("owner_type", "advisor"),
                            status=ActionItemStatus.PENDING,
                            priority=ActionItemPriority(
                                a.get("priority", "medium")
                            ),
                            due_date=datetime.utcnow()
                            + timedelta(days=due_days),
                            ai_generated=True,
                            ai_confidence=Decimal(
                                str(a.get("confidence", 0.85))
                            ),
                            category=a.get("category", "follow_up"),
                        )
                    )
                return items
        except Exception:
            logger.exception("Action extraction failed")

        return []
