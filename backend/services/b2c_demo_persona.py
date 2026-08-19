"""Premier B2C demo persona — $5M net worth pre-retiree with Schwab portfolio."""

from __future__ import annotations

from decimal import Decimal

from backend.services.b2c_demo import DEMO_EMAIL, DEMO_FIRST_NAME, DEMO_LAST_NAME, DEMO_USER_ID
from backend.services.portfolio_csv_parser import load_demo_schwab_holdings

# ── Persona targets ─────────────────────────────────────────────────────────
NET_WORTH = 5_000_000
CASH_TARGET = 300_000
INVESTED_TARGET = 4_700_000
RETIREMENT_TARGET_DATE = "2028-12-31"
RETIREMENT_YEARS_AWAY = 3

MOCK_ME = {
    "id": str(DEMO_USER_ID),
    "email": DEMO_EMAIL,
    "user_type": "b2c_retail",
    "subscription_tier": "pro",
    "onboarding_completed": True,
    "risk_profile_completed": True,
    "management_mode": "diy",
    "advisor_connection_status": "none",
    "mock": True,
    "demo_mode": True,
    "first_name": DEMO_FIRST_NAME,
    "last_name": DEMO_LAST_NAME,
}

MOCK_ME_ADVISOR = {
    **MOCK_ME,
    "management_mode": "advisor_linked",
    "advisor_connection_status": "active",
}

DEMO_TOTAL_AUM = str(INVESTED_TARGET)
DEMO_TOTAL_ASSETS = str(NET_WORTH)
DEMO_TOTAL_LIABILITIES = "0"

DEMO_ACCOUNTS = [
    {
        "id": "acc-demo-schwab-001",
        "custodian": "Charles Schwab",
        "account_type": "Individual Brokerage",
        "account_category": "investment",
        "is_liability": False,
        "total_value": "4700000",
        "last_statement_date": "2024-11-13",
    },
    {
        "id": "acc-demo-schwab-cash",
        "custodian": "Charles Schwab",
        "account_type": "Money Market",
        "account_category": "depository",
        "is_liability": False,
        "total_value": "280000",
        "last_statement_date": "2024-11-13",
    },
    {
        "id": "acc-demo-chase-001",
        "custodian": "Chase",
        "account_type": "Premier Checking",
        "account_category": "depository",
        "is_liability": False,
        "total_value": "20000",
        "last_statement_date": "2026-08-19",
    },
]

DEMO_ALLOCATION = [
    {"asset_class": "US Equity", "pct": "62.0", "value": "2914000"},
    {"asset_class": "International Equity", "pct": "8.0", "value": "376000"},
    {"asset_class": "Fixed Income", "pct": "18.0", "value": "846000"},
    {"asset_class": "Cash & Equivalents", "pct": "6.0", "value": "300000"},
    {"asset_class": "Alternatives", "pct": "6.0", "value": "564000"},
]

DEMO_FEE_IMPACT = {
    "annual_cost": "23500",
    "ten_year_impact": "312000",
    "thirty_year_impact": "980000",
    "potential_savings": "12500",
    "highest_fee_account": "Charles Schwab Brokerage",
    "highest_fee_rate": "0.50",
    "effective_fee_rate_pct": "0.50",
}

DEMO_FEE_BENCHMARKS = [
    {"label": "Your portfolio (estimated)", "rate_pct": "0.50", "annual_cost_at_aum": "23500"},
    {"label": "Robo-advisor average", "rate_pct": "0.25", "annual_cost_at_aum": "11750"},
    {"label": "Traditional advisor average", "rate_pct": "1.00", "annual_cost_at_aum": "47000"},
]

DEMO_RISK_PROFILE = {
    "risk_number": 58,
    "risk_tolerance": "moderate",
    "label": "Moderate growth",
}

DEMO_NET_WORTH_HISTORY = [
    {"date": "2025-09-30", "value": "4120000"},
    {"date": "2025-10-31", "value": "4185000"},
    {"date": "2025-11-30", "value": "4250000"},
    {"date": "2025-12-31", "value": "4310000"},
    {"date": "2026-01-31", "value": "4380000"},
    {"date": "2026-02-28", "value": "4450000"},
    {"date": "2026-03-31", "value": "4520000"},
    {"date": "2026-04-30", "value": "4610000"},
    {"date": "2026-05-31", "value": "4720000"},
    {"date": "2026-06-30", "value": "4830000"},
    {"date": "2026-07-31", "value": "4910000"},
    {"date": "2026-08-19", "value": "5000000"},
]

