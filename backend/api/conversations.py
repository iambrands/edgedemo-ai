"""
Conversation Intelligence API endpoints.

Analyse meeting transcripts for sentiment, compliance, action items,
and generate AI-powered summaries and insights.

Endpoints:
  POST   /api/v1/conversations/analyze                      – Analyse transcript
  GET    /api/v1/conversations/analyses                     – List analyses
  GET    /api/v1/conversations/analyses/{id}                – Get analysis detail
  GET    /api/v1/conversations/meetings/{id}/analysis       – Get analysis by meeting
  GET    /api/v1/conversations/compliance/flags             – List compliance flags
  GET    /api/v1/conversations/compliance/flags/pending     – Pending flags
  PATCH  /api/v1/conversations/compliance/flags/{id}        – Review flag
  GET    /api/v1/conversations/compliance/summary           – Compliance summary
  GET    /api/v1/conversations/action-items                 – List action items
  GET    /api/v1/conversations/action-items/pending         – Pending items
  PATCH  /api/v1/conversations/action-items/{id}            – Update action item
  GET    /api/v1/conversations/metrics                      – Dashboard metrics
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session
from backend.models.conversation import (
    ActionItemStatus,
    ComplianceFlag,
    ComplianceRiskLevel,
    ConversationActionItem,
    ConversationAnalysis,
)
from backend.services.conversation import ConversationService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/conversations",
    tags=["Conversation Intelligence"],
)


# ============================================================================
# PYDANTIC SCHEMAS (inline, following existing codebase pattern)
# ============================================================================


class _ConversationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Request schemas ─────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    meeting_id: UUID
    transcript: str
    segments: List[Dict[str, Any]]
    client_id: Optional[UUID] = None


class ReviewFlagRequest(BaseModel):
    status: str
    notes: Optional[str] = None
    remediation_action: Optional[str] = None


class UpdateActionItemRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


# ── Response schemas ────────────────────────────────────────────


class AnalysisResponse(_ConversationBase):
    id: UUID
    meeting_id: UUID
    analysis_status: str
    analyzed_at: Optional[datetime] = None

    # Duration / Talk-Time
    total_duration_seconds: int = 0
    talk_time_advisor_seconds: int = 0
    talk_time_client_seconds: int = 0
    talk_ratio: Optional[float] = None

    # Sentiment
    overall_sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None

    # Engagement
    engagement_score: int = 0

    # Topics
    topics_discussed: Optional[List[str]] = None
    primary_topic: Optional[str] = None

    # Summary
    key_points: Optional[List[str]] = None
    executive_summary: Optional[str] = None

    # Counts
    compliance_flags_count: int = 0
    compliance_risk_level: Optional[str] = None
    action_items_count: int = 0

    created_at: Optional[datetime] = None


class ComplianceFlagResponse(_ConversationBase):
    id: UUID
    analysis_id: UUID
    category: str
    risk_level: str
    flagged_text: str
    timestamp_start: int
    timestamp_end: int
    speaker: Optional[str] = None
    ai_explanation: str
    ai_confidence: float
    suggested_correction: Optional[str] = None
    regulatory_reference: Optional[str] = None
    status: str
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    remediation_required: bool = False
    remediation_action: Optional[str] = None
    created_at: Optional[datetime] = None


class ActionItemResponse(_ConversationBase):
    id: UUID
    analysis_id: UUID
    title: str
    description: Optional[str] = None
    source_text: Optional[str] = None
    owner_type: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    category: Optional[str] = None
    ai_generated: bool = False
    created_at: Optional[datetime] = None


class ComplianceSummaryResponse(BaseModel):
    total_flags: int
    pending_review: int
    by_risk_level: Dict[str, int]
    by_category: Dict[str, int]


class ConversationMetricsResponse(BaseModel):
    period_days: int
    total_conversations: int
    avg_sentiment_score: Optional[float] = None
    avg_engagement_score: int = 50
    total_compliance_flags: int = 0
    action_items_created: int = 0
    action_items_completed: int = 0
    top_topics: Dict[str, int] = {}


# ============================================================================
# HELPERS
# ============================================================================


def _analysis_to_dict(a: ConversationAnalysis) -> dict:
    """Convert an ORM analysis object to a safe serialisable dict."""
    return AnalysisResponse(
        id=a.id,
        meeting_id=a.meeting_id,
        analysis_status=a.analysis_status,
        analyzed_at=a.analyzed_at,
        total_duration_seconds=a.total_duration_seconds or 0,
        talk_time_advisor_seconds=a.talk_time_advisor_seconds or 0,
        talk_time_client_seconds=a.talk_time_client_seconds or 0,
        talk_ratio=float(a.talk_ratio) if a.talk_ratio is not None else None,
        overall_sentiment=(
            a.overall_sentiment.value if a.overall_sentiment else None
        ),
        sentiment_score=(
            float(a.sentiment_score) if a.sentiment_score is not None else None
        ),
        engagement_score=a.engagement_score or 0,
        topics_discussed=a.topics_discussed,
        primary_topic=a.primary_topic,
        key_points=a.key_points,
        executive_summary=a.executive_summary,
        compliance_flags_count=a.compliance_flags_count or 0,
        compliance_risk_level=(
            a.compliance_risk_level.value
            if a.compliance_risk_level
            else None
        ),
        action_items_count=a.action_items_count or 0,
        created_at=a.created_at,
    ).model_dump()


def _flag_to_dict(f: ComplianceFlag) -> dict:
    """Convert a ComplianceFlag ORM object to a safe dict."""
    return ComplianceFlagResponse(
        id=f.id,
        analysis_id=f.analysis_id,
        category=f.category.value if hasattr(f.category, "value") else str(f.category),
        risk_level=f.risk_level.value if hasattr(f.risk_level, "value") else str(f.risk_level),
        flagged_text=f.flagged_text,
        timestamp_start=f.timestamp_start,
        timestamp_end=f.timestamp_end,
        speaker=f.speaker,
        ai_explanation=f.ai_explanation,
        ai_confidence=float(f.ai_confidence) if f.ai_confidence is not None else 0.0,
        suggested_correction=f.suggested_correction,
        regulatory_reference=f.regulatory_reference,
        status=f.status,
        reviewed_by=f.reviewed_by,
        reviewed_at=f.reviewed_at,
        review_notes=f.review_notes,
        remediation_required=f.remediation_required,
        remediation_action=f.remediation_action,
        created_at=f.created_at,
    ).model_dump()


def _action_to_dict(item: ConversationActionItem) -> dict:
    """Convert an ActionItem ORM object to a safe dict."""
    return ActionItemResponse(
        id=item.id,
        analysis_id=item.analysis_id,
        title=item.title,
        description=item.description,
        source_text=item.source_text,
        owner_type=item.owner_type or "advisor",
        status=item.status.value if hasattr(item.status, "value") else str(item.status),
        priority=item.priority.value if hasattr(item.priority, "value") else str(item.priority),
        due_date=item.due_date,
        completed_at=item.completed_at,
        category=item.category,
        ai_generated=item.ai_generated,
        created_at=item.created_at,
    ).model_dump()


# ============================================================================
# ANALYSIS ENDPOINTS
# ============================================================================


@router.post("/analyze")
async def analyze_meeting(
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Analyse a meeting transcript (full AI pipeline)."""
    advisor_id = UUID(current_user["id"])
    service = ConversationService(db)

    analysis = await service.analyze_meeting(
        meeting_id=request.meeting_id,
        advisor_id=advisor_id,
        transcript=request.transcript,
        segments=request.segments,
        client_id=request.client_id,
    )

    return _analysis_to_dict(analysis)


