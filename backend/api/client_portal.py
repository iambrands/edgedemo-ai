"""
Client Portal API endpoints.
Provides authenticated access for clients to view their portfolios, goals, and nudges.
"""

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db
from backend.models.account import Account
from backend.models.position import Position
from backend.models.portal import (
    ClientPortalUser, PortalNarrative, BehavioralNudge,
    NudgeStatus, ClientGoal, GoalType, PortalDocument, FirmWhiteLabel
)
from backend.models.client import Client
from backend.services.portal_auth_service import PortalAuthService
from backend.services.nudge_engine import NudgeEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/portal", tags=["Client Portal"])
security = HTTPBearer(auto_error=False)


# ============================================================================
# SCHEMAS
# ============================================================================

class PortalLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PortalLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    client_name: str
    firm_name: Optional[str] = None


class PortalRefreshRequest(BaseModel):
    refresh_token: str


class AccountSummary(BaseModel):
    id: str
    account_name: str
    account_type: str
    custodian: Optional[str] = None
    current_value: float
    tax_type: str


class DashboardResponse(BaseModel):
    client_name: str
    advisor_name: Optional[str] = None
    firm_name: Optional[str] = None
    total_value: float
    ytd_return: float
    ytd_return_dollar: float
    accounts: List[AccountSummary]
    pending_nudges: int
    unread_narratives: int
    active_goals: int
    last_updated: datetime


class GoalCreateRequest(BaseModel):
    goal_type: str
    name: str = Field(..., min_length=1, max_length=255)
    target_amount: float = Field(..., gt=0)
    target_date: datetime
    monthly_contribution: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class GoalUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    target_amount: Optional[float] = Field(None, gt=0)
    target_date: Optional[datetime] = None
    monthly_contribution: Optional[float] = Field(None, ge=0)
    current_amount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class GoalResponse(BaseModel):
    id: str
    goal_type: str
    name: str
    target_amount: float
    current_amount: float
    target_date: datetime
    monthly_contribution: Optional[float]
    progress_pct: float
    on_track: bool
    notes: Optional[str]
    created_at: datetime


class NudgeResponse(BaseModel):
    id: str
    nudge_type: str
    title: str
    message: str
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    priority: int
    status: str
    created_at: datetime


class NarrativeResponse(BaseModel):
    id: str
    narrative_type: str
    title: str
    content: str
    content_html: Optional[str]
    period_start: datetime
    period_end: datetime
    is_read: bool
    created_at: datetime


class DocumentResponse(BaseModel):
    id: str
    document_type: str
    title: str
    period: Optional[str]
    file_size: Optional[int]
    is_read: bool
    created_at: datetime


