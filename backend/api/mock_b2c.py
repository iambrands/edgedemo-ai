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
    "risk_profile_completed": True,
    "management_mode": "diy",
    "advisor_connection_status": "none",
    "mock": True,
    "demo_mode": True,
}

# Realistic first-run dashboard — avoids $0 empty state for new DIY users in no-DB mode.
DEMO_TOTAL_AUM = "125000"

DEMO_ACCOUNTS = [
    {
        "id": "acc-demo-001",
        "custodian": "Chase",
        "account_type": "Checking",
        "total_value": "12450",
        "last_statement_date": "2026-07-31",
    },
    {
        "id": "acc-demo-002",
        "custodian": "Fidelity",
        "account_type": "Brokerage",
        "total_value": "78320",
        "last_statement_date": "2026-07-31",
    },
    {
        "id": "acc-demo-003",
        "custodian": "Vanguard",
        "account_type": "401(k)",
        "total_value": "34230",
        "last_statement_date": "2026-07-31",
    },
]

DEMO_ALLOCATION = [
    {"asset_class": "US Equity", "pct": "55.0", "value": "68750"},
    {"asset_class": "International Equity", "pct": "15.0", "value": "18750"},
    {"asset_class": "Fixed Income", "pct": "20.0", "value": "25000"},
    {"asset_class": "Cash & Equivalents", "pct": "10.0", "value": "12500"},
]

DEMO_FEE_IMPACT = {
    "annual_cost": "812",
    "ten_year_impact": "10150",
    "thirty_year_impact": "42000",
    "potential_savings": "438",
    "highest_fee_account": "Fidelity Brokerage",
    "highest_fee_rate": "0.65",
    "effective_fee_rate_pct": "0.65",
}

DEMO_FEE_BENCHMARKS = [
    {"label": "Your portfolio (estimated)", "rate_pct": "0.65", "annual_cost_at_aum": "812"},
    {"label": "Robo-advisor average", "rate_pct": "0.25", "annual_cost_at_aum": "312"},
    {"label": "Traditional advisor average", "rate_pct": "1.00", "annual_cost_at_aum": "1250"},
]

DEMO_RISK_PROFILE = {
    "risk_number": 62,
    "risk_tolerance": "moderate",
    "label": "Moderate growth",
}

DEMO_NET_WORTH_HISTORY = [
    {"date": "2025-08-31", "value": "105200"},
    {"date": "2025-09-30", "value": "107800"},
    {"date": "2025-10-31", "value": "110400"},
    {"date": "2025-11-30", "value": "112900"},
    {"date": "2025-12-31", "value": "115600"},
    {"date": "2026-01-31", "value": "117200"},
    {"date": "2026-02-28", "value": "118900"},
    {"date": "2026-03-31", "value": "120100"},
    {"date": "2026-04-30", "value": "121400"},
    {"date": "2026-05-31", "value": "122600"},
    {"date": "2026-06-30", "value": "123800"},
    {"date": "2026-07-31", "value": "125000"},
]

DEMO_DASHBOARD_ALERTS = [
    {
        "type": "fee_savings",
        "severity": "info",
        "message": "You could save about $438/yr vs a traditional 1% advisor fee at your current balance.",
        "action": "view_fee_analyzer",
        "gated": False,
        "upgrade_tier": None,
    },
    {
        "type": "goal",
        "severity": "info",
        "message": "Set your first goal to track progress toward retirement or a major purchase.",
        "action": "set_goal",
        "gated": False,
        "upgrade_tier": None,
    },
]

