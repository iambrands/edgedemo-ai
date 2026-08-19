"""Mock B2C endpoints when DATABASE_URL is not configured."""

import os

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

# Set MOCK_B2C_ADVISOR_MODE=true in env to demo advisor-linked shell nav
_MOCK_ADVISOR_MODE = os.getenv("MOCK_B2C_ADVISOR_MODE", "").lower() in ("1", "true", "yes")

MOCK_ME_ADVISOR = {
    **MOCK_ME,
    "management_mode": "advisor_linked",
    "advisor_connection_status": "active",
    "onboarding_completed": True,
}

# Realistic first-run dashboard — avoids $0 empty state for new DIY users in no-DB mode.
DEMO_TOTAL_AUM = "125000"

DEMO_ACCOUNTS = [
    # Depository (assets)
    {
        "id": "acc-demo-001",
        "custodian": "Chase",
        "account_type": "Checking",
        "account_category": "depository",
        "is_liability": False,
        "total_value": "12450",
        "last_statement_date": "2026-07-31",
    },
    {
        "id": "acc-demo-004",
        "custodian": "Ally Bank",
        "account_type": "Savings",
        "account_category": "depository",
        "is_liability": False,
        "total_value": "22550",
        "last_statement_date": "2026-07-31",
    },
    # Investment (assets)
    {
        "id": "acc-demo-002",
        "custodian": "Fidelity",
        "account_type": "Brokerage",
        "account_category": "investment",
        "is_liability": False,
        "total_value": "78320",
        "last_statement_date": "2026-07-31",
    },
    {
        "id": "acc-demo-003",
        "custodian": "Vanguard",
        "account_type": "401(k)",
        "account_category": "investment",
        "is_liability": False,
        "total_value": "51680",
        "last_statement_date": "2026-07-31",
    },
    # Credit cards (liabilities)
    {
        "id": "acc-demo-005",
        "custodian": "Chase",
        "account_type": "Sapphire Reserve",
        "account_category": "credit",
        "is_liability": True,
        "total_value": "3400",
        "last_statement_date": "2026-07-31",
    },
    {
        "id": "acc-demo-006",
        "custodian": "American Express",
        "account_type": "Gold Card",
        "account_category": "credit",
        "is_liability": True,
        "total_value": "1600",
        "last_statement_date": "2026-07-31",
    },
    # Loans (liabilities)
    {
        "id": "acc-demo-007",
        "custodian": "Wells Fargo",
        "account_type": "Mortgage",
        "account_category": "loan",
        "is_liability": True,
        "total_value": "35000",
        "last_statement_date": "2026-07-31",
    },
]

DEMO_TOTAL_ASSETS = "165000"
DEMO_TOTAL_LIABILITIES = "40000"

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


# ── Advisor-linked client features (B2C-302/303/304) ───────────────────────

DEMO_ADVISOR = {
    "name": "Leslie Wilson, CFP",
    "firm": "IAB Advisors, Inc.",
    "email": "leslie@iabadvisors.com",
}

DEMO_ADVISOR_ACTIVITY = [
    {
        "id": "act-001",
        "date": "2026-08-12",
        "type": "rebalance",
        "title": "Portfolio rebalance",
        "description": "Reduced large-cap equity overweight by 3% and added to intermediate bonds.",
    },
    {
        "id": "act-002",
        "date": "2026-08-05",
        "type": "trade",
        "title": "Tax-loss harvest",
        "description": "Sold VTI lot at a loss and repurchased VOO after wash-sale window — estimated $680 tax savings.",
    },
    {
        "id": "act-003",
        "date": "2026-07-28",
        "type": "review",
        "title": "Quarterly review completed",
        "description": "Reviewed Q2 performance, updated retirement projection, and confirmed IPS allocation targets.",
    },
    {
        "id": "act-004",
        "date": "2026-07-15",
        "type": "trade",
        "title": "Dividend reinvestment",
        "description": "Reinvested $842 in qualified dividends across taxable brokerage account.",
    },
    {
        "id": "act-005",
        "date": "2026-06-30",
        "type": "rebalance",
        "title": "401(k) allocation update",
        "description": "Shifted 2% from international equity to US small-cap value per IPS glide path.",
    },
]

DEMO_ADVISOR_FEES = {
    "fee_rate_pct": 0.75,
    "aum_basis": 125000,
    "annual_fee_estimate": 937.50,
    "ytd_fees_paid": 468.75,
    "billing_period": "Quarterly",
    "next_billing_date": "2026-10-01",
    "last_billed_date": "2026-07-01",
}

