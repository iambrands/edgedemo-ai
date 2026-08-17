"""B2C onboarding endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.models.client import Client
from backend.models.household import Household
from backend.models.user import User
from backend.services.b2c_onboarding import OnboardingService, RISK_QUESTIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/onboarding", tags=["b2c-onboarding"])


class RiskProfileRequest(BaseModel):
    answers: dict[str, int]


@router.get("/risk-profile/questions")
async def get_risk_questions():
    """Return risk profile questionnaire."""
    return {"questions": RISK_QUESTIONS}


@router.post("/risk-profile")
async def submit_risk_profile(
    req: RiskProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Process risk answers and persist suitability fields to the B2C client."""
    svc = OnboardingService()
    result = svc.process_risk_profile(req.answers)

    if not current_user.client_id:
        raise HTTPException(status_code=400, detail="Current user is not linked to a client profile")

    client_result = await db.execute(select(Client).where(Client.id == current_user.client_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client profile not found")

    client.risk_tolerance = result.risk_tolerance
    client.investment_objective = result.investment_objective
    client.investment_timeline = result.time_horizon
    client.investment_experience = result.sophistication_level
    current_user.risk_profile_completed = True

    if current_user.household_id:
        household_result = await db.execute(select(Household).where(Household.id == current_user.household_id))
        household = household_result.scalar_one_or_none()
        if household:
            household.risk_tolerance = result.risk_tolerance

    return {
        "risk_tolerance": result.risk_tolerance,
        "risk_score": result.risk_score,
        "target_allocation": {k: str(v) for k, v in result.target_allocation.items()},
        "investment_objective": result.investment_objective,
        "time_horizon": result.time_horizon,
        "sophistication_level": result.sophistication_level,
        "risk_profile_completed": current_user.risk_profile_completed,
    }