DEMO_PLAID_ITEMS = [
    {
        "item_id": "mock-item-demo-001",
        "plaid_item_id": "mock-plaid-item-demo-001",
        "institution_name": "Chase",
        "status": "active",
        "accounts": [
            {
                "account_id": "acc-demo-001",
                "name": "Chase Total Checking",
                "type": "depository",
                "subtype": "checking",
                "balance": 12450.0,
            },
        ],
    },
    {
        "item_id": "mock-item-demo-002",
        "plaid_item_id": "mock-plaid-item-demo-002",
        "institution_name": "Fidelity",
        "status": "active",
        "accounts": [
            {
                "account_id": "acc-demo-002",
                "name": "Fidelity Brokerage",
                "type": "investment",
                "subtype": "brokerage",
                "balance": 78320.0,
            },
        ],
    },
    {
        "item_id": "mock-item-demo-003",
        "plaid_item_id": "mock-plaid-item-demo-003",
        "institution_name": "Vanguard",
        "status": "active",
        "accounts": [
            {
                "account_id": "acc-demo-003",
                "name": "Vanguard 401(k)",
                "type": "investment",
                "subtype": "401k",
                "balance": 34230.0,
            },
        ],
    },
]


DEMO_GOALS = [
    {
        "id": "goal-demo-001",
        "goal_type": "retirement",
        "name": "Retire by 2040",
        "target_amount": 1200000,
        "current_amount": 125000,
        "target_date": "2040-12-31",
        "monthly_contribution": 1500,
        "progress_pct": 10.4,
        "on_track": True,
        "notes": None,
    },
    {
        "id": "goal-demo-002",
        "goal_type": "emergency_fund",
        "name": "Emergency Fund",
        "target_amount": 24000,
        "current_amount": 18000,
        "target_date": "2027-06-30",
        "monthly_contribution": 500,
        "progress_pct": 75.0,
        "on_track": True,
        "notes": None,
    },
    {
        "id": "goal-demo-003",
        "goal_type": "vacation",
        "name": "Europe Trip",
        "target_amount": 8000,
        "current_amount": 2400,
        "target_date": "2027-03-31",
        "monthly_contribution": 200,
        "progress_pct": 30.0,
        "on_track": False,
        "notes": "Summer 2027 — France and Italy",
    },
]


@router.get("/goals")
async def mock_b2c_goals(_: str = Depends(require_mock_auth)):
    """Demo goals list in no-DB mode."""
    return {"goals": DEMO_GOALS, "mock": True}


@router.post("/goals")
async def mock_create_goal(body: dict, _: str = Depends(require_mock_auth)):
    """Accept a new goal and return it with a mock ID (no persistence)."""
    import time
    target = float(body.get("target_amount", 0))
    return {
        "id": f"goal-new-{int(time.time())}",
        "goal_type": body.get("goal_type", "custom"),
        "name": body.get("name", "New Goal"),
        "target_amount": target,
        "current_amount": 0,
        "target_date": body.get("target_date", ""),
        "monthly_contribution": body.get("monthly_contribution"),
        "progress_pct": 0.0,
        "on_track": True,
        "notes": body.get("notes"),
        "mock": True,
    }


@router.delete("/goals/{goal_id}")
async def mock_delete_goal(goal_id: str, _: str = Depends(require_mock_auth)):
    """Accept a delete request (no-op in mock mode)."""
    return {"status": "deleted", "goal_id": goal_id, "mock": True}


_BUDGET_CAT_LABELS: dict[str, str] = {
    "groceries": "Groceries",
    "dining": "Dining",
    "transport": "Transport",
    "entertainment": "Entertainment",
    "shopping": "Shopping",
    "utilities": "Utilities",
    "health": "Health & Fitness",
}
_BUDGET_DEFAULTS: dict[str, float] = {
    "groceries": 500.0,
    "dining": 200.0,
    "transport": 250.0,
    "entertainment": 100.0,
    "shopping": 300.0,
    "utilities": 350.0,
    "health": 100.0,
}


