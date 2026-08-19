"""Mock B2C endpoints when DATABASE_URL is not configured."""

import os
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

try:
    from backend.services.b2c_onboarding import OnboardingService, RISK_QUESTIONS
    from backend.services import b2c_demo_persona as persona
    from backend.services.portfolio_csv_parser import parse_portfolio_file
except ImportError:
    from services.b2c_onboarding import OnboardingService, RISK_QUESTIONS
    from services import b2c_demo_persona as persona
    from services.portfolio_csv_parser import parse_portfolio_file

router = APIRouter(prefix="/api/v1/b2c", tags=["b2c-mock"])
_security = HTTPBearer(auto_error=False)

_MOCK_PARSED_STATEMENTS: dict[str, dict] = {}


def require_mock_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
) -> str:
    """Require a bearer token for protected mock B2C endpoints."""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return credentials.credentials

MOCK_ME = persona.MOCK_ME
MOCK_ME_ADVISOR = persona.MOCK_ME_ADVISOR
DEMO_TOTAL_AUM = persona.DEMO_TOTAL_AUM
DEMO_ACCOUNTS = persona.DEMO_ACCOUNTS
DEMO_TOTAL_ASSETS = persona.DEMO_TOTAL_ASSETS
DEMO_TOTAL_LIABILITIES = persona.DEMO_TOTAL_LIABILITIES
DEMO_ALLOCATION = persona.DEMO_ALLOCATION
DEMO_FEE_IMPACT = persona.DEMO_FEE_IMPACT
DEMO_FEE_BENCHMARKS = persona.DEMO_FEE_BENCHMARKS
DEMO_RISK_PROFILE = persona.DEMO_RISK_PROFILE
DEMO_NET_WORTH_HISTORY = persona.DEMO_NET_WORTH_HISTORY
DEMO_DASHBOARD_ALERTS = persona.DEMO_DASHBOARD_ALERTS
DEMO_GOALS = persona.DEMO_GOALS
DEMO_TAX_SUMMARY = persona.DEMO_TAX_SUMMARY
DEMO_BILLS = persona.DEMO_BILLS
DEMO_HOUSEHOLD_MEMBERS = persona.DEMO_HOUSEHOLD_MEMBERS
DEMO_JOINT_GOALS = persona.DEMO_JOINT_GOALS
DEMO_ADVISOR = persona.DEMO_ADVISOR
DEMO_ADVISOR_FEES = persona.DEMO_ADVISOR_FEES

# Set MOCK_B2C_ADVISOR_MODE=true in env to demo advisor-linked shell nav
_MOCK_ADVISOR_MODE = os.getenv("MOCK_B2C_ADVISOR_MODE", "").lower() in ("1", "true", "yes")

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


# ── Advisor-linked client features (B2C-302/303/304) ───────────────────────

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
        "subscription_tier": "pro",
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
    return persona.dashboard_payload()


@router.get("/holdings")
async def mock_b2c_holdings(_: str = Depends(require_mock_auth)):
    """Demo holdings from parsed Schwab CSV with simulated gain/loss."""
    import random
    rng = random.Random(42)
    holdings = persona.get_demo_holdings()
    enriched = []
    for h in holdings:
        gain_pct = None
        if h.get("asset_class") == "Cash & Equivalents":
            gain_pct = 0.0
        elif h.get("security_type", "").lower() in ("fixed income",):
            gain_pct = round(rng.uniform(-2.0, 5.0), 1)
        else:
            if h.get("symbol") in ("AAPL", "GOOGL", "AMZN", "MSFT", "NOW", "LLY"):
                gain_pct = round(rng.uniform(80.0, 350.0), 1)
            elif h.get("symbol") in ("DOW", "KMB", "KO"):
                gain_pct = round(rng.uniform(5.0, 40.0), 1)
            else:
                gain_pct = round(rng.uniform(-8.0, 200.0), 1)
        enriched.append({**h, "gain_pct": gain_pct})
    return {"holdings": enriched, "count": len(enriched), "mock": True}


