"""B2C onboarding endpoints."""

import logging

from fastapi import APIRouter
from pydantic import BaseModel

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
async def submit_risk_profile(req: RiskProfileRequest):
    """Process risk profile answers, return suitability result."""
    svc = OnboardingService()
    result = svc.process_risk_profile(req.answers)
    return {
        "risk_tolerance": result.risk_tolerance,
        "risk_score": result.risk_score,
        "target_allocation": {k: str(v) for k, v in result.target_allocation.items()},
        "investment_objective": result.investment_objective,
        "time_horizon": result.time_horizon,
        "sophistication_level": result.sophistication_level,
    }