DEMO_TRANSACTIONS = [
    # ── Groceries ──────────────────────────────────────────────────────────────
    {"id": "txn-001", "date": "2026-08-15", "merchant": "Whole Foods Market",   "amount": 127.43, "category": "groceries",    "account": "Chase Checking", "pending": False},
    {"id": "txn-002", "date": "2026-08-12", "merchant": "H-E-B",                "amount":  89.22, "category": "groceries",    "account": "Chase Checking", "pending": False},
    {"id": "txn-003", "date": "2026-08-08", "merchant": "Trader Joe's",          "amount":  56.18, "category": "groceries",    "account": "Chase Checking", "pending": False},
    {"id": "txn-004", "date": "2026-08-04", "merchant": "Costco",                "amount": 234.67, "category": "groceries",    "account": "Chase Checking", "pending": False},
    {"id": "txn-005", "date": "2026-08-01", "merchant": "Whole Foods Market",   "amount": 112.99, "category": "groceries",    "account": "Chase Checking", "pending": False},
    # ── Dining ─────────────────────────────────────────────────────────────────
    {"id": "txn-006", "date": "2026-08-16", "merchant": "Starbucks",             "amount":   7.45, "category": "dining",       "account": "Chase Checking", "pending": True},
    {"id": "txn-007", "date": "2026-08-14", "merchant": "Chipotle Mexican Grill","amount":  18.75, "category": "dining",       "account": "Chase Checking", "pending": False},
    {"id": "txn-008", "date": "2026-08-11", "merchant": "Torchy's Tacos",        "amount":  34.20, "category": "dining",       "account": "Chase Checking", "pending": False},
    {"id": "txn-009", "date": "2026-08-09", "merchant": "Starbucks",             "amount":   8.15, "category": "dining",       "account": "Chase Checking", "pending": False},
    {"id": "txn-010", "date": "2026-08-07", "merchant": "Sushi Zushi",           "amount":  67.80, "category": "dining",       "account": "Chase Checking", "pending": False},
    {"id": "txn-011", "date": "2026-08-04", "merchant": "McDonald's",            "amount":  12.35, "category": "dining",       "account": "Chase Checking", "pending": False},
    {"id": "txn-012", "date": "2026-08-02", "merchant": "Local Italian",         "amount":  89.60, "category": "dining",       "account": "Chase Checking", "pending": False},
    # ── Transport ──────────────────────────────────────────────────────────────
    {"id": "txn-013", "date": "2026-08-15", "merchant": "Uber",                  "amount":  23.40, "category": "transport",    "account": "Chase Checking", "pending": False},
    {"id": "txn-014", "date": "2026-08-13", "merchant": "Shell Gas Station",     "amount":  68.75, "category": "transport",    "account": "Chase Checking", "pending": False},
    {"id": "txn-015", "date": "2026-08-10", "merchant": "Lyft",                  "amount":  16.50, "category": "transport",    "account": "Chase Checking", "pending": False},
    {"id": "txn-016", "date": "2026-08-06", "merchant": "ExxonMobil",            "amount":  71.20, "category": "transport",    "account": "Chase Checking", "pending": False},
    {"id": "txn-017", "date": "2026-08-03", "merchant": "Uber",                  "amount":  31.80, "category": "transport",    "account": "Chase Checking", "pending": False},
    # ── Entertainment ──────────────────────────────────────────────────────────
    {"id": "txn-018", "date": "2026-08-12", "merchant": "Netflix",               "amount":  22.99, "category": "entertainment","account": "Chase Checking", "pending": False},
    {"id": "txn-019", "date": "2026-08-11", "merchant": "Spotify",               "amount":  10.99, "category": "entertainment","account": "Chase Checking", "pending": False},
    {"id": "txn-020", "date": "2026-08-10", "merchant": "Amazon Prime",          "amount":  14.99, "category": "entertainment","account": "Chase Checking", "pending": False},
    {"id": "txn-021", "date": "2026-08-05", "merchant": "Xbox Game Pass",        "amount":  14.99, "category": "entertainment","account": "Chase Checking", "pending": False},
    # ── Utilities ──────────────────────────────────────────────────────────────
    {"id": "txn-022", "date": "2026-08-01", "merchant": "AT&T Wireless",         "amount":  85.00, "category": "utilities",    "account": "Chase Checking", "pending": False},
    {"id": "txn-023", "date": "2026-08-01", "merchant": "Austin Energy",         "amount": 142.30, "category": "utilities",    "account": "Chase Checking", "pending": False},
    {"id": "txn-024", "date": "2026-08-01", "merchant": "Google One Storage",    "amount":   2.99, "category": "utilities",    "account": "Chase Checking", "pending": False},
    {"id": "txn-025", "date": "2026-08-01", "merchant": "Internet Service",      "amount":  69.99, "category": "utilities",    "account": "Chase Checking", "pending": False},
    # ── Shopping ───────────────────────────────────────────────────────────────
    {"id": "txn-026", "date": "2026-08-14", "merchant": "Amazon",                "amount": 156.78, "category": "shopping",     "account": "Chase Checking", "pending": False},
    {"id": "txn-027", "date": "2026-08-11", "merchant": "Target",                "amount":  89.45, "category": "shopping",     "account": "Chase Checking", "pending": False},
    {"id": "txn-028", "date": "2026-08-08", "merchant": "Best Buy",              "amount": 299.99, "category": "shopping",     "account": "Chase Checking", "pending": False},
    {"id": "txn-029", "date": "2026-08-06", "merchant": "Amazon",                "amount":  43.22, "category": "shopping",     "account": "Chase Checking", "pending": False},
    {"id": "txn-030", "date": "2026-08-03", "merchant": "Nordstrom Rack",        "amount": 178.50, "category": "shopping",     "account": "Chase Checking", "pending": False},
    # ── Health & Fitness ───────────────────────────────────────────────────────
    {"id": "txn-031", "date": "2026-08-13", "merchant": "Planet Fitness",        "amount":  24.99, "category": "health",       "account": "Chase Checking", "pending": False},
    {"id": "txn-032", "date": "2026-08-05", "merchant": "CVS Pharmacy",          "amount":  38.47, "category": "health",       "account": "Chase Checking", "pending": False},
    {"id": "txn-033", "date": "2026-08-02", "merchant": "Walgreens",             "amount":  22.15, "category": "health",       "account": "Chase Checking", "pending": False},
]


