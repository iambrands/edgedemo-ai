"""Compliance audit trail, report, and document review endpoints."""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import ComplianceLog, get_session_factory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compliance", tags=["compliance"])


from backend.api.dependencies import get_db

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user


# ============================================================================
# PYDANTIC SCHEMAS – Document Review
# ============================================================================

class SubmitReviewRequest(BaseModel):
    """Submit a document for compliance review."""
    title: str
    document_type: str = "other"
    description: Optional[str] = None
    content_url: Optional[str] = None


class RunAIReviewRequest(BaseModel):
    """Optional instructions for AI review."""
    instructions: Optional[str] = None


class ApproveDocumentRequest(BaseModel):
    """Approve a document review."""
    reviewer_notes: Optional[str] = None


class RejectDocumentRequest(BaseModel):
    """Reject a document review."""
    reason: Optional[str] = None
    reviewer_notes: Optional[str] = None


class AIFinding(BaseModel):
    severity: str
    section: str
    detail: str


class DocumentReviewResponse(BaseModel):
    """Response schema for a document review."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    advisor_id: str
    document_type: str
    title: str
    description: Optional[str] = None
    status: str
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    ai_review_score: Optional[int] = None
    ai_review_summary: Optional[str] = None
    ai_findings: List[AIFinding] = []
    reviewer_notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============================================================================
# AUDIT TRAIL ENDPOINTS
# ============================================================================

@router.get("/audit-trail")
async def get_audit_trail(
    client_id: str | None = Query(None),
    limit: int = Query(100, le=500),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Query compliance audit logs."""
    q = select(ComplianceLog).order_by(ComplianceLog.timestamp.desc()).limit(limit)
    if client_id:
        q = q.where(ComplianceLog.client_id == client_id)
    result = await session.execute(q)
    rows = result.scalars().all()
    return {
        "entries": [
            {
                "id": str(r.id),
                "rule_checked": r.rule_checked,
                "result": r.result,
                "severity": r.severity,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in rows
        ],
        "count": len(rows),
    }


@router.get("/report/{client_id}")
async def get_compliance_report(
    client_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Generate compliance report for client. Mock summary for now."""
    return {
        "client_id": client_id,
        "report_type": "compliance_summary",
        "message": "Use audit-trail for detailed logs.",
    }


# ============================================================================
# DOCUMENT REVIEW ENDPOINTS
# ============================================================================

def _get_compliance_service():
    """Lazy-import to avoid circular dependencies."""
    from backend.services.compliance_service import ComplianceService
    return ComplianceService()


@router.get("/documents", response_model=List[DocumentReviewResponse])
async def list_document_reviews(
    status: Optional[str] = Query(None, description="Filter by status"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    List document reviews for the current advisor.

    Returns all compliance document reviews, optionally filtered by status
    and/or document_type.
    """
    advisor_id = current_user.get("id", "a0000000-0000-4000-8000-000000000001")
    service = _get_compliance_service()

    reviews = await service.get_document_reviews(
        advisor_id=advisor_id,
        status=status,
        document_type=document_type,
    )
    return reviews


@router.post("/documents", response_model=DocumentReviewResponse, status_code=201)
async def submit_document_for_review(
    request: SubmitReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Submit a document for compliance review.

    Creates a new document review entry with status 'pending_review'.
    """
    advisor_id = current_user.get("id", "a0000000-0000-4000-8000-000000000001")
    service = _get_compliance_service()

    review = await service.submit_for_review(
        advisor_id=advisor_id,
        data=request.model_dump(),
    )
    return review


@router.post("/documents/{review_id}/ai-review", response_model=DocumentReviewResponse)
async def run_ai_document_review(
    review_id: str,
    request: RunAIReviewRequest = RunAIReviewRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Run AI-powered compliance review on a submitted document.

    Uses Claude to analyze the document for regulatory compliance issues
    and returns findings with a compliance score.
    """
    service = _get_compliance_service()

    try:
        review = await service.run_ai_review(
            review_id=review_id,
            instructions=request.instructions,
        )
        return review
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/documents/{review_id}/approve", response_model=DocumentReviewResponse)
async def approve_document_review(
    review_id: str,
    request: ApproveDocumentRequest = ApproveDocumentRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Approve a document review.

    Sets the document status to 'approved' and records reviewer notes.
    """
    service = _get_compliance_service()

    try:
        review = await service.approve_document(
            review_id=review_id,
            reviewer_notes=request.reviewer_notes,
        )
        return review
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/documents/{review_id}/reject", response_model=DocumentReviewResponse)
async def reject_document_review(
    review_id: str,
    request: RejectDocumentRequest = RejectDocumentRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Reject a document review.

    Sets the document status to 'needs_revision' with rejection reason.
    """
    service = _get_compliance_service()

    try:
        review = await service.reject_document(
            review_id=review_id,
            reviewer_notes=request.reviewer_notes,
            reason=request.reason,
        )
        return review
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