@router.get("/statements")
async def mock_list_statements(_: str = Depends(require_mock_auth)):
    return {"statements": persona.DEMO_STATEMENTS, "mock": True}


@router.post("/statements/upload")
async def mock_upload_statement(
    file: UploadFile = File(...),
    _: str = Depends(require_mock_auth),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    filename_lower = file.filename.lower()
    if not filename_lower.endswith((".pdf", ".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Supported formats: PDF, CSV, or Excel")

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (20 MB max)")

    stmt_id = f"stmt-{str(uuid.uuid4())[:8]}"
    if filename_lower.endswith((".csv", ".xlsx", ".xls")):
        parsed = parse_portfolio_file(file_bytes, file.filename)
        positions = [
            {
                "ticker": h.get("symbol", "UNKNOWN"),
                "name": h.get("description", ""),
                "quantity": h.get("quantity") or 0,
                "value": h.get("market_value", 0),
                "confidence": 0.98,
            }
            for h in parsed["holdings"]
        ]
        _MOCK_PARSED_STATEMENTS[stmt_id] = {
            "id": stmt_id,
            "filename": file.filename,
            "custodian": parsed["custodian"],
            "parsed": f"{parsed['position_count']} positions imported from spreadsheet",
            "confidence": "98%",
            "status": "parsed",
            "positions": positions,
            "totalValue": parsed["total_value"],
        }
        return {"id": stmt_id, "filename": file.filename, "status": "parsed", "estimated_seconds": 0}

    _MOCK_PARSED_STATEMENTS[stmt_id] = {
        "id": stmt_id,
        "filename": file.filename,
        "custodian": "Detecting...",
        "parsed": "Processing...",
        "confidence": "0%",
        "status": "parsing",
        "positions": [],
    }
    return {"id": stmt_id, "filename": file.filename, "status": "parsing", "estimated_seconds": 10}


@router.get("/statements/{statement_id}/status")
async def mock_statement_status(statement_id: str, _: str = Depends(require_mock_auth)):
    stmt = _MOCK_PARSED_STATEMENTS.get(statement_id)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    return {
        "id": stmt["id"],
        "filename": stmt["filename"],
        "status": stmt.get("status", "parsing"),
        "custodian": stmt.get("custodian", "Detecting..."),
        "parsed": stmt.get("parsed", "Processing..."),
        "confidence": stmt.get("confidence", "0%"),
        "position_count": len(stmt.get("positions", [])),
        "total_value": stmt.get("totalValue"),
    }


@router.post("/statements/{statement_id}/confirm")
async def mock_confirm_statement(statement_id: str, _: str = Depends(require_mock_auth)):
    """Demo statement confirmation in no-DB mode."""
    holdings = persona.get_demo_holdings()
    return {
        "status": "confirmed",
        "statementId": statement_id,
        "positionsCreated": len(holdings),
        "persistedStatementId": None,
        "persistedAccountId": "acc-demo-schwab-001",
        "mock": True,
    }


@router.post("/planning/retirement")
async def mock_retirement_plan(_: dict, __: str = Depends(require_mock_auth)):
    """Demo Monte Carlo response when B2C DB routes are unavailable."""
    years = 30
    start = 4_700_000
    path = [start + i * 45_000 for i in range(years + 1)]
    return {
        "success_rate": 92.5,
        "simulations": 1000,
        "median_ending_balance": 6_800_000,
        "p10_ending": 4_200_000,
        "p90_ending": 9_500_000,
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


MOCK_INSIGHTS = [
    {
        "id": "retirement-track",
        "type": "goal_off_track",
        "title": "On track to retire in ~3 years",
        "body": (
            "With $4.7M invested and $300K in cash, your portfolio is 94% of your "
            "$5M retirement target. Review your withdrawal glide path before 2028."
        ),
        "cta_label": "View retirement plan",
        "cta_path": "/client/planning",
        "priority": 1,
    },
    {
        "id": "fee-savings",
        "type": "fee_savings",
        "title": "You could save ~$12,500/yr in investment fees",
        "body": (
            "Your estimated fee rate (0.50%) vs a traditional 1% advisor on $4.7M "
            "could free significant cash for retirement spending."
        ),
        "cta_label": "View fee analyzer",
        "cta_path": "/client/dashboard",
        "priority": 2,
    },
    {
        "id": "rebalance-needed",
        "type": "rebalance_needed",
        "title": "US equity is 4% above your growth target",
        "body": (
            "Your Schwab portfolio is overweight US equities ahead of retirement. "
            "Consider trimming winners and adding to fixed income."
        ),
        "cta_label": "Review allocation",
        "cta_path": "/client/dashboard",
        "priority": 3,
    },
    {
        "id": "tax-opportunity",
        "type": "tax_opportunity",
        "title": "4 tax-loss harvesting opportunities identified",
        "body": (
            "Estimated tax savings of $12,400 available from harvesting losses "
            "in your taxable brokerage before year-end."
        ),
        "cta_label": "View tax summary",
        "cta_path": "/client/tax",
        "priority": 4,
    },
]


# In-memory push subscription store for mock mode (resets on restart).
_mock_push_subscriptions: dict[str, dict] = {}


@router.post("/push/subscribe")
async def mock_push_subscribe(body: dict, token: str = Depends(require_mock_auth)):
    """Store a push subscription endpoint in mock mode."""
    endpoint = body.get("endpoint", "")
    if not endpoint:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="endpoint required")
    _mock_push_subscriptions[token] = {"endpoint": endpoint, "keys": body.get("keys", {})}
    return {"status": "subscribed", "mock": True}


@router.delete("/push/subscribe")
async def mock_push_unsubscribe(token: str = Depends(require_mock_auth)):
    """Remove a push subscription in mock mode."""
    _mock_push_subscriptions.pop(token, None)
    return {"status": "unsubscribed", "mock": True}


@router.get("/push/status")
async def mock_push_status(token: str = Depends(require_mock_auth)):
    """Return whether a push subscription exists in mock mode."""
    subscribed = token in _mock_push_subscriptions
    return {"subscribed": subscribed, "mock": True}


@router.get("/insights")
async def mock_insights(_: str = Depends(require_mock_auth)):
    """Return mock proactive insights in no-DB mode."""
    return {"insights": MOCK_INSIGHTS, "count": len(MOCK_INSIGHTS), "mock": True}


MOCK_ADVISORS = [
    {
        "id": "adv-001",
        "name": "Sarah Chen",
        "title": "CFP®, CPA",
        "firm": "Chen Wealth Advisors",
        "avatar_initial": "S",
        "avatar_color": "#2563EB",
        "location": "San Francisco, CA",
        "specialties": ["retirement", "tax_planning"],
        "fee_type": "aum_pct",
        "fee_range": "0.75% – 1.0% AUM/yr",
        "min_aum": 250000,
        "rating": 4.9,
        "review_count": 84,
        "accepting_clients": True,
        "bio": "18 years helping tech professionals build tax-efficient retirement portfolios.",
    },
    {
        "id": "adv-002",
        "name": "Marcus Williams",
        "title": "CFP®, ChFC",
        "firm": "Williams Wealth Group",
        "avatar_initial": "M",
        "avatar_color": "#7C3AED",
        "location": "New York, NY",
        "specialties": ["wealth_building", "estate_planning"],
        "fee_type": "flat",
        "fee_range": "$5,000 – $10,000/yr",
        "min_aum": 100000,
        "rating": 4.8,
        "review_count": 61,
        "accepting_clients": True,
        "bio": "Flat-fee advisor specializing in generational wealth and estate strategies.",
    },
    {
        "id": "adv-003",
        "name": "Jennifer Park",
        "title": "CFA, CFP®",
        "firm": "Park Capital Planning",
        "avatar_initial": "J",
        "avatar_color": "#059669",
        "location": "Chicago, IL",
        "specialties": ["tax_planning", "investing_basics"],
        "fee_type": "aum_pct",
        "fee_range": "0.50% – 0.85% AUM/yr",
        "min_aum": 500000,
        "rating": 4.7,
        "review_count": 47,
        "accepting_clients": True,
        "bio": "Portfolio-focused advisor with deep CFA expertise in tax-efficient allocation.",
    },
    {
        "id": "adv-004",
        "name": "David Rodriguez",
        "title": "CFP®",
        "firm": "Rodriguez Financial",
        "avatar_initial": "D",
        "avatar_color": "#DC2626",
        "location": "Austin, TX",
        "specialties": ["retirement", "wealth_building"],
        "fee_type": "flat",
        "fee_range": "$3,000 – $6,000/yr",
        "min_aum": 50000,
        "rating": 4.9,
        "review_count": 112,
        "accepting_clients": True,
        "bio": "Accessible flat-fee planning for early-career professionals and families.",
    },
    {
        "id": "adv-005",
        "name": "Amanda Foster",
        "title": "CFP®, CTFA",
        "firm": "Foster Estate Planning",
        "avatar_initial": "A",
        "avatar_color": "#D97706",
        "location": "Boston, MA",
        "specialties": ["estate_planning", "wealth_building"],
        "fee_type": "aum_pct",
        "fee_range": "0.40% – 0.70% AUM/yr",
        "min_aum": 1000000,
        "rating": 5.0,
        "review_count": 29,
        "accepting_clients": False,
        "bio": "Boutique estate and trust specialist for high-net-worth families.",
    },
    {
        "id": "adv-006",
        "name": "Kevin Nguyen",
        "title": "CFP®",
        "firm": "Nguyen Financial Coaching",
        "avatar_initial": "K",
        "avatar_color": "#0891B2",
        "location": "Seattle, WA",
        "specialties": ["investing_basics", "wealth_building"],
        "fee_type": "flat",
        "fee_range": "$1,500 – $3,500/yr",
        "min_aum": 25000,
        "rating": 4.6,
        "review_count": 138,
        "accepting_clients": True,
        "bio": "Entry-friendly advisor helping first-time investors build lasting habits.",
    },
    {
        "id": "adv-007",
        "name": "Rachel Thompson",
        "title": "CPA, CFP®",
        "firm": "Thompson Tax & Wealth",
        "avatar_initial": "R",
        "avatar_color": "#BE185D",
        "location": "Denver, CO",
        "specialties": ["tax_planning", "retirement"],
        "fee_type": "flat",
        "fee_range": "$4,000 – $8,000/yr",
        "min_aum": 100000,
        "rating": 4.8,
        "review_count": 73,
        "accepting_clients": True,
        "bio": "CPA-turned-planner who integrates tax strategy into every retirement plan.",
    },
    {
        "id": "adv-008",
        "name": "Michael Okonkwo",
        "title": "CFP®, MBA",
        "firm": "Okonkwo Advisors",
        "avatar_initial": "M",
        "avatar_color": "#0D9488",
        "location": "Miami, FL",
        "specialties": ["wealth_building", "retirement"],
        "fee_type": "aum_pct",
        "fee_range": "0.65% – 0.90% AUM/yr",
        "min_aum": 250000,
        "rating": 4.7,
        "review_count": 55,
        "accepting_clients": True,
        "bio": "Growth-focused wealth advisor serving business owners and executives.",
    },
]


@router.get("/advisors")
async def mock_advisors(_: str = Depends(require_mock_auth)):
    """Return mock advisor directory in no-DB mode."""
    return {"advisors": MOCK_ADVISORS, "mock": True}


MOCK_LEARNING_ITEMS = [
    {
        "id": "learn-001",
        "title": "Welcome to Firmum",
        "duration": "3:00",
        "category": "getting_started",
        "description": "A quick tour of your dashboard, linked accounts, and key features.",
        "content_type": "video",
        "thumbnail_color": "#DBEAFE",
    },
    {
        "id": "learn-002",
        "title": "Linking Your Accounts",
        "duration": "4:30",
        "category": "getting_started",
        "description": "Connect banks and brokerages securely with Plaid in under five minutes.",
        "content_type": "video",
        "thumbnail_color": "#BFDBFE",
    },
    {
        "id": "learn-003",
        "title": "Understanding Net Worth",
        "duration": "5:00",
        "category": "investing_basics",
        "description": "How Firmum calculates assets, liabilities, and your total net worth over time.",
        "content_type": "video",
        "thumbnail_color": "#D1FAE5",
    },
    {
        "id": "learn-004",
        "title": "Asset Allocation 101",
        "duration": "6:15",
        "category": "investing_basics",
        "description": "Stocks, bonds, and cash — what they are and why diversification matters.",
        "content_type": "article",
        "thumbnail_color": "#A7F3D0",
    },
    {
        "id": "learn-005",
        "title": "Setting Financial Goals",
        "duration": "4:00",
        "category": "investing_basics",
        "description": "Create retirement, emergency fund, and custom goals with progress tracking.",
        "content_type": "video",
        "thumbnail_color": "#6EE7B7",
    },
    {
        "id": "learn-006",
        "title": "Tax-Loss Harvesting Basics",
        "duration": "5:30",
        "category": "tax_planning",
        "description": "How offsetting gains with losses can reduce your tax bill — concepts only.",
        "content_type": "article",
        "thumbnail_color": "#FDE68A",
    },
    {
        "id": "learn-007",
        "title": "Reading Your Tax Summary",
        "duration": "3:45",
        "category": "tax_planning",
        "description": "Navigate realized gains, estimated tax impact, and document downloads.",
        "content_type": "video",
        "thumbnail_color": "#FCD34D",
    },
    {
        "id": "learn-008",
        "title": "Working with Your Advisor",
        "duration": "4:15",
        "category": "working_with_advisor",
        "description": "Messages, documents, fee transparency, and when to reach out for help.",
        "content_type": "video",
        "thumbnail_color": "#DDD6FE",
    },
]


@router.get("/learning")
async def mock_learning(_: str = Depends(require_mock_auth)):
    """Return mock learning center content in no-DB mode."""
    return {"items": MOCK_LEARNING_ITEMS, "mock": True}


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


# Routes only present in mock — mounted alongside real B2C when DATABASE_URL is set.
supplement_router = APIRouter(prefix="/api/v1/b2c", tags=["b2c-demo-supplement"])

for _path, _endpoint, _methods in [
    ("/goals", mock_b2c_goals, ["GET"]),
    ("/goals", mock_create_goal, ["POST"]),
    ("/goals/{goal_id}", mock_delete_goal, ["DELETE"]),
    ("/bills", mock_b2c_bills, ["GET"]),
    ("/tax-summary", mock_b2c_tax_summary, ["GET"]),
    ("/learning", mock_learning, ["GET"]),
    ("/advisors", mock_advisors, ["GET"]),
    ("/push/subscribe", mock_push_subscribe, ["POST"]),
    ("/push/subscribe", mock_push_unsubscribe, ["DELETE"]),
    ("/push/status", mock_push_status, ["GET"]),
    ("/advisor/transparency", mock_advisor_transparency, ["GET"]),
    ("/advisor/messages", mock_advisor_messages, ["GET"]),
    ("/advisor/messages", mock_send_advisor_message, ["POST"]),
    ("/advisor/documents", mock_advisor_documents, ["GET"]),
    ("/advisor/documents/upload", mock_upload_advisor_document, ["POST"]),
    ("/plaid/transactions", mock_b2c_transactions, ["GET"]),
]:
    supplement_router.add_api_route(_path, _endpoint, methods=_methods)