@router.get("/plaid/transactions")
async def mock_b2c_transactions(_: str = Depends(require_mock_auth)):
    """Demo transaction list in no-DB mode (30-day window)."""
    return {"transactions": DEMO_TRANSACTIONS, "mock": True}


def _build_mock_budgets() -> list[dict]:
    spending: dict[str, float] = {}
    for t in DEMO_TRANSACTIONS:
        if t["amount"] > 0:
            cat = t["category"]
            spending[cat] = spending.get(cat, 0.0) + t["amount"]
    result = []
    for cat, label in _BUDGET_CAT_LABELS.items():
        limit = _BUDGET_DEFAULTS.get(cat, 200.0)
        current = round(spending.get(cat, 0.0), 2)
        pct = round((current / limit * 100) if limit > 0 else 0.0, 1)
        result.append({
            "category": cat,
            "label": label,
            "monthly_limit": limit,
            "current_spend": current,
            "pct": pct,
            "status": "over" if pct > 100 else "warning" if pct >= 80 else "ok",
        })
    return result


@router.get("/budgets")
async def mock_get_budgets(_: str = Depends(require_mock_auth)):
    """Demo budget list in no-DB mode."""
    return {"budgets": _build_mock_budgets(), "mock": True}


@router.post("/budgets")
async def mock_set_budget(body: dict, _: str = Depends(require_mock_auth)):
    """Accept budget update (no persistence in mock mode — returns updated budget)."""
    cat = body.get("category", "other")
    limit = float(body.get("monthly_limit", 200.0))
    spending: dict[str, float] = {}
    for t in DEMO_TRANSACTIONS:
        if t["amount"] > 0:
            spending[t["category"]] = spending.get(t["category"], 0.0) + t["amount"]
    current = round(spending.get(cat, 0.0), 2)
    pct = round((current / limit * 100) if limit > 0 else 0.0, 1)
    return {
        "category": cat,
        "label": _BUDGET_CAT_LABELS.get(cat, cat.title()),
        "monthly_limit": limit,
        "current_spend": current,
        "pct": pct,
        "status": "over" if pct > 100 else "warning" if pct >= 80 else "ok",
        "mock": True,
    }


