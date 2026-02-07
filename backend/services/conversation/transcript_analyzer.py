"""
Transcript analysis engine.

Processes meeting transcripts for talk-time metrics, word counts,
question detection, topic extraction, and engagement scoring.
Pure computation — no DB or AI calls required.
"""

import logging
import re
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class TranscriptAnalyzer:
    """Analyses transcripts for metrics and insights."""

    QUESTION_PATTERNS = [
        r"\?$",
        r"^(what|why|how|when|where|who|which|can|could|would|should|is|are|do|does|did|will)\b",
    ]

    TOPIC_KEYWORDS: Dict[str, List[str]] = {
        "retirement": [
            "retirement",
            "retire",
            "401k",
            "ira",
            "pension",
            "social security",
        ],
        "tax_planning": [
            "tax",
            "taxes",
            "deduction",
            "irs",
            "capital gains",
            "tax-loss",
        ],
        "estate_planning": [
            "estate",
            "trust",
            "will",
            "beneficiary",
            "inheritance",
            "probate",
        ],
        "investment": [
            "invest",
            "portfolio",
            "stock",
            "bond",
            "etf",
            "mutual fund",
            "allocation",
        ],
        "risk_management": [
            "risk",
            "volatility",
            "insurance",
            "protection",
            "diversification",
        ],
        "income": [
            "income",
            "salary",
            "earnings",
            "cash flow",
            "dividend",
            "interest",
        ],
        "debt": ["debt", "loan", "mortgage", "credit", "pay off"],
        "education": [
            "college",
            "education",
            "529",
            "tuition",
            "student loan",
        ],
        "real_estate": [
            "property",
            "real estate",
            "house",
            "rental",
            "reit",
        ],
    }

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def analyze_segments(
        self, segments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compute talk-time, word-count, and question metrics."""
        total_duration = 0
        advisor_time = 0
        client_time = 0
        total_words = 0
        advisor_words = 0
        client_words = 0
        questions_advisor = 0
        questions_client = 0

        for seg in segments:
            duration = seg.get("duration_seconds", 0)
            words = len(seg.get("text", "").split())
            is_question = self._is_question(seg.get("text", ""))

            total_duration += duration
            total_words += words

            speaker = seg.get("speaker_label", "").lower()
            if "advisor" in speaker or "agent" in speaker:
                advisor_time += duration
                advisor_words += words
                if is_question:
                    questions_advisor += 1
            else:
                client_time += duration
                client_words += words
                if is_question:
                    questions_client += 1

        talk_ratio = (
            advisor_time / client_time if client_time > 0 else 0
        )

        return {
            "total_duration_seconds": total_duration,
            "talk_time_advisor_seconds": advisor_time,
            "talk_time_client_seconds": client_time,
            "talk_ratio": round(talk_ratio, 4),
            "silence_percentage": 0,  # requires audio-level analysis
            "total_words": total_words,
            "advisor_words": advisor_words,
            "client_words": client_words,
            "questions_asked_advisor": questions_advisor,
            "questions_asked_client": questions_client,
        }

    def extract_topics(self, text: str) -> Dict[str, Any]:
        """Extract topics from full transcript text."""
        text_lower = text.lower()
        topic_counts: Dict[str, int] = {}

        for topic, keywords in self.TOPIC_KEYWORDS.items():
            count = sum(text_lower.count(kw) for kw in keywords)
            if count > 0:
                topic_counts[topic] = count

        total = sum(topic_counts.values()) or 1
        topic_breakdown = {
            k: round(v / total * 100, 1)
            for k, v in topic_counts.items()
        }

        sorted_topics = sorted(
            topic_counts.items(), key=lambda x: x[1], reverse=True
        )
        topics_discussed = [t[0] for t in sorted_topics[:5]]
        primary_topic = topics_discussed[0] if topics_discussed else None

        return {
            "topics_discussed": topics_discussed,
            "topic_breakdown": topic_breakdown,
            "primary_topic": primary_topic,
        }

    def calculate_engagement_score(
        self, metrics: Dict[str, Any], sentiment_score: float
    ) -> int:
        """Calculate engagement score 0-100."""
        score = 50  # base

        # Talk ratio (ideal 0.6-0.8 — advisor slightly more)
        ratio = metrics.get("talk_ratio", 0)
        if 0.5 <= ratio <= 1.0:
            score += 15
        elif 0.3 <= ratio <= 1.5:
            score += 5

        # Client questions (higher = more engaged)
        client_questions = metrics.get("questions_asked_client", 0)
        score += min(client_questions * 3, 15)

        # Sentiment bonus/penalty
        if sentiment_score > 0.3:
            score += 15
        elif sentiment_score > 0:
            score += 5
        elif sentiment_score < -0.3:
            score -= 10

        # Duration sweet-spot (20-60 min)
        duration_min = metrics.get("total_duration_seconds", 0) / 60
        if 20 <= duration_min <= 60:
            score += 5

        return max(0, min(100, score))

    # ─────────────────────────────────────────────────────────────
    # Internals
    # ─────────────────────────────────────────────────────────────

    def _is_question(self, text: str) -> bool:
        """Check if text contains a question."""
        text = text.strip()
        for pattern in self.QUESTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False