@router.get("/analyses")
async def list_analyses(
    client_id: Optional[UUID] = None,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List conversation analyses for the current advisor."""
    try:
        advisor_id = UUID(current_user["id"])
        service = ConversationService(db)
        analyses = await service.list_analyses(advisor_id, client_id, days)
        return {
            "analyses": [_analysis_to_dict(a) for a in analyses],
            "total": len(analyses),
        }
    except Exception:
        from backend.services.mock_data_store import conversation_analyses_response
        return conversation_analyses_response()


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get full analysis with compliance flags and action items."""
    advisor_id = UUID(current_user["id"])
    service = ConversationService(db)
    analysis = await service.get_analysis(analysis_id)

    if not analysis or analysis.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Analysis not found")

    base = _analysis_to_dict(analysis)
    base["detailed_summary"] = analysis.detailed_summary
    base["decisions_made"] = analysis.decisions_made
    base["concerns_raised"] = analysis.concerns_raised
    base["follow_up_recommendations"] = analysis.follow_up_recommendations
    base["compliance_flags"] = [
        _flag_to_dict(f) for f in (analysis.compliance_flags or [])
    ]
    base["action_items"] = [
        _action_to_dict(i) for i in (analysis.action_items or [])
    ]
    return base


@router.get("/meetings/{meeting_id}/analysis")
async def get_analysis_by_meeting(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get analysis for a specific meeting."""
    advisor_id = UUID(current_user["id"])
    service = ConversationService(db)
    analysis = await service.get_analysis_by_meeting(meeting_id)

    if not analysis or analysis.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Analysis not found")

    base = _analysis_to_dict(analysis)
    base["detailed_summary"] = analysis.detailed_summary
    base["compliance_flags"] = [
        _flag_to_dict(f) for f in (analysis.compliance_flags or [])
    ]
    base["action_items"] = [
        _action_to_dict(i) for i in (analysis.action_items or [])
    ]
    return base


# ============================================================================
# COMPLIANCE ENDPOINTS
# ============================================================================


@router.get("/compliance/flags")
async def list_compliance_flags(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List compliance flags with optional filters."""
    try:
        advisor_id = UUID(current_user["id"])
        since = datetime.utcnow() - timedelta(days=days)

        query = (
            select(ComplianceFlag)
            .join(ConversationAnalysis)
            .where(
                and_(
                    ConversationAnalysis.advisor_id == advisor_id,
                    ComplianceFlag.created_at >= since,
                )
            )
        )

        if status:
            query = query.where(ComplianceFlag.status == status)
        if risk_level:
            query = query.where(
                ComplianceFlag.risk_level == ComplianceRiskLevel(risk_level)
            )

        query = query.order_by(
            ComplianceFlag.risk_level.desc(),
            ComplianceFlag.created_at.desc(),
        )
        result = await db.execute(query)
        flags = result.scalars().all()

        return {
            "flags": [_flag_to_dict(f) for f in flags],
            "total": len(flags),
            "pending": sum(1 for f in flags if f.status == "pending"),
            "high_risk": sum(
                1
                for f in flags
                if f.risk_level
                in [ComplianceRiskLevel.HIGH, ComplianceRiskLevel.CRITICAL]
            ),
        }
    except Exception:
        from backend.services.mock_data_store import conversation_flags_response
        return conversation_flags_response()


@router.get("/compliance/flags/pending")
async def get_pending_flags(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get pending compliance flags awaiting review."""
    advisor_id = UUID(current_user["id"])
    service = ConversationService(db)
    flags = await service.get_pending_compliance_flags(advisor_id)

    return {
        "flags": [_flag_to_dict(f) for f in flags],
        "total": len(flags),
    }


@router.patch("/compliance/flags/{flag_id}")
async def review_flag(
    flag_id: UUID,
    request: ReviewFlagRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Review a compliance flag."""
    advisor_id = UUID(current_user["id"])
    service = ConversationService(db)

    try:
        flag = await service.review_compliance_flag(
            flag_id=flag_id,
            reviewed_by=advisor_id,
            status=request.status,
            notes=request.notes,
            remediation_action=request.remediation_action,
        )
        return _flag_to_dict(flag)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/compliance/summary")
async def get_compliance_summary(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get aggregate compliance summary."""
    advisor_id = UUID(current_user["id"])
    since = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(ComplianceFlag)
        .join(ConversationAnalysis)
        .where(
            and_(
                ConversationAnalysis.advisor_id == advisor_id,
                ComplianceFlag.created_at >= since,
            )
        )
    )
    flags = result.scalars().all()

    by_risk: Dict[str, int] = {}
    by_category: Dict[str, int] = {}
    pending = 0

    for f in flags:
        risk_val = f.risk_level.value if hasattr(f.risk_level, "value") else str(f.risk_level)
        cat_val = f.category.value if hasattr(f.category, "value") else str(f.category)
        by_risk[risk_val] = by_risk.get(risk_val, 0) + 1
        by_category[cat_val] = by_category.get(cat_val, 0) + 1
        if f.status == "pending":
            pending += 1

    return ComplianceSummaryResponse(
        total_flags=len(flags),
        pending_review=pending,
        by_risk_level=by_risk,
        by_category=by_category,
    ).model_dump()


# ============================================================================
# ACTION-ITEM ENDPOINTS
# ============================================================================


@router.get("/action-items")
async def list_action_items(
    status: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List action items from conversations."""
    try:
        advisor_id = UUID(current_user["id"])
        since = datetime.utcnow() - timedelta(days=days)

        query = (
            select(ConversationActionItem)
            .join(ConversationAnalysis)
            .where(
                and_(
                    ConversationAnalysis.advisor_id == advisor_id,
                    ConversationActionItem.created_at >= since,
                )
            )
        )

        if status:
            query = query.where(
                ConversationActionItem.status == ActionItemStatus(status)
            )

        query = query.order_by(ConversationActionItem.due_date.asc())
        result = await db.execute(query)
        items = result.scalars().all()

        now = datetime.utcnow()
        overdue = sum(
            1
            for i in items
            if i.due_date
            and i.due_date < now
            and i.status == ActionItemStatus.PENDING
        )
        pending = sum(
            1
            for i in items
            if i.status
            in [ActionItemStatus.PENDING, ActionItemStatus.IN_PROGRESS]
        )

        return {
            "items": [_action_to_dict(i) for i in items],
            "total": len(items),
            "pending": pending,
            "overdue": overdue,
        }
    except Exception:
        from backend.services.mock_data_store import conversation_action_items_response
        return conversation_action_items_response()


@router.get("/action-items/pending")
async def get_pending_action_items(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get pending action items."""
    advisor_id = UUID(current_user["id"])
    service = ConversationService(db)
    items = await service.get_pending_action_items(advisor_id)

    now = datetime.utcnow()
    overdue = sum(1 for i in items if i.due_date and i.due_date < now)

    return {
        "items": [_action_to_dict(i) for i in items],
        "total": len(items),
        "overdue": overdue,
    }


@router.patch("/action-items/{item_id}")
async def update_action_item(
    item_id: UUID,
    request: UpdateActionItemRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update an action item's status or notes."""
    service = ConversationService(db)

    try:
        item = await service.update_action_item(
            item_id=item_id,
            status=(
                ActionItemStatus(request.status) if request.status else None
            ),
            notes=request.notes,
        )
        return _action_to_dict(item)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ============================================================================
# METRICS ENDPOINT
# ============================================================================


@router.get("/metrics")
async def get_conversation_metrics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get aggregate conversation metrics for dashboard."""
    try:
        advisor_id = UUID(current_user["id"])
        since = datetime.utcnow() - timedelta(days=days)

        result = await db.execute(
            select(ConversationAnalysis).where(
                and_(
                    ConversationAnalysis.advisor_id == advisor_id,
                    ConversationAnalysis.analyzed_at >= since,
                )
            )
        )
        analyses = result.scalars().all()

        total = len(analyses)
        avg_sentiment = (
            round(
                sum(float(a.sentiment_score or 0) for a in analyses) / total,
                3,
            )
            if total
            else None
        )
        avg_engagement = (
            sum(a.engagement_score or 0 for a in analyses) // total
            if total
            else 50
        )
        total_flags = sum(a.compliance_flags_count or 0 for a in analyses)
        total_items = sum(a.action_items_count or 0 for a in analyses)
        completed_items = sum(
            a.action_items_completed or 0 for a in analyses
        )

        topic_counts: Dict[str, int] = {}
        for a in analyses:
            for topic in a.topics_discussed or []:
                topic_counts[topic] = topic_counts.get(topic, 0) + 1

        return ConversationMetricsResponse(
            period_days=days,
            total_conversations=total,
            avg_sentiment_score=avg_sentiment,
            avg_engagement_score=avg_engagement,
            total_compliance_flags=total_flags,
            action_items_created=total_items,
            action_items_completed=completed_items,
            top_topics=dict(
                sorted(
                    topic_counts.items(),
                    key=lambda x: x[1],
                    reverse=True,
                )[:10]
            ),
        ).model_dump()
    except Exception:
        from backend.services.mock_data_store import conversation_metrics_response
        return conversation_metrics_response(days)