DEMO_ADVISOR_PERFORMANCE = {
    "benchmark_name": "S&P 500",
    "portfolio_return_ytd": 8.4,
    "benchmark_return_ytd": 7.1,
    "portfolio_return_1y": 12.6,
    "benchmark_return_1y": 11.2,
    "time_series": [
        {"date": "2025-09-30", "portfolio": 100.0, "benchmark": 100.0},
        {"date": "2025-10-31", "portfolio": 101.2, "benchmark": 100.8},
        {"date": "2025-11-30", "portfolio": 103.5, "benchmark": 102.1},
        {"date": "2025-12-31", "portfolio": 104.8, "benchmark": 103.4},
        {"date": "2026-01-31", "portfolio": 105.6, "benchmark": 104.0},
        {"date": "2026-02-28", "portfolio": 106.9, "benchmark": 104.8},
        {"date": "2026-03-31", "portfolio": 107.4, "benchmark": 105.2},
        {"date": "2026-04-30", "portfolio": 108.8, "benchmark": 106.1},
        {"date": "2026-05-31", "portfolio": 110.2, "benchmark": 107.0},
        {"date": "2026-06-30", "portfolio": 111.5, "benchmark": 107.8},
        {"date": "2026-07-31", "portfolio": 112.1, "benchmark": 108.5},
        {"date": "2026-08-15", "portfolio": 112.6, "benchmark": 108.9},
    ],
}

DEMO_ADVISOR_MESSAGES = [
    {
        "id": "msg-001",
        "sender": "advisor",
        "sender_name": "Leslie Wilson, CFP",
        "body": "Hi! Your Q2 quarterly review is complete. I've posted the report in your document vault and made a few rebalancing recommendations.",
        "timestamp": "2026-08-10T09:15:00Z",
    },
    {
        "id": "msg-002",
        "sender": "client",
        "sender_name": "You",
        "body": "Thanks Leslie — I saw the rebalance notification. Can you explain the bond duration change?",
        "timestamp": "2026-08-10T14:22:00Z",
    },
    {
        "id": "msg-003",
        "sender": "advisor",
        "sender_name": "Leslie Wilson, CFP",
        "body": "Absolutely. We extended duration slightly to capture higher yields while keeping overall portfolio risk within your IPS target. Happy to walk through it on our next call.",
        "timestamp": "2026-08-11T10:05:00Z",
    },
    {
        "id": "msg-004",
        "sender": "advisor",
        "sender_name": "Leslie Wilson, CFP",
        "body": "Also — I identified a tax-loss harvesting opportunity in your taxable account. Estimated savings of ~$680 if we execute before month-end.",
        "timestamp": "2026-08-12T08:30:00Z",
    },
    {
        "id": "msg-005",
        "sender": "client",
        "sender_name": "You",
        "body": "That sounds good. Please proceed with the TLH trade if it aligns with our long-term plan.",
        "timestamp": "2026-08-12T16:45:00Z",
    },
    {
        "id": "msg-006",
        "sender": "advisor",
        "sender_name": "Leslie Wilson, CFP",
        "body": "Done — trade executed today. You'll see it reflected in your activity log. Quarterly fee of $234.38 will be debited on Oct 1.",
        "timestamp": "2026-08-13T11:00:00Z",
    },
]

DEMO_ADVISOR_DOCUMENTS = [
    {
        "id": "doc-001",
        "title": "Q2 2026 Quarterly Performance Report",
        "type": "report",
        "shared_date": "2026-07-15",
        "size_bytes": 245760,
        "is_read": True,
        "shared_by": "Leslie Wilson, CFP",
    },
    {
        "id": "doc-002",
        "title": "2025 Tax Summary — Form 1099 Composite",
        "type": "tax",
        "shared_date": "2026-02-10",
        "size_bytes": 184320,
        "is_read": True,
        "shared_by": "Leslie Wilson, CFP",
    },
    {
        "id": "doc-003",
        "title": "Financial Plan — Retirement Projection 2026",
        "type": "plan",
        "shared_date": "2026-05-20",
        "size_bytes": 512000,
        "is_read": False,
        "shared_by": "Leslie Wilson, CFP",
    },
    {
        "id": "doc-004",
        "title": "Investment Policy Statement (IPS)",
        "type": "agreement",
        "shared_date": "2025-11-01",
        "size_bytes": 98304,
        "is_read": True,
        "shared_by": "Leslie Wilson, CFP",
    },
    {
        "id": "doc-005",
        "title": "ADV Part 2A — Firm Brochure",
        "type": "agreement",
        "shared_date": "2025-11-01",
        "size_bytes": 327680,
        "is_read": True,
        "shared_by": "Leslie Wilson, CFP",
    },
    {
        "id": "doc-006",
        "title": "Fee Schedule & Billing Disclosure",
        "type": "agreement",
        "shared_date": "2025-11-01",
        "size_bytes": 65536,
        "is_read": True,
        "shared_by": "Leslie Wilson, CFP",
    },
]


