"""B2C household sharing endpoints (in-memory store — demo mode)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from backend.api.dependencies import get_current_user
from backend.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/household", tags=["b2c-household"])

# Per-user pending invites: {user_id: [email, ...]}
_pending_invites: dict[str, list[str]] = {}


class HouseholdInviteRequest(BaseModel):
    email: EmailStr


def _require_b2c_user(user: User) -> None:
    user_type = str(getattr(user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")


def _demo_members() -> list[dict]:
    return [
        {
            "id": "member-001",
            "name": "Alex Morgan",
            "email": "demo.client@firmum.ai",
            "role": "owner",
            "net_worth": 125000,
        },
        {
            "id": "member-002",
            "name": "Jordan Morgan",
            "email": "jordan.morgan@example.com",
            "role": "partner",
            "net_worth": 87000,
        },
    ]


def _demo_joint_goals() -> list[dict]:
    return [
        {
            "id": "hgoal-001",
            "name": "Joint Retirement Fund",
            "target_amount": 2000000,
            "current_amount": 212000,
            "progress_pct": 10.6,
            "target_date": "2045-12-31",
        },
        {
            "id": "hgoal-002",
            "name": "Vacation Home Down Payment",
            "target_amount": 150000,
            "current_amount": 42000,
            "progress_pct": 28.0,
            "target_date": "2029-06-30",
        },
    ]


@router.get("/members")
async def get_members(current_user: User = Depends(get_current_user)):
    """Return household members for the authenticated B2C user."""
    _require_b2c_user(current_user)
    uid = str(current_user.id)
    pending = _pending_invites.get(uid, [])
    return {
        "members": _demo_members(),
        "pending_invites": pending,
    }


@router.get("/combined-net-worth")
async def get_combined_net_worth(current_user: User = Depends(get_current_user)):
    """Return combined net worth across household members."""
    _require_b2c_user(current_user)
    members = _demo_members()
    combined = sum(m["net_worth"] for m in members)
    return {
        "combined_net_worth": combined,
        "member_count": len(members),
        "members": [
            {"name": m["name"], "net_worth": m["net_worth"]} for m in members
        ],
        "joint_goals": _demo_joint_goals(),
    }


@router.post("/invite")
async def invite_member(
    body: HouseholdInviteRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a household invite to a partner email (demo — no email sent)."""
    _require_b2c_user(current_user)

    email = body.email.lower().strip()
    if email == (current_user.email or "").lower():
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    uid = str(current_user.id)
    invites = _pending_invites.setdefault(uid, [])
    if email in invites:
        return {"status": "already_pending", "email": email}

    invites.append(email)
    logger.info("Household invite queued for user %s → %s (demo)", uid, email)
    return {"status": "invited", "email": email}