class BrandingConfigResponse(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#1a56db"
    secondary_color: str = "#7c3aed"
    accent_color: str = "#059669"
    font_family: str = "Inter"
    portal_title: Optional[str] = None
    footer_text: Optional[str] = None
    disclaimer_text: Optional[str] = None


class PreferencesUpdateRequest(BaseModel):
    email_narratives: Optional[bool] = None
    email_nudges: Optional[bool] = None
    email_documents: Optional[bool] = None


class PreferencesResponse(BaseModel):
    email_narratives: bool
    email_nudges: bool
    email_documents: bool


# ============================================================================
# AUTH DEPENDENCY
# ============================================================================

async def get_current_portal_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> ClientPortalUser:
    """Extract and validate portal JWT, return ClientPortalUser."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = PortalAuthService.verify_portal_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    auth_service = PortalAuthService(db)
    user = await auth_service.get_user_by_id(uuid.UUID(payload["sub"]))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@router.post("/auth/login", response_model=PortalLoginResponse)
async def portal_login(
    req: PortalLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate client portal user."""
    auth_service = PortalAuthService(db)

    try:
        token_response = await auth_service.login(
            PortalAuthService.PortalLoginRequest(email=req.email, password=req.password)
            if hasattr(PortalAuthService, 'PortalLoginRequest')
            else type('R', (), {'email': req.email, 'password': req.password})()
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Get client name
    user = await auth_service.get_user_by_id(uuid.UUID(token_response.user_id))
    client_name = "Client"
    firm_name = None

    if user:
        result = await db.execute(
            select(Client).where(Client.id == user.client_id)
        )
        client = result.scalar_one_or_none()
        if client:
            client_name = f"{client.first_name} {client.last_name}"

    return PortalLoginResponse(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        expires_in=token_response.expires_in,
        client_name=client_name,
        firm_name=firm_name,
    )


@router.post("/auth/refresh", response_model=PortalLoginResponse)
async def portal_refresh(
    req: PortalRefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh portal access token."""
    auth_service = PortalAuthService(db)

    try:
        token_response = await auth_service.refresh(req.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = await auth_service.get_user_by_id(uuid.UUID(token_response.user_id))
    client_name = "Client"

    if user:
        result = await db.execute(
            select(Client).where(Client.id == user.client_id)
        )
        client = result.scalar_one_or_none()
        if client:
            client_name = f"{client.first_name} {client.last_name}"

    return PortalLoginResponse(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        expires_in=token_response.expires_in,
        client_name=client_name,
    )


@router.post("/auth/logout")
async def portal_logout(
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Logout portal user (client-side should discard tokens)."""
    return {"message": "Logged out successfully"}


# ============================================================================
# DASHBOARD
# ============================================================================

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Get client portal dashboard summary."""
    # Get client info
    client_result = await db.execute(
        select(Client).where(Client.id == user.client_id)
    )
    client = client_result.scalar_one_or_none()
    client_name = f"{client.first_name} {client.last_name}" if client else "Client"

    # Get accounts and calculate totals
    accounts_result = await db.execute(
        select(Account).where(Account.client_id == user.client_id)
    )
    accounts = list(accounts_result.scalars().all())

    total_value = Decimal("0")
    account_summaries = []

    for account in accounts:
        # Sum position values for this account
        positions_result = await db.execute(
            select(func.sum(Position.market_value)).where(
                Position.account_id == account.id
            )
        )
        account_value = positions_result.scalar() or Decimal("0")
        total_value += account_value

        account_summaries.append(AccountSummary(
            id=str(account.id),
            account_name=account.account_number_masked or f"Account ...{str(account.id)[-4:]}",
            account_type=account.account_type,
            custodian=account.custodian,
            current_value=float(account_value),
            tax_type=account.tax_type,
        ))

    # Count pending nudges
    nudges_result = await db.execute(
        select(func.count()).select_from(BehavioralNudge).where(
            BehavioralNudge.portal_user_id == user.id,
            BehavioralNudge.status.in_([NudgeStatus.PENDING, NudgeStatus.DELIVERED])
        )
    )
    pending_nudges = nudges_result.scalar() or 0

    # Count unread narratives
    narratives_result = await db.execute(
        select(func.count()).select_from(PortalNarrative).where(
            PortalNarrative.portal_user_id == user.id,
            PortalNarrative.is_read == False
        )
    )
    unread_narratives = narratives_result.scalar() or 0

    # Count active goals
    goals_result = await db.execute(
        select(func.count()).select_from(ClientGoal).where(
            ClientGoal.portal_user_id == user.id,
            ClientGoal.is_active == True
        )
    )
    active_goals = goals_result.scalar() or 0

    # Calculate YTD return (placeholder - would need historical data)
    ytd_return_pct = 0.089  # 8.9% placeholder
    ytd_return_dollar = float(total_value) * ytd_return_pct

    return DashboardResponse(
        client_name=client_name,
        total_value=float(total_value),
        ytd_return=ytd_return_pct,
        ytd_return_dollar=ytd_return_dollar,
        accounts=account_summaries,
        pending_nudges=pending_nudges,
        unread_narratives=unread_narratives,
        active_goals=active_goals,
        last_updated=datetime.utcnow(),
    )


# ============================================================================
# GOALS
# ============================================================================

@router.get("/goals", response_model=List[GoalResponse])
async def get_goals(
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Get all active goals for the portal user."""
    result = await db.execute(
        select(ClientGoal).where(
            ClientGoal.portal_user_id == user.id,
            ClientGoal.is_active == True
        ).order_by(ClientGoal.target_date)
    )
    goals = list(result.scalars().all())

    responses = []
    for goal in goals:
        progress = (goal.current_amount / goal.target_amount) if goal.target_amount > 0 else 0

        # Calculate if on track
        months_remaining = max(1, (goal.target_date - datetime.utcnow()).days / 30)
        amount_needed = goal.target_amount - goal.current_amount
        monthly_needed = amount_needed / months_remaining
        on_track = (goal.monthly_contribution or 0) >= monthly_needed * 0.9

        responses.append(GoalResponse(
            id=str(goal.id),
            goal_type=goal.goal_type.value,
            name=goal.name,
            target_amount=goal.target_amount,
            current_amount=goal.current_amount,
            target_date=goal.target_date,
            monthly_contribution=goal.monthly_contribution,
            progress_pct=progress,
            on_track=on_track,
            notes=goal.notes,
            created_at=goal.created_at,
        ))

    return responses


@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    req: GoalCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Create a new financial goal."""
    try:
        goal_type = GoalType(req.goal_type)
    except ValueError:
        goal_type = GoalType.CUSTOM

    goal = ClientGoal(
        id=uuid.uuid4(),
        portal_user_id=user.id,
        goal_type=goal_type,
        name=req.name,
        target_amount=req.target_amount,
        current_amount=0,
        target_date=req.target_date,
        monthly_contribution=req.monthly_contribution,
        notes=req.notes,
    )
    db.add(goal)
    await db.flush()

    return GoalResponse(
        id=str(goal.id),
        goal_type=goal.goal_type.value,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=0,
        target_date=goal.target_date,
        monthly_contribution=goal.monthly_contribution,
        progress_pct=0,
        on_track=True,
        notes=goal.notes,
        created_at=goal.created_at,
    )


@router.patch("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    req: GoalUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Update an existing goal."""
    result = await db.execute(
        select(ClientGoal).where(
            ClientGoal.id == uuid.UUID(goal_id),
            ClientGoal.portal_user_id == user.id
        )
    )
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if req.name is not None:
        goal.name = req.name
    if req.target_amount is not None:
        goal.target_amount = req.target_amount
    if req.target_date is not None:
        goal.target_date = req.target_date
    if req.monthly_contribution is not None:
        goal.monthly_contribution = req.monthly_contribution
    if req.current_amount is not None:
        goal.current_amount = req.current_amount
    if req.notes is not None:
        goal.notes = req.notes

    await db.flush()

    progress = (goal.current_amount / goal.target_amount) if goal.target_amount > 0 else 0
    months_remaining = max(1, (goal.target_date - datetime.utcnow()).days / 30)
    amount_needed = goal.target_amount - goal.current_amount
    monthly_needed = amount_needed / months_remaining
    on_track = (goal.monthly_contribution or 0) >= monthly_needed * 0.9

    return GoalResponse(
        id=str(goal.id),
        goal_type=goal.goal_type.value,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        target_date=goal.target_date,
        monthly_contribution=goal.monthly_contribution,
        progress_pct=progress,
        on_track=on_track,
        notes=goal.notes,
        created_at=goal.created_at,
    )


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Soft delete a goal (mark as inactive)."""
    result = await db.execute(
        select(ClientGoal).where(
            ClientGoal.id == uuid.UUID(goal_id),
            ClientGoal.portal_user_id == user.id
        )
    )
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.is_active = False
    await db.flush()

    return {"ok": True, "message": "Goal deleted"}


# ============================================================================
# NUDGES
# ============================================================================

@router.get("/nudges", response_model=List[NudgeResponse])
async def get_nudges(
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Get active nudges for the portal user."""
    engine = NudgeEngine(db)
    nudges = await engine.get_active_nudges(user.id)

    # Mark as delivered
    for nudge in nudges:
        await engine.mark_delivered(nudge.id)

    return [NudgeResponse(
        id=str(n.id),
        nudge_type=n.nudge_type.value,
        title=n.title,
        message=n.message,
        action_url=n.action_url,
        action_label=n.action_label,
        priority=n.priority,
        status=n.status.value,
        created_at=n.created_at,
    ) for n in nudges]


@router.post("/nudges/{nudge_id}/view")
async def view_nudge(
    nudge_id: str,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Mark a nudge as viewed."""
    # Verify nudge belongs to user
    result = await db.execute(
        select(BehavioralNudge).where(
            BehavioralNudge.id == uuid.UUID(nudge_id),
            BehavioralNudge.portal_user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Nudge not found")

    engine = NudgeEngine(db)
    await engine.mark_viewed(uuid.UUID(nudge_id))

    return {"ok": True}


@router.post("/nudges/{nudge_id}/act")
async def act_on_nudge(
    nudge_id: str,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Mark a nudge as acted upon."""
    result = await db.execute(
        select(BehavioralNudge).where(
            BehavioralNudge.id == uuid.UUID(nudge_id),
            BehavioralNudge.portal_user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Nudge not found")

    engine = NudgeEngine(db)
    await engine.mark_acted(uuid.UUID(nudge_id))

    return {"ok": True}


@router.post("/nudges/{nudge_id}/dismiss")
async def dismiss_nudge(
    nudge_id: str,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Dismiss a nudge."""
    result = await db.execute(
        select(BehavioralNudge).where(
            BehavioralNudge.id == uuid.UUID(nudge_id),
            BehavioralNudge.portal_user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Nudge not found")

    engine = NudgeEngine(db)
    await engine.dismiss(uuid.UUID(nudge_id))

    return {"ok": True}


# ============================================================================
# NARRATIVES
# ============================================================================

@router.get("/narratives", response_model=List[NarrativeResponse])
async def get_narratives(
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user),
    limit: int = 10
):
    """Get narrative reports for the portal user."""
    result = await db.execute(
        select(PortalNarrative).where(
            PortalNarrative.portal_user_id == user.id
        ).order_by(PortalNarrative.created_at.desc()).limit(limit)
    )
    narratives = list(result.scalars().all())

    return [NarrativeResponse(
        id=str(n.id),
        narrative_type=n.narrative_type,
        title=n.title,
        content=n.content,
        content_html=n.content_html,
        period_start=n.period_start,
        period_end=n.period_end,
        is_read=n.is_read,
        created_at=n.created_at,
    ) for n in narratives]


@router.post("/narratives/{narrative_id}/read")
async def mark_narrative_read(
    narrative_id: str,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Mark a narrative as read."""
    result = await db.execute(
        select(PortalNarrative).where(
            PortalNarrative.id == uuid.UUID(narrative_id),
            PortalNarrative.portal_user_id == user.id
        )
    )
    narrative = result.scalar_one_or_none()

    if not narrative:
        raise HTTPException(status_code=404, detail="Narrative not found")

    narrative.is_read = True
    await db.flush()

    return {"ok": True}


# ============================================================================
# DOCUMENTS
# ============================================================================

@router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user),
    document_type: Optional[str] = None,
    limit: int = 20
):
    """Get documents for the portal user."""
    query = select(PortalDocument).where(
        PortalDocument.portal_user_id == user.id
    )

    if document_type:
        query = query.where(PortalDocument.document_type == document_type)

    query = query.order_by(PortalDocument.created_at.desc()).limit(limit)

    result = await db.execute(query)
    documents = list(result.scalars().all())

    return [DocumentResponse(
        id=str(d.id),
        document_type=d.document_type,
        title=d.title,
        period=d.period,
        file_size=d.file_size,
        is_read=d.is_read,
        created_at=d.created_at,
    ) for d in documents]


@router.post("/documents/{document_id}/read")
async def mark_document_read(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Mark a document as read."""
    result = await db.execute(
        select(PortalDocument).where(
            PortalDocument.id == uuid.UUID(document_id),
            PortalDocument.portal_user_id == user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_read = True
    await db.flush()

    return {"ok": True}


# ============================================================================
# BRANDING & PREFERENCES
# ============================================================================

@router.get("/config/branding", response_model=BrandingConfigResponse)
async def get_branding(
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Get white-label branding configuration for the user's firm."""
    if not user.firm_id:
        return BrandingConfigResponse()

    result = await db.execute(
        select(FirmWhiteLabel).where(FirmWhiteLabel.firm_id == user.firm_id)
    )
    config = result.scalar_one_or_none()

    if not config:
        return BrandingConfigResponse()

    return BrandingConfigResponse(
        logo_url=config.logo_url,
        primary_color=config.primary_color,
        secondary_color=config.secondary_color,
        accent_color=config.accent_color,
        font_family=config.font_family,
        portal_title=config.portal_title,
        footer_text=config.footer_text,
        disclaimer_text=config.disclaimer_text,
    )


@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences(
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Get email notification preferences."""
    return PreferencesResponse(
        email_narratives=user.email_narratives,
        email_nudges=user.email_nudges,
        email_documents=user.email_documents,
    )


@router.patch("/preferences", response_model=PreferencesResponse)
async def update_preferences(
    req: PreferencesUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: ClientPortalUser = Depends(get_current_portal_user)
):
    """Update email notification preferences."""
    auth_service = PortalAuthService(db)
    updated_user = await auth_service.update_email_preferences(
        user.id,
        email_narratives=req.email_narratives,
        email_nudges=req.email_nudges,
        email_documents=req.email_documents,
    )

    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    return PreferencesResponse(
        email_narratives=updated_user.email_narratives,
        email_nudges=updated_user.email_nudges,
        email_documents=updated_user.email_documents,
    )