DEMO_DASHBOARD_ALERTS = [
    {
        "type": "retirement",
        "severity": "info",
        "message": "You're on track for retirement in ~3 years with a $5M portfolio — review your withdrawal strategy.",
        "action": "view_retirement_plan",
        "gated": False,
        "upgrade_tier": None,
    },
    {
        "type": "fee_savings",
        "severity": "info",
        "message": "At $4.7M invested, switching from a 1% advisor to Firmum tools could save ~$12,500/yr.",
        "action": "view_fee_analyzer",
        "gated": False,
        "upgrade_tier": None,
    },
    {
        "type": "rebalance",
        "severity": "warning",
        "message": "US equity is 4% above your moderate-growth target — consider trimming before retirement.",
        "action": "view_allocation",
        "gated": False,
        "upgrade_tier": None,
    },
]

DEMO_GOALS = [
    {
        "id": "goal-demo-001",
        "goal_type": "retirement",
        "name": "Retire by 2028",
        "target_amount": 5000000,
        "current_amount": 4700000,
        "target_date": RETIREMENT_TARGET_DATE,
        "monthly_contribution": 0,
        "progress_pct": 94.0,
        "on_track": True,
        "notes": "Growth-oriented glide path — shifting to 50/50 stocks/bonds over next 24 months.",
    },
    {
        "id": "goal-demo-002",
        "goal_type": "emergency_fund",
        "name": "Cash Reserve (Pre-Retirement)",
        "target_amount": 300000,
        "current_amount": 300000,
        "target_date": "2026-12-31",
        "monthly_contribution": 0,
        "progress_pct": 100.0,
        "on_track": True,
        "notes": "$300K liquid for bridge expenses and healthcare premiums.",
    },
    {
        "id": "goal-demo-003",
        "goal_type": "healthcare",
        "name": "Healthcare Bridge Fund",
        "target_amount": 150000,
        "current_amount": 95000,
        "target_date": "2028-06-30",
        "monthly_contribution": 2500,
        "progress_pct": 63.3,
        "on_track": True,
        "notes": "Cover ACA premiums until Medicare eligibility at 65.",
    },
]

DEMO_TAX_SUMMARY = {
    "tax_year": 2026,
    "short_term_gains": 42800,
    "long_term_gains": 186400,
    "tlh_opportunities": 4,
    "tlh_estimated_savings": 12400,
    "projected_tax_liability": 48200,
}

DEMO_BILLS = [
    {"merchant": "AT&T Wireless", "category": "utilities", "amount": 125.00, "frequency": "monthly", "next_expected_date": "2026-09-01", "monthly_equivalent": 125.00},
    {"merchant": "Austin Energy", "category": "utilities", "amount": 285.00, "frequency": "monthly", "next_expected_date": "2026-09-01", "monthly_equivalent": 285.00},
    {"merchant": "Country Club Dues", "category": "membership", "amount": 850.00, "frequency": "monthly", "next_expected_date": "2026-09-01", "monthly_equivalent": 850.00},
    {"merchant": "Long-Term Care Insurance", "category": "insurance", "amount": 420.00, "frequency": "monthly", "next_expected_date": "2026-09-15", "monthly_equivalent": 420.00},
    {"merchant": "Netflix", "category": "entertainment", "amount": 22.99, "frequency": "monthly", "next_expected_date": "2026-09-12", "monthly_equivalent": 22.99},
]

DEMO_HOUSEHOLD_MEMBERS = [
    {
        "id": "member-demo-001",
        "name": f"{DEMO_FIRST_NAME} {DEMO_LAST_NAME}",
        "role": "primary",
        "email": DEMO_EMAIL,
        "net_worth": NET_WORTH,
        "linked": True,
    },
    {
        "id": "member-demo-002",
        "name": "Robert Chen",
        "role": "spouse",
        "email": "robert.chen@example.com",
        "net_worth": 2100000,
        "linked": True,
    },
]

DEMO_JOINT_GOALS = [
    {
        "id": "joint-goal-001",
        "name": "Shared Retirement Nest Egg",
        "target_amount": 8000000,
        "current_amount": 7100000,
        "target_date": RETIREMENT_TARGET_DATE,
        "progress_pct": 88.8,
    },
]

DEMO_ADVISOR = {
    "name": "Leslie Wilson, CFP",
    "firm": "IAB Advisors, Inc.",
    "email": "leslie@iabadvisors.com",
}

