"""
Compliance Document Review Service.
AI-powered compliance review for submitted documents.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory store (demo) – swap with DB-backed queries in production
# ---------------------------------------------------------------------------

_REVIEWS: Dict[str, Dict[str, Any]] = {}


def _seed_demo_reviews() -> None:
    """Pre-populate demo document reviews so GET /documents never returns empty."""
    if _REVIEWS:
        return

    now = datetime.utcnow()

    demos = [
        {
            "id": "dr-001",
            "advisor_id": "a0000000-0000-4000-8000-000000000001",
            "document_type": "adv_part_2b",
            "title": "ADV Part 2B – Leslie Wilson",
            "description": "Annual brochure supplement update for Leslie Wilson",
            "status": "approved",
            "submitted_at": (now - timedelta(days=5)).isoformat(),
            "reviewed_at": (now - timedelta(days=3)).isoformat(),
            "ai_review_score": 92,
            "ai_review_summary": "Document meets SEC Form ADV Part 2B requirements. Minor formatting suggestions.",
            "ai_findings": [
                {"severity": "low", "section": "Item 2", "detail": "Consider adding recent CE credits"},
                {"severity": "info", "section": "Item 6", "detail": "Supervisor phone format updated"},
            ],
            "reviewer_notes": "Approved with minor edits applied.",
            "created_at": (now - timedelta(days=5)).isoformat(),
            "updated_at": (now - timedelta(days=3)).isoformat(),
        },
        {
            "id": "dr-002",
            "advisor_id": "a0000000-0000-4000-8000-000000000001",
            "document_type": "form_crs",
            "title": "Form CRS – IAB Advisors",
            "description": "Client Relationship Summary for firm-wide distribution",
            "status": "pending_review",
            "submitted_at": (now - timedelta(days=1)).isoformat(),
            "reviewed_at": None,
            "ai_review_score": None,
            "ai_review_summary": None,
            "ai_findings": [],
            "reviewer_notes": None,
            "created_at": (now - timedelta(days=1)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat(),
        },
        {
            "id": "dr-003",
            "advisor_id": "a0000000-0000-4000-8000-000000000001",
            "document_type": "advisory_agreement",
            "title": "Advisory Agreement Template v3.1",
            "description": "Updated advisory agreement with new fee schedule",
            "status": "needs_revision",
            "submitted_at": (now - timedelta(days=7)).isoformat(),
            "reviewed_at": (now - timedelta(days=6)).isoformat(),
            "ai_review_score": 68,
            "ai_review_summary": "Several compliance issues detected that need attention before approval.",
            "ai_findings": [
                {"severity": "high", "section": "Fee Disclosure", "detail": "Fee schedule lacks required Reg BI comparative disclosure"},
                {"severity": "medium", "section": "Termination Clause", "detail": "30-day notice period should be explicitly stated per state requirements"},
                {"severity": "low", "section": "Signature Block", "detail": "Missing firm CRD number"},
            ],
            "reviewer_notes": "Please address high-severity findings before re-submission.",
            "created_at": (now - timedelta(days=7)).isoformat(),
            "updated_at": (now - timedelta(days=6)).isoformat(),
        },
        {
            "id": "dr-004",
            "advisor_id": "a0000000-0000-4000-8000-000000000001",
            "document_type": "privacy_policy",
            "title": "Privacy Policy – Reg S-P Update",
            "description": "Annual privacy notice update for Regulation S-P compliance",
            "status": "approved",
            "submitted_at": (now - timedelta(days=14)).isoformat(),
            "reviewed_at": (now - timedelta(days=12)).isoformat(),
            "ai_review_score": 97,
            "ai_review_summary": "Fully compliant with Regulation S-P and GLBA requirements.",
            "ai_findings": [
                {"severity": "info", "section": "Opt-Out Notice", "detail": "Opt-out language is clear and compliant"},
            ],
            "reviewer_notes": "Excellent – ready for client distribution.",
            "created_at": (now - timedelta(days=14)).isoformat(),
            "updated_at": (now - timedelta(days=12)).isoformat(),
        },
    ]

    for d in demos:
        _REVIEWS[d["id"]] = d


class ComplianceService:
    """Service for AI-powered document compliance review."""

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        _seed_demo_reviews()

    # ------------------------------------------------------------------
    # List
    # ------------------------------------------------------------------
    async def get_document_reviews(
        self,
        advisor_id: str,
        status: Optional[str] = None,
        document_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Return document reviews filtered by advisor, optionally by status/type."""
        results = [
            r for r in _REVIEWS.values()
            if r["advisor_id"] == advisor_id
        ]
        if status:
            results = [r for r in results if r["status"] == status]
        if document_type:
            results = [r for r in results if r["document_type"] == document_type]

        # Sort newest first
        results.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return results

    # ------------------------------------------------------------------
    # Submit
    # ------------------------------------------------------------------
    async def submit_for_review(
        self,
        advisor_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Submit a new document for compliance review."""
        now = datetime.utcnow().isoformat()
        review_id = f"dr-{uuid.uuid4().hex[:8]}"

        review: Dict[str, Any] = {
            "id": review_id,
            "advisor_id": advisor_id,
            "document_type": data.get("document_type", "other"),
            "title": data["title"],
            "description": data.get("description"),
            "status": "pending_review",
            "submitted_at": now,
            "reviewed_at": None,
            "ai_review_score": None,
            "ai_review_summary": None,
            "ai_findings": [],
            "reviewer_notes": None,
            "created_at": now,
            "updated_at": now,
        }
        _REVIEWS[review_id] = review
        logger.info("Document review %s submitted by advisor %s", review_id, advisor_id)
        return review

    # ------------------------------------------------------------------
    # AI Review
    # ------------------------------------------------------------------
    async def run_ai_review(
        self,
        review_id: str,
        instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run AI-powered compliance review on the document."""
        review = _REVIEWS.get(review_id)
        if not review:
            raise ValueError(f"Document review {review_id} not found")

        # Attempt real AI review via Anthropic
        try:
            import anthropic

            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                client = anthropic.Anthropic(api_key=api_key)

                prompt = (
                    f"You are a compliance officer at an SEC-registered RIA. "
                    f"Review this document for regulatory compliance.\n\n"
                    f"Document Type: {review['document_type']}\n"
                    f"Title: {review['title']}\n"
                    f"Description: {review.get('description', 'N/A')}\n"
                )
                if instructions:
                    prompt += f"\nAdditional instructions: {instructions}\n"

                prompt += (
                    "\nReturn a JSON object with:\n"
                    '{"score": <0-100>, "summary": "<overall assessment>", '
                    '"findings": [{"severity": "high|medium|low|info", '
                    '"section": "<section>", "detail": "<finding>"}]}\n'
                    "Return ONLY valid JSON."
                )

                response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}],
                )

                text = response.content[0].text
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0]

                result = json.loads(text.strip())

                review["ai_review_score"] = result.get("score", 85)
                review["ai_review_summary"] = result.get("summary", "Review complete.")
                review["ai_findings"] = result.get("findings", [])
                review["reviewed_at"] = datetime.utcnow().isoformat()
                review["updated_at"] = datetime.utcnow().isoformat()

                logger.info("AI review completed for %s: score=%s", review_id, review["ai_review_score"])
                return review

        except Exception as e:
            logger.warning("AI review unavailable, using rule-based fallback: %s", e)

        # Fallback: rule-based mock review
        findings = self._rule_based_review(review)
        score = max(0, 100 - sum(
            {"high": 15, "medium": 8, "low": 3, "info": 0}.get(f["severity"], 0)
            for f in findings
        ))

        review["ai_review_score"] = score
        review["ai_review_summary"] = (
            f"Rule-based review complete. Score: {score}/100. "
            f"Found {len(findings)} item(s) to address."
        )
        review["ai_findings"] = findings
        review["reviewed_at"] = datetime.utcnow().isoformat()
        review["updated_at"] = datetime.utcnow().isoformat()

        logger.info("Rule-based review completed for %s: score=%s", review_id, score)
        return review

    def _rule_based_review(self, review: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simple rule-based compliance checks as fallback."""
        findings: List[Dict[str, Any]] = []
        doc_type = review.get("document_type", "")

        if doc_type == "adv_part_2b":
            findings.append({
                "severity": "info",
                "section": "Cover Page",
                "detail": "Verify CRD number and business address are current.",
            })
            findings.append({
                "severity": "low",
                "section": "Item 2",
                "detail": "Ensure all professional designations include issuing organization.",
            })
        elif doc_type == "form_crs":
            findings.append({
                "severity": "medium",
                "section": "Fee Disclosure",
                "detail": "Confirm fee schedule reflects current ADV Part 2A.",
            })
            findings.append({
                "severity": "info",
                "section": "Conversation Starters",
                "detail": "SEC requires at least one conversation starter per section.",
            })
        elif doc_type == "advisory_agreement":
            findings.append({
                "severity": "high",
                "section": "Fee Schedule",
                "detail": "Verify fee schedule matches ADV Part 2A disclosures.",
            })
            findings.append({
                "severity": "medium",
                "section": "Termination",
                "detail": "Confirm termination provisions meet state requirements.",
            })
        else:
            findings.append({
                "severity": "info",
                "section": "General",
                "detail": "Document reviewed. No specific compliance rules matched.",
            })

        return findings

    # ------------------------------------------------------------------
    # Approve / Reject
    # ------------------------------------------------------------------
    async def approve_document(
        self,
        review_id: str,
        reviewer_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Approve a document review."""
        review = _REVIEWS.get(review_id)
        if not review:
            raise ValueError(f"Document review {review_id} not found")

        review["status"] = "approved"
        review["reviewer_notes"] = reviewer_notes
        review["reviewed_at"] = datetime.utcnow().isoformat()
        review["updated_at"] = datetime.utcnow().isoformat()

        logger.info("Document review %s approved", review_id)
        return review

    async def reject_document(
        self,
        review_id: str,
        reviewer_notes: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Reject a document review."""
        review = _REVIEWS.get(review_id)
        if not review:
            raise ValueError(f"Document review {review_id} not found")

        review["status"] = "needs_revision"
        review["reviewer_notes"] = reviewer_notes or reason
        review["reviewed_at"] = datetime.utcnow().isoformat()
        review["updated_at"] = datetime.utcnow().isoformat()

        logger.info("Document review %s rejected", review_id)
        return review