def _require_advisor_linked_mode() -> None:
    """Return 404 when advisor features are requested in DIY demo mode."""
    if not _MOCK_ADVISOR_MODE:
        raise HTTPException(status_code=404, detail="Not found")


@router.get("/advisor/transparency")
async def mock_advisor_transparency(_: str = Depends(require_mock_auth)):
    """Advisor activity, fees, and performance vs benchmark (advisor-linked only)."""
    _require_advisor_linked_mode()
    return {
        "advisor": DEMO_ADVISOR,
        "activity": DEMO_ADVISOR_ACTIVITY,
        "fees": DEMO_ADVISOR_FEES,
        "performance": DEMO_ADVISOR_PERFORMANCE,
        "mock": True,
    }


@router.get("/advisor/messages")
async def mock_advisor_messages(_: str = Depends(require_mock_auth)):
    """Message thread with connected advisor."""
    _require_advisor_linked_mode()
    return {
        "advisor": DEMO_ADVISOR,
        "messages": DEMO_ADVISOR_MESSAGES,
        "mock": True,
    }


@router.post("/advisor/messages")
async def mock_send_advisor_message(body: dict, _: str = Depends(require_mock_auth)):
    """Accept a client message (demo — no persistence)."""
    _require_advisor_linked_mode()
    import time
    text = str(body.get("body", "")).strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message body required")
    return {
        "id": f"msg-new-{int(time.time())}",
        "sender": "client",
        "sender_name": "You",
        "body": text,
        "timestamp": "2026-08-18T12:00:00Z",
        "mock": True,
    }


@router.get("/advisor/documents")
async def mock_advisor_documents(_: str = Depends(require_mock_auth)):
    """Documents shared by advisor."""
    _require_advisor_linked_mode()
    return {"documents": DEMO_ADVISOR_DOCUMENTS, "mock": True}


@router.post("/advisor/documents/upload")
async def mock_upload_advisor_document(body: dict, _: str = Depends(require_mock_auth)):
    """Accept client document upload metadata (demo — no file storage)."""
    _require_advisor_linked_mode()
    import time
    name = str(body.get("filename", "uploaded-document.pdf")).strip()
    return {
        "id": f"doc-upload-{int(time.time())}",
        "title": name,
        "type": "client_upload",
        "shared_date": "2026-08-18",
        "size_bytes": int(body.get("size_bytes", 0)),
        "is_read": True,
        "shared_by": "You",
        "mock": True,
    }


# ── Household sharing (B2C-305) ─────────────────────────────────────────────

_mock_household_invites: list[str] = []

DEMO_HOUSEHOLD_MEMBERS = [
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

DEMO_JOINT_GOALS = [
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


@router.get("/household/members")
async def mock_household_members(_: str = Depends(require_mock_auth)):
    return {
        "members": DEMO_HOUSEHOLD_MEMBERS,
        "pending_invites": list(_mock_household_invites),
        "mock": True,
    }


@router.get("/household/combined-net-worth")
async def mock_household_combined(_: str = Depends(require_mock_auth)):
    combined = sum(m["net_worth"] for m in DEMO_HOUSEHOLD_MEMBERS)
    return {
        "combined_net_worth": combined,
        "member_count": len(DEMO_HOUSEHOLD_MEMBERS),
        "members": [
            {"name": m["name"], "net_worth": m["net_worth"]} for m in DEMO_HOUSEHOLD_MEMBERS
        ],
        "joint_goals": DEMO_JOINT_GOALS,
        "mock": True,
    }


@router.post("/household/invite")
async def mock_household_invite(body: dict, _: str = Depends(require_mock_auth)):
    email = str(body.get("email", "")).lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    if email == "demo.client@firmum.ai":
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    if email not in _mock_household_invites:
        _mock_household_invites.append(email)
    return {"status": "invited", "email": email, "mock": True}


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
    return MOCK_ME_ADVISOR if _MOCK_ADVISOR_MODE else MOCK_ME


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
        "total_assets": DEMO_TOTAL_ASSETS,
        "total_liabilities": DEMO_TOTAL_LIABILITIES,
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