DEMO_ADVISOR_FEES = {
    "fee_rate_pct": 0.75,
    "aum_basis": NET_WORTH,
    "annual_fee_estimate": 37500,
    "ytd_fees_paid": 25000,
    "billing_period": "quarterly",
    "next_billing_date": "2026-10-01",
    "last_billed_date": "2026-07-01",
}

DEMO_STATEMENTS = [
    {
        "id": "stmt-demo-schwab-001",
        "account_id": "acc-demo-schwab-001",
        "custodian": "Charles Schwab",
        "statement_date": "2024-11-13",
        "ending_value": 4700000.0,
        "status": "confirmed",
        "filename": "Primary-Positions-2024-11-13.csv",
    },
]


def get_demo_holdings() -> list[dict]:
    return load_demo_schwab_holdings()


def build_allocation_from_holdings(holdings: list[dict]) -> list[dict]:
    totals: dict[str, float] = {}
    for h in holdings:
        ac = h.get("asset_class", "US Equity")
        totals[ac] = totals.get(ac, 0.0) + h["market_value"]
    grand = sum(totals.values()) or 1.0
    return [
        {
            "asset_class": k,
            "pct": f"{v / grand * 100:.1f}",
            "value": str(int(round(v))),
        }
        for k, v in sorted(totals.items(), key=lambda x: -x[1])
    ]


def dashboard_payload() -> dict:
    holdings = get_demo_holdings()
    allocation = build_allocation_from_holdings(holdings)
    return {
        "total_aum": DEMO_TOTAL_AUM,
        "total_assets": DEMO_TOTAL_ASSETS,
        "total_liabilities": DEMO_TOTAL_LIABILITIES,
        "accounts": DEMO_ACCOUNTS,
        "allocation": allocation or DEMO_ALLOCATION,
        "fee_impact_summary": DEMO_FEE_IMPACT,
        "fee_benchmarks": DEMO_FEE_BENCHMARKS,
        "net_worth_history": DEMO_NET_WORTH_HISTORY,
        "risk_profile": DEMO_RISK_PROFILE,
        "alerts": DEMO_DASHBOARD_ALERTS,
        "ai_chat_remaining": 50,
        "subscription_tier": "pro",
        "mock": True,
        "demo_mode": True,
        "holdings_count": len(holdings),
    }


def dashboard_response_models():
    """Build Pydantic DashboardResponse for real B2C routes."""
    from backend.api.b2c.schemas import (
        AccountSummary,
        Alert,
        AllocationBreakdown,
        DashboardResponse,
        FeeBenchmark,
        FeeImpactSummary,
        NetWorthPoint,
        RiskProfileSummary,
    )

    raw = dashboard_payload()
    fee = raw["fee_impact_summary"]
    return DashboardResponse(
        total_aum=Decimal(raw["total_aum"]),
        accounts=[
            AccountSummary(
                id=a["id"],
                custodian=a["custodian"],
                account_type=a["account_type"],
                total_value=Decimal(a["total_value"]),
                last_statement_date=a.get("last_statement_date"),
            )
            for a in raw["accounts"]
        ],
        allocation=[
            AllocationBreakdown(
                asset_class=a["asset_class"],
                pct=Decimal(a["pct"]),
                value=Decimal(a["value"]),
            )
            for a in raw["allocation"]
        ],
        fee_impact_summary=FeeImpactSummary(
            annual_cost=Decimal(fee["annual_cost"]),
            ten_year_impact=Decimal(fee["ten_year_impact"]),
            thirty_year_impact=Decimal(fee["thirty_year_impact"]),
            potential_savings=Decimal(fee["potential_savings"]),
            highest_fee_account=fee.get("highest_fee_account"),
            highest_fee_rate=Decimal(fee["highest_fee_rate"]) if fee.get("highest_fee_rate") else None,
            effective_fee_rate_pct=Decimal(fee["effective_fee_rate_pct"]) if fee.get("effective_fee_rate_pct") else None,
        ),
        fee_benchmarks=[
            FeeBenchmark(label=b["label"], rate_pct=Decimal(b["rate_pct"]), annual_cost_at_aum=Decimal(b["annual_cost_at_aum"]))
            for b in raw["fee_benchmarks"]
        ],
        net_worth_history=[NetWorthPoint(date=p["date"], value=Decimal(p["value"])) for p in raw["net_worth_history"]],
        risk_profile=RiskProfileSummary(**raw["risk_profile"]),
        alerts=[Alert(**a) for a in raw["alerts"]],
        ai_chat_remaining=raw["ai_chat_remaining"],
        subscription_tier=raw["subscription_tier"],
    )
