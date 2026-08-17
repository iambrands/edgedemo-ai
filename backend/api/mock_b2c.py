"""Mock B2C endpoints when DATABASE_URL is not configured."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

try:
    from backend.services.b2c_onboarding import OnboardingService, RISK_QUESTIONS
except ImportError:
    from services.b2c_onboarding import OnboardingService, RISK_QUESTIONS

router = APIRouter(prefix="/api/v1/b2c", tags=["b2c-mock"])
_security = HTTPBearer(auto_error=False)


def require_mock_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
) -> str:
    """Require a bearer token for protected mock B2C endpoints."""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return credentials.credentials

MOCK_ME = {
    "id": "00000000-0000-4000-8000-000000000001",
    "email": "demo.client@firmum.ai",
    "user_type": "b2c_retail",
    "subscription_tier": "free",
    "onboarding_completed": False,
    "risk_profile_completed": False,
    "management_mode": "diy",
    "advisor_connection_status": "none",
    "mock": True,
}


@router.get("/me")
async def mock_b2c_me(_: str = Depends(require_mock_auth)):
    """Demo profile when B2C DB routes are unavailable."""
    return MOCK_ME


@router.post("/register")
async def mock_b2c_register():
    """Demo token response when B2C DB routes are unavailable."""
    return {
        "access_token": "mock-b2c-token",
        "refresh_token": "mock-b2c-refresh-token",
        "token_type": "bearer",
        "expires_in": 3600,
        "user_id": MOCK_ME["id"],
        "subscription_tier": "free",
        "mock": True,
    }


@router.post("/login")
async def mock_b2c_login():
    """Demo token response when B2C DB routes are unavailable."""
    return await mock_b2c_register()


@router.get("/onboarding/risk-profile/questions")
async def mock_risk_questions():
    """Return risk profile questionnaire for demo mode."""
    return {"questions": RISK_QUESTIONS}


@router.post("/onboarding/risk-profile")
async def mock_submit_risk_profile(body: dict, _: str = Depends(require_mock_auth)):
    """Score risk answers without persistence for demo mode."""
    svc = OnboardingService()
    result = svc.process_risk_profile(body.get("answers", {}))
    return {
        "risk_tolerance": result.risk_tolerance,
        "risk_score": result.risk_score,
        "target_allocation": {k: str(v) for k, v in result.target_allocation.items()},
        "investment_objective": result.investment_objective,
        "time_horizon": result.time_horizon,
        "sophistication_level": result.sophistication_level,
        "risk_profile_completed": True,
        "mock": True,
    }


@router.get("/dashboard")
async def mock_b2c_dashboard(_: str = Depends(require_mock_auth)):
    """Demo DIY dashboard payload when B2C DB routes are unavailable."""
    return {
        "total_aum": "0",
        "accounts": [],
        "allocation": [],
        "fee_impact_summary": None,
        "alerts": [
            {
                "type": "onboarding",
                "severity": "info",
                "message": "Upload your first investment statement to get started",
                "action": "upload_statement",
                "gated": False,
                "upgrade_tier": None,
            }
        ],
        "ai_chat_remaining": 10,
        "subscription_tier": "free",
        "mock": True,
    }


@router.post("/statements/{statement_id}/confirm")
async def mock_confirm_statement(statement_id: str, _: str = Depends(require_mock_auth)):
    """Demo statement confirmation in no-DB mode."""
    return {
        "status": "confirmed",
        "statementId": statement_id,
        "positionsCreated": 0,
        "persistedStatementId": None,
        "persistedAccountId": None,
        "mock": True,
    }
