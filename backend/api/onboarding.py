"""
Client onboarding wizard endpoints.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
from datetime import datetime

router = APIRouter(prefix="/api/v1/onboarding", tags=["Onboarding"])

SESSIONS = {}


@router.post("/start")
async def start_onboarding():
    """Start a new onboarding session."""
    session_id = str(uuid4())
    session = {
        "session_id": session_id,
        "current_step": 1,
        "total_steps": 8,
        "status": "in_progress",
        "created_at": datetime.now().isoformat(),
        "steps_completed": [],
    }
    SESSIONS[session_id] = session
    return session


@router.post("/{session_id}/step/{step_number}")
async def save_step(session_id: str, step_number: int, data: dict):
    """Save data for a specific onboarding step."""
    if session_id not in SESSIONS:
        return {"error": "Session not found"}
    session = SESSIONS[session_id]
    step_names = {
        1: "client_info",
        2: "financial_profile",
        3: "risk_assessment",
        4: "account_setup",
        5: "statement_upload",
        6: "portfolio_recommendation",
        7: "ips_generation",
        8: "review_and_sign",
    }
    step_name = step_names.get(step_number, f"step_{step_number}")
    session[step_name] = data
    session["current_step"] = min(step_number + 1, 8)
    session.setdefault("steps_completed", []).append(step_number)
    if step_number == 8:
        session["status"] = "completed"
    return {"session_id": session_id, "step_saved": step_number, "step_name": step_name, "current_step": session["current_step"], "status": session["status"]}


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get current onboarding session state."""
    if session_id not in SESSIONS:
        return {"error": "Session not found"}
    return SESSIONS[session_id]


@router.get("/active/list")
async def list_active_sessions():
    """List all active (in-progress) onboarding sessions."""
    active = [s for s in SESSIONS.values() if s.get("status") == "in_progress"]
    return {"sessions": active, "count": len(active)}