DEMO_TAX_SUMMARY = {
    "tax_year": 2026,
    "short_term_gains": 2840,
    "long_term_gains": 8120,
    "tlh_opportunities": 2,
    "tlh_estimated_savings": 680,
    "projected_tax_liability": 3240,
}


DEMO_BILLS = [
    {"merchant": "AT&T Wireless",    "category": "utilities",    "amount":  85.00, "frequency": "monthly",  "next_expected_date": "2026-09-01", "monthly_equivalent":  85.00},
    {"merchant": "Austin Energy",    "category": "utilities",    "amount": 142.30, "frequency": "monthly",  "next_expected_date": "2026-09-01", "monthly_equivalent": 142.30},
    {"merchant": "Internet Service", "category": "utilities",    "amount":  69.99, "frequency": "monthly",  "next_expected_date": "2026-09-01", "monthly_equivalent":  69.99},
    {"merchant": "Planet Fitness",   "category": "health",       "amount":  24.99, "frequency": "monthly",  "next_expected_date": "2026-09-13", "monthly_equivalent":  24.99},
    {"merchant": "Netflix",          "category": "entertainment","amount":  22.99, "frequency": "monthly",  "next_expected_date": "2026-09-12", "monthly_equivalent":  22.99},
    {"merchant": "Amazon Prime",     "category": "entertainment","amount":  14.99, "frequency": "monthly",  "next_expected_date": "2026-09-10", "monthly_equivalent":  14.99},
    {"merchant": "Xbox Game Pass",   "category": "entertainment","amount":  14.99, "frequency": "monthly",  "next_expected_date": "2026-09-05", "monthly_equivalent":  14.99},
    {"merchant": "Spotify",          "category": "entertainment","amount":  10.99, "frequency": "monthly",  "next_expected_date": "2026-09-11", "monthly_equivalent":  10.99},
    {"merchant": "Google One Storage","category": "utilities",   "amount":   2.99, "frequency": "monthly",  "next_expected_date": "2026-09-01", "monthly_equivalent":   2.99},
]


@router.get("/bills")
async def mock_b2c_bills(_: str = Depends(require_mock_auth)):
    """Demo recurring bills (subscriptions) in no-DB mode."""
    total_monthly = round(sum(b["monthly_equivalent"] for b in DEMO_BILLS), 2)
    return {"bills": DEMO_BILLS, "total_monthly": total_monthly, "mock": True}


@router.get("/tax-summary")
async def mock_b2c_tax_summary(_: str = Depends(require_mock_auth)):
    """Demo tax summary card data in no-DB mode."""
    return {**DEMO_TAX_SUMMARY, "mock": True}


@router.get("/me")
async def mock_b2c_me(_: str = Depends(require_mock_auth)):
    """Demo profile when B2C DB routes are unavailable."""
    return MOCK_ME


@router.post("/forgot-password")
async def mock_forgot_password():
    """Mock forgot password — always returns success (no email sent in demo mode)."""
    return {
        "status": "sent",
        "message": "If this email is registered, you will receive a reset link shortly.",
        "mock": True,
        "demo_note": "No email is actually sent in demo mode.",
    }


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
        "total_aum": DEMO_TOTAL_AUM,
        "accounts": DEMO_ACCOUNTS,
        "allocation": DEMO_ALLOCATION,
        "fee_impact_summary": DEMO_FEE_IMPACT,
        "fee_benchmarks": DEMO_FEE_BENCHMARKS,
        "net_worth_history": DEMO_NET_WORTH_HISTORY,
        "risk_profile": DEMO_RISK_PROFILE,
        "alerts": DEMO_DASHBOARD_ALERTS,
        "ai_chat_remaining": 10,
        "subscription_tier": "free",
        "mock": True,
        "demo_mode": True,
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
    """Return demo linked institutions in no-DB mode."""
    return {"items": DEMO_PLAID_ITEMS, "mock": True, "demo_mode": True}


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
