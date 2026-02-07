"""
Prospect Pipeline API endpoints.

Full CRM for tracking leads from initial contact through conversion,
with AI-powered lead scoring and proposal generation.

Endpoints:
  POST   /api/v1/prospects                        – Create prospect
  GET    /api/v1/prospects                        – List (filter, search, paginate)
  GET    /api/v1/prospects/pipeline/summary       – Funnel summary
  GET    /api/v1/prospects/pipeline/metrics       – Conversion metrics
  GET    /api/v1/prospects/tasks/pending           – Pending tasks
  GET    /api/v1/prospects/{id}                    – Get prospect
  PATCH  /api/v1/prospects/{id}                    – Update prospect
  DELETE /api/v1/prospects/{id}                    – Delete prospect
  POST   /api/v1/prospects/{id}/activities         – Log activity
  GET    /api/v1/prospects/{id}/activities         – Get activities
  POST   /api/v1/prospects/{id}/proposals/generate – AI proposal
  GET    /api/v1/prospects/{id}/proposals          – Get proposals
  PATCH  /api/v1/prospects/proposals/{id}/status   – Update proposal status
  POST   /api/v1/prospects/{id}/convert            – Convert to client
  POST   /api/v1/prospects/{id}/lost               – Mark lost
  POST   /api/v1/prospects/{id}/score              – Rescore
  POST   /api/v1/prospects/score/all               – Rescore all
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session
from backend.models.prospect import (
    ActivityType,
    LeadSource,
    ProposalStatus,
    ProspectStatus,
)
from backend.services.prospect import ProspectService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/prospects",
    tags=["Prospect Pipeline"],
)


# ============================================================================
# PYDANTIC SCHEMAS (inline, following existing codebase pattern)
# ============================================================================


class _ProspectBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Request schemas ─────────────────────────────────────────────


class ProspectCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    linkedin_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lead_source: Optional[str] = "other"
    source_detail: Optional[str] = None
    referred_by_client_id: Optional[str] = None
    estimated_aum: Optional[float] = None
    annual_income: Optional[float] = None
    risk_tolerance: Optional[str] = None
    investment_goals: Optional[List[str]] = []
    time_horizon: Optional[str] = None
    interested_services: Optional[List[str]] = []
    notes: Optional[str] = None
    tags: Optional[List[str]] = []


class ProspectUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    linkedin_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    status: Optional[str] = None
    lead_source: Optional[str] = None
    source_detail: Optional[str] = None
    estimated_aum: Optional[float] = None
    annual_income: Optional[float] = None
    net_worth: Optional[float] = None
    risk_tolerance: Optional[str] = None
    investment_goals: Optional[List[str]] = None
    time_horizon: Optional[str] = None
    interested_services: Optional[List[str]] = None
    next_action_date: Optional[date] = None
    next_action_type: Optional[str] = None
    next_action_notes: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ActivityCreate(BaseModel):
    activity_type: str
    subject: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    call_outcome: Optional[str] = None
    call_direction: Optional[str] = None
    email_status: Optional[str] = None
    meeting_outcome: Optional[str] = None
    task_due_date: Optional[date] = None


class ProposalGenerateRequest(BaseModel):
    custom_params: Optional[Dict[str, Any]] = None


class ProposalStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class ConvertToClientRequest(BaseModel):
    client_id: str  # UUID as string


class MarkLostRequest(BaseModel):
    reason: str
    lost_to: Optional[str] = None


# ── Response schemas ────────────────────────────────────────────


class ProspectResponse(_ProspectBase):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    linkedin_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    status: str
    lead_source: str
    source_detail: Optional[str] = None
    estimated_aum: Optional[float] = None
    annual_income: Optional[float] = None
    net_worth: Optional[float] = None
    risk_tolerance: Optional[str] = None
    investment_goals: Optional[List[str]] = None
    time_horizon: Optional[str] = None
    interested_services: Optional[List[str]] = None
    lead_score: int
    fit_score: int
    intent_score: int
    engagement_score: int
    next_action_date: Optional[str] = None
    next_action_type: Optional[str] = None
    next_action_notes: Optional[str] = None
    days_in_stage: int
    total_days_in_pipeline: int
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    ai_summary: Optional[str] = None
    converted_at: Optional[str] = None
    lost_reason: Optional[str] = None
    created_at: str


class ProspectListResponse(BaseModel):
    prospects: List[ProspectResponse]
    total: int
    page: int
    page_size: int


class ActivityResponse(_ProspectBase):
    id: str
    prospect_id: str
    activity_type: str
    subject: Optional[str] = None
    description: Optional[str] = None
    activity_date: str
    duration_minutes: Optional[int] = None
    call_outcome: Optional[str] = None
    call_direction: Optional[str] = None
    email_status: Optional[str] = None
    meeting_outcome: Optional[str] = None
    task_due_date: Optional[str] = None
    task_completed: bool
    status_before: Optional[str] = None
    status_after: Optional[str] = None
    is_automated: bool
    created_at: str


class ProposalResponse(_ProspectBase):
    id: str
    prospect_id: str
    title: str
    proposal_number: Optional[str] = None
    version: int
    status: str
    executive_summary: Optional[str] = None
    investment_philosophy: Optional[str] = None
    proposed_strategy: Optional[str] = None
    fee_structure: Optional[str] = None
    proposed_aum: Optional[float] = None
    proposed_fee_percent: Optional[float] = None
    estimated_annual_fee: Optional[float] = None
    risk_profile: Optional[str] = None
    risk_assessment: Optional[str] = None
    valid_until: Optional[str] = None
    is_ai_generated: bool
    ai_confidence_score: Optional[float] = None
    sent_at: Optional[str] = None
    viewed_at: Optional[str] = None
    view_count: int
    document_url: Optional[str] = None
    created_at: str


class PipelineSummaryResponse(BaseModel):
    stages: Dict[str, Dict[str, Any]]
    total_prospects: int
    total_pipeline_value: float


class ConversionMetricsResponse(BaseModel):
    period_days: int
    total_created: int
    won: int
    lost: int
    conversion_rate: float
    in_progress: int


class ScoreResponse(BaseModel):
    prospect_id: str
    lead_score: int
    fit_score: int
    intent_score: int
    engagement_score: int


# ============================================================================
# HELPERS
# ============================================================================


def _prospect_to_response(p: Any) -> ProspectResponse:
    """Convert a Prospect ORM object to a ProspectResponse."""
    return ProspectResponse(
        id=str(p.id),
        first_name=p.first_name,
        last_name=p.last_name,
        email=p.email,
        phone=p.phone,
        company=p.company,
        title=p.title,
        industry=p.industry,
        linkedin_url=p.linkedin_url,
        city=p.city,
        state=p.state,
        zip_code=p.zip_code,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        lead_source=p.lead_source.value if hasattr(p.lead_source, "value") else str(p.lead_source),
        source_detail=p.source_detail,
        estimated_aum=float(p.estimated_aum) if p.estimated_aum else None,
        annual_income=float(p.annual_income) if p.annual_income else None,
        net_worth=float(p.net_worth) if p.net_worth else None,
        risk_tolerance=p.risk_tolerance,
        investment_goals=p.investment_goals,
        time_horizon=p.time_horizon,
        interested_services=p.interested_services,
        lead_score=p.lead_score,
        fit_score=p.fit_score,
        intent_score=p.intent_score,
        engagement_score=p.engagement_score,
        next_action_date=p.next_action_date.isoformat() if p.next_action_date else None,
        next_action_type=p.next_action_type,
        next_action_notes=p.next_action_notes,
        days_in_stage=p.days_in_stage,
        total_days_in_pipeline=p.total_days_in_pipeline,
        tags=p.tags,
        notes=p.notes,
        ai_summary=p.ai_summary,
        converted_at=p.converted_at.isoformat() if p.converted_at else None,
        lost_reason=p.lost_reason,
        created_at=p.created_at.isoformat() if p.created_at else "",
    )


def _activity_to_response(a: Any) -> ActivityResponse:
    """Convert a ProspectActivity ORM object to an ActivityResponse."""
    return ActivityResponse(
        id=str(a.id),
        prospect_id=str(a.prospect_id),
        activity_type=a.activity_type.value if hasattr(a.activity_type, "value") else str(a.activity_type),
        subject=a.subject,
        description=a.description,
        activity_date=a.activity_date.isoformat() if a.activity_date else "",
        duration_minutes=a.duration_minutes,
        call_outcome=a.call_outcome,
        call_direction=a.call_direction,
        email_status=a.email_status,
        meeting_outcome=a.meeting_outcome,
        task_due_date=a.task_due_date.isoformat() if a.task_due_date else None,
        task_completed=a.task_completed,
        status_before=a.status_before,
        status_after=a.status_after,
        is_automated=a.is_automated,
        created_at=a.created_at.isoformat() if a.created_at else "",
    )


def _proposal_to_response(p: Any) -> ProposalResponse:
    """Convert a Proposal ORM object to a ProposalResponse."""
    return ProposalResponse(
        id=str(p.id),
        prospect_id=str(p.prospect_id),
        title=p.title,
        proposal_number=p.proposal_number,
        version=p.version,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        executive_summary=p.executive_summary,
        investment_philosophy=p.investment_philosophy,
        proposed_strategy=p.proposed_strategy,
        fee_structure=p.fee_structure,
        proposed_aum=float(p.proposed_aum) if p.proposed_aum else None,
        proposed_fee_percent=float(p.proposed_fee_percent) if p.proposed_fee_percent else None,
        estimated_annual_fee=float(p.estimated_annual_fee) if p.estimated_annual_fee else None,
        risk_profile=p.risk_profile,
        risk_assessment=p.risk_assessment,
        valid_until=p.valid_until.isoformat() if p.valid_until else None,
        is_ai_generated=p.is_ai_generated,
        ai_confidence_score=float(p.ai_confidence_score) if p.ai_confidence_score else None,
        sent_at=p.sent_at.isoformat() if p.sent_at else None,
        viewed_at=p.viewed_at.isoformat() if p.viewed_at else None,
        view_count=p.view_count,
        document_url=p.document_url,
        created_at=p.created_at.isoformat() if p.created_at else "",
    )


# ============================================================================
# ENDPOINTS – Prospect CRUD
# ============================================================================


@router.post("", response_model=ProspectResponse)
async def create_prospect(
    request: ProspectCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create a new prospect."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)

    data = request.model_dump()
    # Convert referred_by_client_id string to UUID if present
    if data.get("referred_by_client_id"):
        data["referred_by_client_id"] = UUID(data["referred_by_client_id"])

    prospect = await service.create_prospect(advisor_id, data)
    return _prospect_to_response(prospect)


@router.get("", response_model=ProspectListResponse)
async def list_prospects(
    status: Optional[str] = None,
    lead_source: Optional[str] = None,
    min_score: Optional[int] = None,
    search: Optional[str] = None,
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List prospects with filtering and pagination."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)

    prospects, total = await service.list_prospects(
        advisor_id=advisor_id,
        status=ProspectStatus(status) if status else None,
        lead_source=LeadSource(lead_source) if lead_source else None,
        min_score=min_score,
        search=search,
        tags=tags.split(",") if tags else None,
        page=page,
        page_size=page_size,
    )

    return ProspectListResponse(
        prospects=[_prospect_to_response(p) for p in prospects],
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# ENDPOINTS – Pipeline Analytics
# ============================================================================


@router.get("/pipeline/summary", response_model=PipelineSummaryResponse)
async def get_pipeline_summary(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get pipeline funnel summary grouped by stage."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    return await service.get_pipeline_summary(advisor_id)


@router.get("/pipeline/metrics", response_model=ConversionMetricsResponse)
async def get_conversion_metrics(
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get conversion rate metrics for a given period."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    return await service.get_conversion_metrics(advisor_id, days)


# ============================================================================
# ENDPOINTS – Pending Tasks (before /{prospect_id} to avoid route conflict)
# ============================================================================


@router.get("/tasks/pending")
async def get_pending_tasks(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get all pending tasks across prospects."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    tasks = await service.get_pending_tasks(advisor_id)
    return {
        "tasks": [_activity_to_response(t) for t in tasks],
        "total": len(tasks),
    }


# ============================================================================
# ENDPOINTS – Scoring (batch route before /{prospect_id})
# ============================================================================


@router.post("/score/all")
async def rescore_all(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Rescore all active prospects for the advisor."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    count = await service.scorer.score_all_prospects(advisor_id)
    return {"rescored": count}


# ============================================================================
# ENDPOINTS – Single Prospect (parameterised routes)
# ============================================================================


@router.get("/{prospect_id}", response_model=ProspectResponse)
async def get_prospect(
    prospect_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get a single prospect with details."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return _prospect_to_response(prospect)


@router.patch("/{prospect_id}", response_model=ProspectResponse)
async def update_prospect(
    prospect_id: UUID,
    request: ProspectUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update a prospect's fields."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")
    updated = await service.update_prospect(
        prospect_id, request.model_dump(exclude_none=True)
    )
    return _prospect_to_response(updated)


@router.delete("/{prospect_id}", status_code=204)
async def delete_prospect(
    prospect_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Delete a prospect and all related records."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")
    await service.delete_prospect(prospect_id)


# ============================================================================
# ENDPOINTS – Activities
# ============================================================================


@router.post("/{prospect_id}/activities", response_model=ActivityResponse)
async def log_activity(
    prospect_id: UUID,
    request: ActivityCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Log an interaction with a prospect."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")

    activity = await service.log_activity(
        prospect_id,
        advisor_id,
        ActivityType(request.activity_type),
        request.model_dump(),
    )
    return _activity_to_response(activity)


@router.get("/{prospect_id}/activities")
async def get_activities(
    prospect_id: UUID,
    activity_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get activities for a prospect."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")

    activities = await service.get_activities(
        prospect_id,
        ActivityType(activity_type) if activity_type else None,
        limit,
    )
    return {
        "activities": [_activity_to_response(a) for a in activities],
        "total": len(activities),
    }


# ============================================================================
# ENDPOINTS – Proposals
# ============================================================================


@router.post(
    "/{prospect_id}/proposals/generate", response_model=ProposalResponse
)
async def generate_proposal(
    prospect_id: UUID,
    request: ProposalGenerateRequest = ProposalGenerateRequest(),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Generate an AI-powered investment proposal."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")

    proposal = await service.generate_proposal(
        prospect_id, advisor_id, request.custom_params
    )
    return _proposal_to_response(proposal)


@router.get("/{prospect_id}/proposals")
async def get_proposals(
    prospect_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get proposals for a prospect."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")

    proposals = await service.get_proposals(prospect_id=prospect_id)
    return {
        "proposals": [_proposal_to_response(p) for p in proposals],
        "total": len(proposals),
    }


@router.patch("/proposals/{proposal_id}/status", response_model=ProposalResponse)
async def update_proposal_status(
    proposal_id: UUID,
    request: ProposalStatusUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update a proposal's status (sent, viewed, accepted, rejected, etc.)."""
    service = ProspectService(db)
    try:
        proposal = await service.update_proposal_status(
            proposal_id, ProposalStatus(request.status), request.notes
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return _proposal_to_response(proposal)


# ============================================================================
# ENDPOINTS – Conversion
# ============================================================================


@router.post("/{prospect_id}/convert", response_model=ProspectResponse)
async def convert_to_client(
    prospect_id: UUID,
    request: ConvertToClientRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Convert a prospect to a client."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")

    updated = await service.convert_to_client(
        prospect_id, UUID(request.client_id)
    )
    return _prospect_to_response(updated)


@router.post("/{prospect_id}/lost", response_model=ProspectResponse)
async def mark_lost(
    prospect_id: UUID,
    request: MarkLostRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark a prospect as lost."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")

    updated = await service.mark_lost(
        prospect_id, request.reason, request.lost_to
    )
    return _prospect_to_response(updated)


# ============================================================================
# ENDPOINTS – Scoring
# ============================================================================


@router.post("/{prospect_id}/score", response_model=ScoreResponse)
async def rescore_prospect(
    prospect_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Rescore a single prospect."""
    advisor_id = UUID(current_user["id"])
    service = ProspectService(db)
    prospect = await service.get_prospect(prospect_id)
    if not prospect or prospect.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Prospect not found")

    scored = await service.scorer.score_prospect(prospect_id)
    return ScoreResponse(
        prospect_id=str(scored.id),
        lead_score=scored.lead_score,
        fit_score=scored.fit_score,
        intent_score=scored.intent_score,
        engagement_score=scored.engagement_score,
    )
