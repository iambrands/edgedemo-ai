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
        "fee_benchmarks": [
            {"label": "Your portfolio (estimated)", "rate_pct": "0", "annual_cost_at_aum": "0"},
            {"label": "Robo-advisor average", "rate_pct": "0.25", "annual_cost_at_aum": "0"},
            {"label": "Traditional advisor average", "rate_pct": "1.00", "annual_cost_at_aum": "0"},
        ],
        "net_worth_history": [],
        "risk_profile": None,
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


@router.post("/planning/retirement")
async def mock_retirement_plan(_: dict, __: str = Depends(require_mock_auth)):
    """Demo Monte Carlo response when B2C DB routes are unavailable."""
    years = 45
    path = [100000 + i * 8000 for i in range(years + 1)]
    return {
        "success_rate": 78.5,
        "simulations": 1000,
        "median_ending_balance": 850000,
        "p10_ending": 420000,
        "p90_ending": 1400000,
        "percentile_paths": {
            "p10": path,
            "p25": path,
            "p50": path,
            "p75": path,
            "p90": path,
        },
        "total_years": years,
        "disclaimer": "Educational projection only — not personalized investment advice.",
        "mock": True,
    }


@router.get("/subscription/config")
async def mock_stripe_config():
    """Return Stripe config status in mock/no-DB mode."""
    return {
        "stripe_configured": False,
        "prices": {
            "starter_monthly": False,
            "pro_monthly": False,
            "premium_monthly": False,
            "starter_annual": False,
            "pro_annual": False,
            "premium_annual": False,
        },
        "mock": True,
    }


@router.get("/subscription")
async def mock_subscription_status(_: str = Depends(require_mock_auth)):
    """Return subscription status in mock/no-DB mode."""
    return {
        "tier": "free",
        "active": False,
        "trial_end": None,
        "cancel_at_period_end": False,
        "mock": True,
    }


@router.post("/subscription/upgrade")
async def mock_subscription_upgrade(_: str = Depends(require_mock_auth)):
    """Return a mock checkout URL — Stripe is not configured in no-DB mode."""
    return {
        "checkout_url": "/client/upgrade?mock=true&msg=Stripe+not+configured",
        "session_id": "cs_mock_00000",
        "mock": True,
    }


@router.post("/plaid/link-token")
async def mock_plaid_link_token(_: str = Depends(require_mock_auth)):
    """Return a mock Plaid Link token in no-DB mode."""
    return {
        "link_token": "link-sandbox-mock-00000000",
        "expiration": "2099-01-01T00:00:00Z",
        "mock": True,
    }


@router.post("/plaid/exchange")
async def mock_plaid_exchange(_: dict, __: str = Depends(require_mock_auth)):
    """Return mock linked accounts in no-DB mode."""
    return {
        "item_id": "mock-item-00000001",
        "plaid_item_id": "mock-plaid-item-00000001",
        "institution_name": "Demo Bank",
        "accounts": [
            {
                "account_id": "acc-mock-000001",
                "name": "Demo Brokerage",
                "type": "investment",
                "balance": 125000.0,
            }
        ],
        "mock": True,
    }


@router.get("/plaid/accounts")
async def mock_plaid_accounts(_: str = Depends(require_mock_auth)):
    """Return mock linked institutions in no-DB mode."""
    return {"items": [], "mock": True}


@router.get("/planning/tiers")
async def mock_planning_tiers():
    """Public tier list for upgrade/marketing in no-DB mode."""
    try:
        from backend.services.tier_catalog import B2C_TIERS, format_limit
    except ImportError:
        from services.tier_catalog import B2C_TIERS, format_limit

    out = []
    for tier_id, cfg in B2C_TIERS.items():
        if tier_id == "free":
            continue
        out.append({
            "id": tier_id,
            "name": cfg["display_name"],
            "price_monthly_cents": cfg["price_monthly_cents"],
            "price_annual_cents": cfg["price_annual_cents"],
            "features": {
                "statement_uploads": format_limit(cfg["statement_uploads_per_month"]),
                "ai_chat": format_limit(cfg["ai_chat_messages_per_month"]),
                "retirement_planner": cfg.get("retirement_planner", False),
                "advisor_connect": cfg.get("advisor_connect", False),
            },
        })
    return {"tiers": out, "mock": True}
