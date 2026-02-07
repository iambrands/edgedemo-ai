"""
RIA onboarding wizard endpoints.
Tracks advisor setup progress through the multi-step wizard.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from uuid import uuid4
from datetime import datetime

router = APIRouter(prefix="/api/v1/ria-onboarding", tags=["RIA Onboarding"])

# In-memory store (replace with DB in production)
_SESSIONS: Dict[str, dict] = {}

STEP_ORDER = ["welcome", "profile", "firm", "compliance", "custodians", "branding", "billing"]


class OnboardingStatusResponse(BaseModel):
    session_id: str
    status: str
    current_step: str
    completed_steps: List[str]
    progress_percent: int


class StepDataRequest(BaseModel):
    step: str
    data: Dict[str, Any]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/start", response_model=OnboardingStatusResponse)
async def start_ria_onboarding():
    """Start a new RIA onboarding session."""
    session_id = str(uuid4())
    session = {
        "session_id": session_id,
        "status": "in_progress",
        "current_step": "welcome",
        "completed_steps": [],
        "step_data": {},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    _SESSIONS[session_id] = session
    return OnboardingStatusResponse(
        session_id=session_id,
        status="in_progress",
        current_step="welcome",
        completed_steps=[],
        progress_percent=0,
    )


@router.get("/{session_id}", response_model=OnboardingStatusResponse)
async def get_ria_onboarding_status(session_id: str):
    """Get current RIA onboarding status and progress."""
    session = _SESSIONS.get(session_id)
    if not session:
        return OnboardingStatusResponse(
            session_id=session_id,
            status="not_found",
            current_step="welcome",
            completed_steps=[],
            progress_percent=0,
        )
    completed = session.get("completed_steps", [])
    progress = round(len(completed) / len(STEP_ORDER) * 100)
    return OnboardingStatusResponse(
        session_id=session_id,
        status=session["status"],
        current_step=session["current_step"],
        completed_steps=completed,
        progress_percent=progress,
    )


@router.post("/{session_id}/step")
async def save_ria_step_data(session_id: str, request: StepDataRequest):
    """Save data for a specific onboarding step."""
    session = _SESSIONS.get(session_id)
    if not session:
        return {"error": "Session not found"}

    session["step_data"][request.step] = request.data
    if request.step not in session["completed_steps"]:
        session["completed_steps"].append(request.step)

    # Advance current_step to the next incomplete step
    for s in STEP_ORDER:
        if s not in session["completed_steps"]:
            session["current_step"] = s
            break
    else:
        session["current_step"] = "complete"

    session["updated_at"] = datetime.utcnow().isoformat()

    completed = session["completed_steps"]
    progress = round(len(completed) / len(STEP_ORDER) * 100)
    return {
        "session_id": session_id,
        "step_saved": request.step,
        "current_step": session["current_step"],
        "completed_steps": completed,
        "progress_percent": progress,
    }


@router.post("/{session_id}/complete")
async def complete_ria_onboarding(session_id: str):
    """Mark onboarding as complete."""
    session = _SESSIONS.get(session_id)
    if not session:
        return {"error": "Session not found"}

    session["status"] = "completed"
    session["completed_at"] = datetime.utcnow().isoformat()
    session["updated_at"] = datetime.utcnow().isoformat()
    return {"session_id": session_id, "status": "completed"}


@router.post("/{session_id}/skip")
async def skip_ria_onboarding(session_id: str):
    """Allow advisor to skip onboarding (can resume later)."""
    session = _SESSIONS.get(session_id)
    if not session:
        return {"error": "Session not found"}

    session["status"] = "skipped"
    session["updated_at"] = datetime.utcnow().isoformat()
    return {"session_id": session_id, "status": "skipped"}
