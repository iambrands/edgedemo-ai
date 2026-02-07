"""
Centralized mock data store for all EdgeAI features.
Returns demo data matching exact endpoint response shapes when the DB is unavailable.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# ── Standard IDs (must match backend/api/auth.py mock user) ───────────────
ADVISOR_ID = "a0000000-0000-4000-8000-000000000001"
FIRM_ID = "b0000000-0000-4000-8000-000000000001"

_now = datetime.utcnow


# ═══════════════════════════════════════════════════════════════════════════
# PROSPECTS
# ═══════════════════════════════════════════════════════════════════════════

def _prospects() -> List[Dict[str, Any]]:
    return [
        {
            "id": "c1000000-0000-4000-8000-000000000001",
            "advisor_id": ADVISOR_ID,
            "first_name": "Robert",
            "last_name": "Williams",
            "email": "r.williams@email.com",
            "phone": "(555) 567-8901",
            "company": "Williams Industries",
            "title": "CEO",
            "estimated_assets": 5_000_000,
            "lead_source": "referral",
            "status": "qualified",
            "stage": "discovery",
            "lead_score": 85,
            "score": 85,
            "notes": "Referred by John Smith. Looking to consolidate accounts from three custodians.",
            "next_action": "Schedule discovery meeting",
            "next_action_date": (_now() + timedelta(days=3)).isoformat(),
            "tags": ["HNW", "referral"],
            "days_in_stage": 5,
            "total_days_in_pipeline": 14,
            "created_at": (_now() - timedelta(days=14)).isoformat(),
            "updated_at": (_now() - timedelta(days=1)).isoformat(),
        },
        {
            "id": "c1000000-0000-4000-8000-000000000002",
            "advisor_id": ADVISOR_ID,
            "first_name": "Lisa",
            "last_name": "Anderson",
            "email": "l.anderson@email.com",
            "phone": "(555) 678-9012",
            "company": "Tech Startup Inc",
            "title": "Founder",
            "estimated_assets": 3_000_000,
            "lead_source": "website",
            "status": "contacted",
            "stage": "initial_contact",
            "lead_score": 72,
            "score": 72,
            "notes": "Submitted contact form. Recently sold company — liquidity event.",
            "next_action": "Initial phone call",
            "next_action_date": (_now() + timedelta(days=1)).isoformat(),
            "tags": ["tech", "liquidity-event"],
            "days_in_stage": 2,
            "total_days_in_pipeline": 2,
            "created_at": (_now() - timedelta(days=2)).isoformat(),
            "updated_at": (_now() - timedelta(hours=6)).isoformat(),
        },
        {
            "id": "c1000000-0000-4000-8000-000000000003",
            "advisor_id": ADVISOR_ID,
            "first_name": "David",
            "last_name": "Martinez",
            "email": "d.martinez@email.com",
            "phone": "(555) 789-0123",
            "company": "Martinez Law Firm",
            "title": "Partner",
            "estimated_assets": 2_000_000,
            "lead_source": "seminar",
            "status": "proposal_sent",
            "stage": "proposal",
            "lead_score": 90,
            "score": 90,
            "notes": "Attended retirement planning seminar. Very engaged, ready for proposal.",
            "next_action": "Send proposal",
            "next_action_date": _now().isoformat(),
            "tags": ["attorney", "retirement"],
            "days_in_stage": 7,
            "total_days_in_pipeline": 30,
            "created_at": (_now() - timedelta(days=30)).isoformat(),
            "updated_at": (_now() - timedelta(days=2)).isoformat(),
        },
        {
            "id": "c1000000-0000-4000-8000-000000000004",
            "advisor_id": ADVISOR_ID,
            "first_name": "Jennifer",
            "last_name": "Park",
            "email": "j.park@email.com",
            "phone": "(555) 890-1234",
            "company": "Park Medical Group",
            "title": "Physician",
            "estimated_assets": 1_500_000,
            "lead_source": "referral",
            "status": "negotiating",
            "stage": "negotiation",
            "lead_score": 88,
            "score": 88,
            "notes": "Physician looking for comprehensive financial planning. Reviewing proposal.",
            "next_action": "Follow up on proposal",
            "next_action_date": (_now() + timedelta(days=2)).isoformat(),
            "tags": ["physician", "financial-planning"],
            "days_in_stage": 4,
            "total_days_in_pipeline": 21,
            "created_at": (_now() - timedelta(days=21)).isoformat(),
            "updated_at": (_now() - timedelta(days=1)).isoformat(),
        },
    ]


def prospect_list_response(
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    items = _prospects()
    if status:
        items = [p for p in items if p["status"] == status]
    return {"prospects": items, "total": len(items), "page": page, "page_size": page_size}


def pipeline_summary_response() -> Dict[str, Any]:
    stages = {
        "contacted": {"count": 1, "value": 3_000_000},
        "qualified": {"count": 1, "value": 5_000_000},
        "proposal_sent": {"count": 1, "value": 2_000_000},
        "negotiating": {"count": 1, "value": 1_500_000},
    }
    return {
        "stages": stages,
        "total_prospects": 4,
        "total_pipeline_value": 11_500_000,
    }


def conversion_metrics_response(days: int = 90) -> Dict[str, Any]:
    return {
        "period_days": days,
        "total_created": 8,
        "won": 3,
        "lost": 1,
        "conversion_rate": 37.5,
        "in_progress": 4,
    }


def pending_tasks_response() -> Dict[str, Any]:
    return {
        "tasks": [
            {
                "id": "t1000000-0000-4000-8000-000000000001",
                "prospect_id": "c1000000-0000-4000-8000-000000000003",
                "type": "follow_up",
                "description": "Send proposal to David Martinez",
                "due_date": _now().isoformat(),
                "status": "pending",
                "created_at": (_now() - timedelta(days=2)).isoformat(),
            },
            {
                "id": "t1000000-0000-4000-8000-000000000002",
                "prospect_id": "c1000000-0000-4000-8000-000000000002",
                "type": "call",
                "description": "Initial phone call with Lisa Anderson",
                "due_date": (_now() + timedelta(days=1)).isoformat(),
                "status": "pending",
                "created_at": (_now() - timedelta(days=1)).isoformat(),
            },
        ],
        "total": 2,
    }


# ═══════════════════════════════════════════════════════════════════════════
# CUSTODIANS
# ═══════════════════════════════════════════════════════════════════════════

def available_custodians_response() -> Dict[str, Any]:
    return {
        "custodians": [
            {"id": "schwab", "custodian_type": "schwab", "display_name": "Charles Schwab", "supports_oauth": True, "logo_url": None, "status": "available"},
            {"id": "fidelity", "custodian_type": "fidelity", "display_name": "Fidelity Investments", "supports_oauth": True, "logo_url": None, "status": "available"},
            {"id": "td_ameritrade", "custodian_type": "td_ameritrade", "display_name": "TD Ameritrade", "supports_oauth": True, "logo_url": None, "status": "available"},
            {"id": "pershing", "custodian_type": "pershing", "display_name": "Pershing (BNY Mellon)", "supports_oauth": False, "logo_url": None, "status": "available"},
            {"id": "interactive_brokers", "custodian_type": "interactive_brokers", "display_name": "Interactive Brokers", "supports_oauth": True, "logo_url": None, "status": "available"},
        ],
        "total": 5,
    }


def custodian_connections_response() -> Dict[str, Any]:
    return {
        "connections": [
            {
                "id": "cc100000-0000-4000-8000-000000000001",
                "custodian_type": "schwab",
                "display_name": "Charles Schwab",
                "custodian_name": "Charles Schwab",
                "status": "active",
                "accounts_linked": 12,
                "total_assets": 15_500_000,
                "last_sync_at": (_now() - timedelta(hours=1)).isoformat(),
                "created_at": (_now() - timedelta(days=180)).isoformat(),
            },
            {
                "id": "cc100000-0000-4000-8000-000000000002",
                "custodian_type": "fidelity",
                "display_name": "Fidelity Investments",
                "custodian_name": "Fidelity Investments",
                "status": "active",
                "accounts_linked": 8,
                "total_assets": 9_200_000,
                "last_sync_at": (_now() - timedelta(hours=2)).isoformat(),
                "created_at": (_now() - timedelta(days=120)).isoformat(),
            },
            {
                "id": "cc100000-0000-4000-8000-000000000003",
                "custodian_type": "td_ameritrade",
                "display_name": "TD Ameritrade",
                "custodian_name": "TD Ameritrade",
                "status": "active",
                "accounts_linked": 5,
                "total_assets": 4_300_000,
                "last_sync_at": (_now() - timedelta(hours=3)).isoformat(),
                "created_at": (_now() - timedelta(days=90)).isoformat(),
            },
        ],
        "total": 3,
    }


def custodian_accounts_response() -> Dict[str, Any]:
    accts = [
        {"id": "ca100000-0000-4000-8000-00000000000" + str(i), "custodian_type": cust, "account_name": name, "account_number": num, "account_type": atype, "market_value": mv, "cash_balance": cash, "client_id": None, "client_name": cname, "household_id": None, "is_active": True, "last_updated": (_now() - timedelta(hours=h)).isoformat()}
        for i, (cust, name, num, atype, mv, cash, cname, h) in enumerate([
            ("schwab", "Smith Joint Brokerage", "****4567", "brokerage", 450_000, 25_000, "John Smith", 1),
            ("schwab", "Smith IRA", "****4568", "ira", 380_000, 8_000, "John Smith", 1),
            ("schwab", "Wilson 401k Rollover", "****4569", "rollover_ira", 620_000, 15_000, "Leslie Wilson", 1),
            ("fidelity", "Johnson Roth IRA", "****7890", "roth_ira", 650_000, 15_000, "Sarah Johnson", 2),
            ("fidelity", "Johnson Brokerage", "****7891", "brokerage", 1_200_000, 45_000, "Sarah Johnson", 2),
            ("td_ameritrade", "Chen Conservative", "****2345", "brokerage", 850_000, 85_000, "Michael Chen", 3),
        ], start=1)
    ]
    total_mv = sum(a["market_value"] for a in accts)
    total_cash = sum(a["cash_balance"] for a in accts)
    return {"accounts": accts, "total": len(accts), "total_market_value": total_mv, "total_cash_balance": total_cash}


def custodian_positions_response() -> Dict[str, Any]:
    positions = [
        {"symbol": "VTI", "security_name": "Vanguard Total Stock Market ETF", "asset_class": "US Equity", "total_quantity": 850, "total_market_value": 385_000, "total_cost_basis": 340_000, "unrealized_gain_loss": 45_000, "accounts": [{"account_name": "Smith Joint", "quantity": 400}, {"account_name": "Johnson Brokerage", "quantity": 450}]},
        {"symbol": "VXUS", "security_name": "Vanguard Intl Stock ETF", "asset_class": "International Equity", "total_quantity": 600, "total_market_value": 210_000, "total_cost_basis": 195_000, "unrealized_gain_loss": 15_000, "accounts": [{"account_name": "Smith Joint", "quantity": 300}, {"account_name": "Johnson Brokerage", "quantity": 300}]},
        {"symbol": "BND", "security_name": "Vanguard Total Bond Market ETF", "asset_class": "Fixed Income", "total_quantity": 1200, "total_market_value": 280_000, "total_cost_basis": 295_000, "unrealized_gain_loss": -15_000, "accounts": [{"account_name": "Chen Conservative", "quantity": 800}, {"account_name": "Smith IRA", "quantity": 400}]},
        {"symbol": "AAPL", "security_name": "Apple Inc.", "asset_class": "US Equity", "total_quantity": 500, "total_market_value": 120_000, "total_cost_basis": 85_000, "unrealized_gain_loss": 35_000, "accounts": [{"account_name": "Johnson Brokerage", "quantity": 500}]},
        {"symbol": "VNQ", "security_name": "Vanguard Real Estate ETF", "asset_class": "Real Estate", "total_quantity": 300, "total_market_value": 95_000, "total_cost_basis": 88_000, "unrealized_gain_loss": 7_000, "accounts": [{"account_name": "Wilson 401k Rollover", "quantity": 300}]},
        {"symbol": "VTIP", "security_name": "Vanguard Short-Term TIPS ETF", "asset_class": "Fixed Income", "total_quantity": 400, "total_market_value": 72_000, "total_cost_basis": 74_000, "unrealized_gain_loss": -2_000, "accounts": [{"account_name": "Chen Conservative", "quantity": 400}]},
    ]
    total_mv = sum(p["total_market_value"] for p in positions)
    total_cb = sum(p["total_cost_basis"] for p in positions)
    return {"positions": positions, "total_positions": len(positions), "total_market_value": total_mv, "total_cost_basis": total_cb}


def custodian_allocation_response() -> Dict[str, Any]:
    allocation = [
        {"asset_class": "US Equity", "market_value": 505_000, "percentage": 43.4},
        {"asset_class": "International Equity", "market_value": 210_000, "percentage": 18.0},
        {"asset_class": "Fixed Income", "market_value": 352_000, "percentage": 30.2},
        {"asset_class": "Real Estate", "market_value": 95_000, "percentage": 8.2},
        {"asset_class": "Cash", "market_value": 193_000, "percentage": 0.2},
    ]
    return {"total_value": sum(a["market_value"] for a in allocation), "allocation": allocation}


def custodian_transactions_response(page: int = 1, page_size: int = 50) -> Dict[str, Any]:
    txns = [
        {"id": f"tx-{i}", "account_name": acct, "custodian": cust, "transaction_type": ttype, "symbol": sym, "quantity": qty, "price": price, "gross_amount": amt, "net_amount": amt, "transaction_date": (_now() - timedelta(days=d)).isoformat(), "settlement_date": (_now() - timedelta(days=d - 2)).isoformat()}
        for i, (acct, cust, ttype, sym, qty, price, amt, d) in enumerate([
            ("Smith Joint", "schwab", "buy", "VTI", 50, 226.50, 11_325, 3),
            ("Johnson Brokerage", "fidelity", "sell", "AAPL", 25, 240.20, -6_005, 5),
            ("Chen Conservative", "td_ameritrade", "buy", "BND", 100, 72.30, 7_230, 7),
            ("Smith IRA", "schwab", "dividend", "VTI", 0, 0, 850, 10),
            ("Johnson Roth IRA", "fidelity", "buy", "VXUS", 75, 58.40, 4_380, 12),
            ("Wilson 401k Rollover", "schwab", "buy", "VNQ", 40, 84.50, 3_380, 15),
        ], start=1)
    ]
    return {"transactions": txns, "total": len(txns), "page": page, "page_size": page_size}


# ═══════════════════════════════════════════════════════════════════════════
# TAX-LOSS HARVESTING
# ═══════════════════════════════════════════════════════════════════════════

def _tax_opportunities() -> List[Dict[str, Any]]:
    return [
        {
            "id": "th100000-0000-4000-8000-000000000001",
            "advisor_id": ADVISOR_ID,
            "client_id": None,
            "account_id": None,
            "symbol": "VTI",
            "security_name": "Vanguard Total Stock Market ETF",
            "shares": 100,
            "cost_basis": 22_500,
            "current_price": 198.00,
            "current_value": 19_800,
            "unrealized_loss": -2_700,
            "short_term_loss": -2_700,
            "long_term_loss": 0,
            "loss_type": "short_term",
            "holding_period_days": 180,
            "wash_sale_risk": False,
            "wash_sale_until": None,
            "estimated_tax_savings": 810,
            "replacement_symbol": "ITOT",
            "replacement_name": "iShares Core S&P Total US Stock",
            "status": "identified",
            "expires_at": (_now() + timedelta(days=30)).isoformat(),
            "created_at": (_now() - timedelta(days=1)).isoformat(),
            "updated_at": (_now() - timedelta(hours=2)).isoformat(),
        },
        {
            "id": "th100000-0000-4000-8000-000000000002",
            "advisor_id": ADVISOR_ID,
            "client_id": None,
            "account_id": None,
            "symbol": "ARKK",
            "security_name": "ARK Innovation ETF",
            "shares": 50,
            "cost_basis": 8_500,
            "current_price": 104.00,
            "current_value": 5_200,
            "unrealized_loss": -3_300,
            "short_term_loss": 0,
            "long_term_loss": -3_300,
            "loss_type": "long_term",
            "holding_period_days": 450,
            "wash_sale_risk": True,
            "wash_sale_until": (_now() + timedelta(days=15)).isoformat(),
            "estimated_tax_savings": 990,
            "replacement_symbol": "QQQM",
            "replacement_name": "Invesco NASDAQ 100 ETF",
            "status": "identified",
            "expires_at": (_now() + timedelta(days=30)).isoformat(),
            "created_at": (_now() - timedelta(days=3)).isoformat(),
            "updated_at": (_now() - timedelta(hours=6)).isoformat(),
        },
        {
            "id": "th100000-0000-4000-8000-000000000003",
            "advisor_id": ADVISOR_ID,
            "client_id": None,
            "account_id": None,
            "symbol": "BND",
            "security_name": "Vanguard Total Bond Market ETF",
            "shares": 200,
            "cost_basis": 18_000,
            "current_price": 82.00,
            "current_value": 16_400,
            "unrealized_loss": -1_600,
            "short_term_loss": 0,
            "long_term_loss": -1_600,
            "loss_type": "long_term",
            "holding_period_days": 720,
            "wash_sale_risk": False,
            "wash_sale_until": None,
            "estimated_tax_savings": 480,
            "replacement_symbol": "AGG",
            "replacement_name": "iShares Core US Aggregate Bond",
            "status": "recommended",
            "expires_at": (_now() + timedelta(days=30)).isoformat(),
            "created_at": (_now() - timedelta(days=5)).isoformat(),
            "updated_at": (_now() - timedelta(days=1)).isoformat(),
        },
    ]


def tax_opportunity_list_response() -> Dict[str, Any]:
    return {"opportunities": _tax_opportunities(), "total": 3}


def tax_summary_response() -> Dict[str, Any]:
    return {"total_opportunities": 3, "total_harvestable_loss": 7_600, "total_estimated_savings": 2_280}


def tax_settings_response() -> Dict[str, Any]:
    return {
        "id": "ts100000-0000-4000-8000-000000000001",
        "min_loss_amount": 500,
        "min_loss_percentage": 5.0,
        "min_tax_savings": 100,
        "short_term_tax_rate": 37.0,
        "long_term_tax_rate": 20.0,
        "auto_identify": True,
        "auto_recommend": False,
        "require_approval": True,
        "excluded_symbols": [],
        "notify_on_opportunity": True,
        "notify_on_wash_sale_risk": True,
        "is_active": True,
    }


def tax_wash_sales_response() -> List[Dict[str, Any]]:
    return [
        {
            "id": "ws-001",
            "symbol": "ARKK",
            "sold_date": (_now() - timedelta(days=15)).isoformat(),
            "sold_shares": 25,
            "sold_amount": 2_600,
            "watch_until": (_now() + timedelta(days=15)).isoformat(),
            "watch_symbols": ["ARKK", "ARKG", "ARKW"],
            "status": "active",
        }
    ]


# ═══════════════════════════════════════════════════════════════════════════
# MODEL PORTFOLIOS
# ═══════════════════════════════════════════════════════════════════════════

def _holding(hid: str, mid: str, symbol: str, name: str, asset_class: str, weight: float, er: float = 0.03) -> Dict[str, Any]:
    """Build a ModelHolding dict matching the frontend ModelHolding interface."""
    return {
        "id": hid,
        "model_id": mid,
        "symbol": symbol,
        "security_name": name,
        "security_type": "etf",
        "asset_class": asset_class,
        "target_weight_pct": weight,
        "min_weight_pct": max(0, weight - 5),
        "max_weight_pct": weight + 5,
        "expense_ratio": er,
    }


def _model_portfolios() -> List[Dict[str, Any]]:
    m1 = "mp100000-0000-4000-8000-000000000001"
    m2 = "mp100000-0000-4000-8000-000000000002"
    m3 = "mp100000-0000-4000-8000-000000000003"
    m4 = "mp100000-0000-4000-8000-000000000004"
    return [
        {
            "id": m1,
            "advisor_id": ADVISOR_ID,
            "name": "EdgeAI Growth",
            "ticker": None,
            "description": "Aggressive growth portfolio — US equities & emerging markets",
            "category": "growth",
            "risk_level": 8,
            "investment_style": "active",
            "status": "active",
            "visibility": "private",
            "rebalance_frequency": "quarterly",
            "drift_threshold_pct": 5.0,
            "tax_loss_harvesting_enabled": False,
            "benchmark_symbol": "SPY",
            "ytd_return": 18.5,
            "one_year_return": 22.3,
            "three_year_return": 45.2,
            "inception_return": 62.1,
            "inception_date": (_now() - timedelta(days=730)).isoformat(),
            "total_aum": 45_000_000,
            "total_subscribers": 32,
            "tags": ["growth", "US equity"],
            "holdings": [
                _holding("h1", m1, "VTI", "Vanguard Total Stock Market ETF", "us_equity", 40, 0.03),
                _holding("h2", m1, "VGT", "Vanguard Information Technology ETF", "us_equity", 20, 0.10),
                _holding("h3", m1, "VWO", "Vanguard Emerging Markets ETF", "emerging_markets", 15, 0.08),
                _holding("h4", m1, "VXUS", "Vanguard Total International ETF", "intl_equity", 15, 0.07),
                _holding("h5", m1, "BND", "Vanguard Total Bond Market ETF", "us_fixed_income", 10, 0.03),
            ],
            "created_at": (_now() - timedelta(days=730)).isoformat(),
            "updated_at": (_now() - timedelta(days=7)).isoformat(),
        },
        {
            "id": m2,
            "advisor_id": ADVISOR_ID,
            "name": "EdgeAI Balanced",
            "ticker": None,
            "description": "Moderate risk — growth & income blend",
            "category": "balanced",
            "risk_level": 5,
            "investment_style": "passive",
            "status": "active",
            "visibility": "private",
            "rebalance_frequency": "quarterly",
            "drift_threshold_pct": 5.0,
            "tax_loss_harvesting_enabled": True,
            "benchmark_symbol": "VBINX",
            "ytd_return": 12.1,
            "one_year_return": 14.8,
            "three_year_return": 32.5,
            "inception_return": 48.7,
            "inception_date": (_now() - timedelta(days=1095)).isoformat(),
            "total_aum": 78_000_000,
            "total_subscribers": 56,
            "tags": ["balanced", "core"],
            "holdings": [
                _holding("h6", m2, "VTI", "Vanguard Total Stock Market ETF", "us_equity", 35, 0.03),
                _holding("h7", m2, "VXUS", "Vanguard Total International ETF", "intl_equity", 15, 0.07),
                _holding("h8", m2, "BND", "Vanguard Total Bond Market ETF", "us_fixed_income", 30, 0.03),
                _holding("h9", m2, "BNDX", "Vanguard Total International Bond ETF", "intl_fixed_income", 10, 0.07),
                _holding("h10", m2, "VNQ", "Vanguard Real Estate ETF", "real_estate", 10, 0.12),
            ],
            "created_at": (_now() - timedelta(days=1095)).isoformat(),
            "updated_at": (_now() - timedelta(days=14)).isoformat(),
        },
        {
            "id": m3,
            "advisor_id": ADVISOR_ID,
            "name": "EdgeAI Conservative Income",
            "ticker": None,
            "description": "Capital preservation & income focused",
            "category": "income",
            "risk_level": 3,
            "investment_style": "passive",
            "status": "active",
            "visibility": "private",
            "rebalance_frequency": "semi_annual",
            "drift_threshold_pct": 3.0,
            "tax_loss_harvesting_enabled": True,
            "benchmark_symbol": "AGG",
            "ytd_return": 6.2,
            "one_year_return": 7.8,
            "three_year_return": 18.3,
            "inception_return": 28.9,
            "inception_date": (_now() - timedelta(days=1460)).isoformat(),
            "total_aum": 32_000_000,
            "total_subscribers": 28,
            "tags": ["income", "conservative"],
            "holdings": [
                _holding("h11", m3, "BND", "Vanguard Total Bond Market ETF", "us_fixed_income", 40, 0.03),
                _holding("h12", m3, "VCSH", "Vanguard Short-Term Corp Bond ETF", "us_fixed_income", 20, 0.04),
                _holding("h13", m3, "VIG", "Vanguard Dividend Appreciation ETF", "us_equity", 20, 0.06),
                _holding("h14", m3, "VTIP", "Vanguard Short-Term TIPS ETF", "us_fixed_income", 10, 0.04),
                _holding("h15", m3, "VMBS", "Vanguard Mortgage-Backed ETF", "us_fixed_income", 10, 0.04),
            ],
            "created_at": (_now() - timedelta(days=1460)).isoformat(),
            "updated_at": (_now() - timedelta(days=30)).isoformat(),
        },
        {
            "id": m4,
            "advisor_id": None,
            "name": "DFA Global Equity",
            "ticker": None,
            "description": "Dimensional factor-based global equity strategy",
            "category": "growth",
            "risk_level": 8,
            "investment_style": "factor",
            "status": "active",
            "visibility": "public",
            "rebalance_frequency": "quarterly",
            "drift_threshold_pct": 5.0,
            "tax_loss_harvesting_enabled": False,
            "benchmark_symbol": "ACWI",
            "ytd_return": 16.8,
            "one_year_return": 19.5,
            "three_year_return": 41.2,
            "inception_return": 85.4,
            "inception_date": (_now() - timedelta(days=2555)).isoformat(),
            "total_aum": 125_000_000,
            "total_subscribers": 0,
            "subscription_fee_monthly": 49,
            "subscription_fee_annual": 499,
            "tags": ["factor", "global"],
            "holdings": [
                _holding("h16", m4, "DFAC", "DFA US Core Equity Market ETF", "us_equity", 35, 0.19),
                _holding("h17", m4, "DFAI", "DFA International Core Equity ETF", "intl_equity", 25, 0.18),
                _holding("h18", m4, "DFAE", "DFA Emerging Markets Core Equity ETF", "emerging_markets", 15, 0.35),
                _holding("h19", m4, "DFSV", "DFA US Small Cap Value ETF", "us_equity", 15, 0.31),
                _holding("h20", m4, "DISV", "DFA International Small Cap Value ETF", "intl_equity", 10, 0.42),
            ],
            "created_at": (_now() - timedelta(days=2555)).isoformat(),
            "updated_at": (_now() - timedelta(days=60)).isoformat(),
        },
    ]


def model_list_response() -> Dict[str, Any]:
    own = [m for m in _model_portfolios() if m["advisor_id"] == ADVISOR_ID]
    return {"models": own, "total": len(own)}


def marketplace_response() -> Dict[str, Any]:
    return {"models": _model_portfolios(), "total": len(_model_portfolios())}


def model_assignments_response() -> Dict[str, Any]:
    return {
        "assignments": [
            {
                "id": "as-001",
                "subscription_id": "sub-001",
                "account_id": "ca100000-0000-4000-8000-000000000001",
                "model_id": "mp100000-0000-4000-8000-000000000002",
                "client_id": None,
                "assigned_by": ADVISOR_ID,
                "is_active": True,
                "account_value": 450_000,
                "current_drift_pct": 1.2,
                "max_holding_drift_pct": 0.8,
                "last_rebalanced_at": (_now() - timedelta(days=30)).isoformat(),
                "created_at": (_now() - timedelta(days=60)).isoformat(),
            },
            {
                "id": "as-002",
                "subscription_id": "sub-002",
                "account_id": "ca100000-0000-4000-8000-000000000004",
                "model_id": "mp100000-0000-4000-8000-000000000001",
                "client_id": None,
                "assigned_by": ADVISOR_ID,
                "is_active": True,
                "account_value": 650_000,
                "current_drift_pct": 2.8,
                "max_holding_drift_pct": 1.5,
                "last_rebalanced_at": (_now() - timedelta(days=45)).isoformat(),
                "created_at": (_now() - timedelta(days=45)).isoformat(),
            },
            {
                "id": "as-003",
                "subscription_id": "sub-003",
                "account_id": "ca100000-0000-4000-8000-000000000006",
                "model_id": "mp100000-0000-4000-8000-000000000003",
                "client_id": None,
                "assigned_by": ADVISOR_ID,
                "is_active": True,
                "account_value": 850_000,
                "current_drift_pct": 0.5,
                "max_holding_drift_pct": 0.3,
                "last_rebalanced_at": (_now() - timedelta(days=14)).isoformat(),
                "created_at": (_now() - timedelta(days=30)).isoformat(),
            },
        ],
        "total": 3,
    }


def rebalance_signals_response() -> Dict[str, Any]:
    return {
        "signals": [
            {
                "id": "rs-001",
                "assignment_id": "as-002",
                "model_id": "mp100000-0000-4000-8000-000000000001",
                "account_id": "ca100000-0000-4000-8000-000000000004",
                "advisor_id": ADVISOR_ID,
                "trigger_type": "drift",
                "trigger_value": 2.8,
                "status": "pending",
                "account_value": 650_000,
                "cash_available": 15_000,
                "total_drift_pct": 2.8,
                "estimated_trades_count": 3,
                "estimated_buy_value": 9_200,
                "estimated_sell_value": 9_200,
                "trades_required": [],
                "created_at": (_now() - timedelta(hours=6)).isoformat(),
            },
        ],
        "total": 1,
        "pending": 1,
    }


# ═══════════════════════════════════════════════════════════════════════════
# ALTERNATIVE ASSETS
# ═══════════════════════════════════════════════════════════════════════════

def _alt_investments() -> List[Dict[str, Any]]:
    return [
        {
            "id": "ai100000-0000-4000-8000-000000000001",
            "advisor_id": ADVISOR_ID,
            "client_id": None,
            "name": "Sequoia Capital Fund XV",
            "fund_name": "Sequoia Capital Fund XV",
            "sponsor_name": "Sequoia Capital",
            "asset_type": "private_equity",
            "vintage_year": 2021,
            "total_commitment": 500_000,
            "called_capital": 350_000,
            "uncalled_capital": 150_000,
            "current_nav": 485_000,
            "total_distributions": 75_000,
            "irr": 18.5,
            "tvpi": 1.60,
            "dpi": 0.21,
            "rvpi": 1.39,
            "moic": 1.60,
            "status": "active",
            "created_at": (_now() - timedelta(days=365)).isoformat(),
            "updated_at": (_now() - timedelta(days=7)).isoformat(),
        },
        {
            "id": "ai100000-0000-4000-8000-000000000002",
            "advisor_id": ADVISOR_ID,
            "client_id": None,
            "name": "Bridgewater All Weather Fund",
            "fund_name": "Bridgewater All Weather Fund",
            "sponsor_name": "Bridgewater Associates",
            "asset_type": "hedge_fund",
            "vintage_year": 2022,
            "total_commitment": 250_000,
            "called_capital": 250_000,
            "uncalled_capital": 0,
            "current_nav": 278_000,
            "total_distributions": 22_000,
            "irr": 8.2,
            "tvpi": 1.20,
            "dpi": 0.09,
            "rvpi": 1.11,
            "moic": 1.20,
            "status": "active",
            "created_at": (_now() - timedelta(days=240)).isoformat(),
            "updated_at": (_now() - timedelta(days=14)).isoformat(),
        },
        {
            "id": "ai100000-0000-4000-8000-000000000003",
            "advisor_id": ADVISOR_ID,
            "client_id": None,
            "name": "Blackstone Real Estate Partners IX",
            "fund_name": "Blackstone Real Estate Partners IX",
            "sponsor_name": "Blackstone",
            "asset_type": "real_estate",
            "vintage_year": 2020,
            "total_commitment": 200_000,
            "called_capital": 180_000,
            "uncalled_capital": 20_000,
            "current_nav": 195_000,
            "total_distributions": 45_000,
            "irr": 12.3,
            "tvpi": 1.33,
            "dpi": 0.25,
            "rvpi": 1.08,
            "moic": 1.33,
            "status": "active",
            "created_at": (_now() - timedelta(days=500)).isoformat(),
            "updated_at": (_now() - timedelta(days=30)).isoformat(),
        },
        {
            "id": "ai100000-0000-4000-8000-000000000004",
            "advisor_id": ADVISOR_ID,
            "client_id": None,
            "name": "Apollo Direct Lending Fund",
            "fund_name": "Apollo Direct Lending Fund",
            "sponsor_name": "Apollo Global Management",
            "asset_type": "private_credit",
            "vintage_year": 2023,
            "total_commitment": 150_000,
            "called_capital": 150_000,
            "uncalled_capital": 0,
            "current_nav": 162_000,
            "total_distributions": 18_000,
            "irr": 10.5,
            "tvpi": 1.20,
            "dpi": 0.12,
            "rvpi": 1.08,
            "moic": 1.20,
            "status": "active",
            "created_at": (_now() - timedelta(days=180)).isoformat(),
            "updated_at": (_now() - timedelta(days=10)).isoformat(),
        },
    ]


def alt_investment_list_response() -> Dict[str, Any]:
    return {"investments": _alt_investments(), "total": len(_alt_investments())}


def alt_pending_calls_response() -> Dict[str, Any]:
    calls = [
        {
            "id": "cc-alt-001",
            "investment_id": "ai100000-0000-4000-8000-000000000001",
            "fund_name": "Sequoia Capital Fund XV",
            "call_amount": 75_000,
            "due_date": (_now() + timedelta(days=45)).isoformat(),
            "status": "pending",
            "notice_date": (_now() - timedelta(days=5)).isoformat(),
            "purpose": "Follow-on investment in portfolio company",
        },
        {
            "id": "cc-alt-002",
            "investment_id": "ai100000-0000-4000-8000-000000000003",
            "fund_name": "Blackstone Real Estate Partners IX",
            "call_amount": 20_000,
            "due_date": (_now() + timedelta(days=90)).isoformat(),
            "status": "pending",
            "notice_date": (_now() - timedelta(days=2)).isoformat(),
            "purpose": "Final capital call — property acquisition",
        },
    ]
    return {"calls": calls, "total": len(calls), "total_amount": sum(c["call_amount"] for c in calls)}


# ═══════════════════════════════════════════════════════════════════════════
# CONVERSATION INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════

def _analyses() -> List[Dict[str, Any]]:
    return [
        {
            "id": "cv100000-0000-4000-8000-000000000001",
            "advisor_id": ADVISOR_ID,
            "meeting_id": None,
            "client_name": "John Smith",
            "channel": "meeting",
            "primary_topic": "portfolio_review",
            "topics_discussed": ["Q4 performance", "rebalancing", "ESG investing"],
            "sentiment_score": 0.78,
            "engagement_score": 85,
            "talk_ratio": 0.42,
            "total_duration_seconds": 2700,
            "summary": "Quarterly portfolio review. Client satisfied with returns. Discussed increasing equity allocation and ESG options.",
            "compliance_flags": [],
            "action_items": [
                {"id": "ai-001", "title": "Rebalance portfolio to 70/30", "status": "pending", "priority": "high", "due_date": (_now() + timedelta(days=7)).isoformat(), "assigned_to": "Leslie Wilson"},
                {"id": "ai-002", "title": "Research ESG fund options", "status": "pending", "priority": "medium", "due_date": (_now() + timedelta(days=14)).isoformat(), "assigned_to": "Leslie Wilson"},
            ],
            "created_at": (_now() - timedelta(days=7)).isoformat(),
            "updated_at": (_now() - timedelta(days=7)).isoformat(),
        },
        {
            "id": "cv100000-0000-4000-8000-000000000002",
            "advisor_id": ADVISOR_ID,
            "meeting_id": None,
            "client_name": "Sarah Johnson",
            "channel": "phone",
            "primary_topic": "tax_planning",
            "topics_discussed": ["Roth conversion", "tax brackets", "year-end planning"],
            "sentiment_score": 0.85,
            "engagement_score": 90,
            "talk_ratio": 0.38,
            "total_duration_seconds": 1800,
            "summary": "Discussed Roth conversion strategy. Client wants to convert $100k this year while in lower bracket.",
            "compliance_flags": [
                {"id": "cf-001", "category": "suitability", "risk_level": "low", "flagged_text": "Recommended Roth conversion", "status": "reviewed", "resolution": "Appropriate for client's tax situation"},
            ],
            "action_items": [
                {"id": "ai-003", "title": "Model Roth conversion tax impact", "status": "completed", "priority": "high", "due_date": (_now() - timedelta(days=2)).isoformat(), "assigned_to": "Leslie Wilson"},
            ],
            "created_at": (_now() - timedelta(days=3)).isoformat(),
            "updated_at": (_now() - timedelta(days=2)).isoformat(),
        },
        {
            "id": "cv100000-0000-4000-8000-000000000003",
            "advisor_id": ADVISOR_ID,
            "meeting_id": None,
            "client_name": "Michael Chen",
            "channel": "email",
            "primary_topic": "fixed_income",
            "topics_discussed": ["CD rates", "bond allocation", "risk tolerance"],
            "sentiment_score": 0.62,
            "engagement_score": 70,
            "talk_ratio": 0.50,
            "total_duration_seconds": 900,
            "summary": "Client inquired about rising CD rates and whether to move funds from bonds. Reinforced importance of diversification.",
            "compliance_flags": [],
            "action_items": [
                {"id": "ai-004", "title": "Prepare CD vs bond comparison", "status": "pending", "priority": "medium", "due_date": (_now() + timedelta(days=5)).isoformat(), "assigned_to": "Leslie Wilson"},
            ],
            "created_at": (_now() - timedelta(days=1)).isoformat(),
            "updated_at": (_now() - timedelta(hours=12)).isoformat(),
        },
    ]


def conversation_analyses_response() -> Dict[str, Any]:
    return {"analyses": _analyses(), "total": len(_analyses())}


def conversation_metrics_response(days: int = 30) -> Dict[str, Any]:
    return {
        "period_days": days,
        "total_conversations": 12,
        "avg_sentiment_score": 0.75,
        "avg_engagement_score": 82,
        "total_compliance_flags": 1,
        "action_items_created": 8,
        "action_items_completed": 5,
        "top_topics": {
            "portfolio_review": 4,
            "tax_planning": 3,
            "retirement": 2,
            "risk_tolerance": 2,
            "fixed_income": 1,
        },
    }


def conversation_flags_response() -> Dict[str, Any]:
    flags = [
        {
            "id": "cf-001",
            "analysis_id": "cv100000-0000-4000-8000-000000000002",
            "category": "suitability",
            "risk_level": "low",
            "flagged_text": "Recommended Roth conversion of $100k",
            "context": "Client in lower tax bracket this year. Conversion aligns with long-term plan.",
            "status": "reviewed",
            "reviewed_by": ADVISOR_ID,
            "resolution": "Appropriate recommendation for client's tax situation",
            "created_at": (_now() - timedelta(days=3)).isoformat(),
        },
        {
            "id": "cf-002",
            "analysis_id": "cv100000-0000-4000-8000-000000000001",
            "category": "documentation",
            "risk_level": "medium",
            "flagged_text": "Discussed increasing equity allocation without updating IPS",
            "context": "Client wants to move from 60/40 to 70/30 allocation.",
            "status": "pending",
            "reviewed_by": None,
            "resolution": None,
            "created_at": (_now() - timedelta(days=7)).isoformat(),
        },
    ]
    return {"flags": flags, "total": len(flags), "pending": 1, "high_risk": 0}


def conversation_action_items_response() -> Dict[str, Any]:
    items = [
        {"id": "ai-001", "analysis_id": "cv100000-0000-4000-8000-000000000001", "title": "Rebalance portfolio to 70/30", "description": "Increase equity allocation per client request", "status": "pending", "priority": "high", "due_date": (_now() + timedelta(days=7)).isoformat(), "assigned_to": "Leslie Wilson", "created_at": (_now() - timedelta(days=7)).isoformat()},
        {"id": "ai-002", "analysis_id": "cv100000-0000-4000-8000-000000000001", "title": "Research ESG fund options", "description": "Client interested in sustainable investing options", "status": "pending", "priority": "medium", "due_date": (_now() + timedelta(days=14)).isoformat(), "assigned_to": "Leslie Wilson", "created_at": (_now() - timedelta(days=7)).isoformat()},
        {"id": "ai-003", "analysis_id": "cv100000-0000-4000-8000-000000000002", "title": "Model Roth conversion tax impact", "description": "Run scenarios for $50k, $75k, $100k conversions", "status": "completed", "priority": "high", "due_date": (_now() - timedelta(days=2)).isoformat(), "assigned_to": "Leslie Wilson", "completed_at": (_now() - timedelta(days=2)).isoformat(), "created_at": (_now() - timedelta(days=3)).isoformat()},
        {"id": "ai-004", "analysis_id": "cv100000-0000-4000-8000-000000000003", "title": "Prepare CD vs bond comparison", "description": "Show client rate comparison and portfolio impact", "status": "pending", "priority": "medium", "due_date": (_now() + timedelta(days=5)).isoformat(), "assigned_to": "Leslie Wilson", "created_at": (_now() - timedelta(days=1)).isoformat()},
    ]
    pending = [i for i in items if i["status"] == "pending"]
    overdue = [i for i in pending if i["due_date"] < _now().isoformat()]
    return {"items": items, "total": len(items), "pending": len(pending), "overdue": len(overdue)}


# ═══════════════════════════════════════════════════════════════════════════
# LIQUIDITY
# ═══════════════════════════════════════════════════════════════════════════

def liquidity_withdrawals_response() -> List[Dict[str, Any]]:
    return [
        {
            "id": "wr100000-0000-4000-8000-000000000001",
            "client_id": "c0000000-0000-4000-8000-000000000001",
            "requested_amount": 25_000,
            "requested_date": (_now() - timedelta(days=3)).isoformat(),
            "purpose": "Home renovation",
            "priority": "normal",
            "lot_selection": "tax_opt",
            "status": "pending_approval",
            "optimized_plan_id": "lp-001",
            "plans": [
                {
                    "id": "lp-001",
                    "strategy": "tax_optimized",
                    "is_recommended": True,
                    "total_amount": 25_000,
                    "estimated_tax_cost": 750,
                    "estimated_wash_sale_risk": False,
                    "lots_count": 3,
                    "created_at": (_now() - timedelta(days=3)).isoformat(),
                },
                {
                    "id": "lp-002",
                    "strategy": "pro_rata",
                    "is_recommended": False,
                    "total_amount": 25_000,
                    "estimated_tax_cost": 1_200,
                    "estimated_wash_sale_risk": False,
                    "lots_count": 5,
                    "created_at": (_now() - timedelta(days=3)).isoformat(),
                },
            ],
            "created_at": (_now() - timedelta(days=3)).isoformat(),
            "updated_at": (_now() - timedelta(days=3)).isoformat(),
        },
        {
            "id": "wr100000-0000-4000-8000-000000000002",
            "client_id": "c0000000-0000-4000-8000-000000000002",
            "requested_amount": 85_000,
            "requested_date": (_now() - timedelta(days=7)).isoformat(),
            "purpose": "Quarterly distribution",
            "priority": "high",
            "lot_selection": "tax_opt",
            "status": "approved",
            "optimized_plan_id": "lp-003",
            "plans": [
                {
                    "id": "lp-003",
                    "strategy": "tax_optimized",
                    "is_recommended": True,
                    "total_amount": 85_000,
                    "estimated_tax_cost": 2_500,
                    "estimated_wash_sale_risk": True,
                    "lots_count": 8,
                    "created_at": (_now() - timedelta(days=7)).isoformat(),
                },
            ],
            "created_at": (_now() - timedelta(days=7)).isoformat(),
            "updated_at": (_now() - timedelta(days=5)).isoformat(),
        },
    ]


def liquidity_profile_response(client_id: str) -> Dict[str, Any]:
    return {
        "id": "lpr-001",
        "client_id": client_id,
        "default_priority": "normal",
        "default_lot_selection": "tax_opt",
        "federal_tax_bracket": 37.0,
        "state_tax_rate": 0.0,
        "capital_gains_rate_short": 37.0,
        "capital_gains_rate_long": 20.0,
        "min_cash_reserve": 10_000,
        "max_single_position_liquidation_pct": 25.0,
        "avoid_wash_sales": True,
        "ytd_short_term_gains": 5_200,
        "ytd_long_term_gains": 12_800,
        "ytd_short_term_losses": 1_500,
        "ytd_long_term_losses": 3_200,
        "loss_carryforward": 0,
        "created_at": (_now() - timedelta(days=90)).isoformat(),
        "updated_at": (_now() - timedelta(days=7)).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════
# COMPLIANCE DOCS (ADV 2B / Form CRS)
# ═══════════════════════════════════════════════════════════════════════════

def compliance_documents_response() -> List[Dict[str, Any]]:
    return [
        {
            "id": "cd100000-0000-4000-8000-000000000001",
            "document_type": "adv_part_2b",
            "title": "ADV Part 2B — Leslie Wilson",
            "description": "Brochure supplement for advisory representative",
            "status": "published",
            "current_version_id": "dv-001",
            "firm_id": FIRM_ID,
            "effective_date": (_now() - timedelta(days=90)).isoformat(),
            "created_at": (_now() - timedelta(days=365)).isoformat(),
            "updated_at": (_now() - timedelta(days=30)).isoformat(),
        },
        {
            "id": "cd100000-0000-4000-8000-000000000002",
            "document_type": "form_crs",
            "title": "Form CRS — IAB Advisors, Inc.",
            "description": "Client Relationship Summary",
            "status": "published",
            "current_version_id": "dv-002",
            "firm_id": FIRM_ID,
            "effective_date": (_now() - timedelta(days=60)).isoformat(),
            "created_at": (_now() - timedelta(days=365)).isoformat(),
            "updated_at": (_now() - timedelta(days=15)).isoformat(),
        },
    ]


def compliance_doc_versions_response(document_id: str) -> List[Dict[str, Any]]:
    return [
        {
            "id": "dv-001" if "001" in document_id else "dv-002",
            "document_id": document_id,
            "version_number": 1,
            "status": "published",
            "created_by": ADVISOR_ID,
            "approved_by": ADVISOR_ID,
            "created_at": (_now() - timedelta(days=90)).isoformat(),
            "published_at": (_now() - timedelta(days=88)).isoformat(),
        },
    ]


def compliance_adv2b_data_response(advisor_id: str) -> Dict[str, Any]:
    return {
        "id": "adv-data-001",
        "advisor_id": advisor_id,
        "firm_id": FIRM_ID,
        "full_name": "Leslie Wilson",
        "crd_number": "7891234",
        "education": [
            {"institution": "University of Texas at Austin", "degree": "BBA Finance", "year": 2005},
            {"institution": "CFP Board", "degree": "Certified Financial Planner", "year": 2008},
        ],
        "professional_designations": ["CFP®", "Series 65"],
        "business_experience": [
            {"firm": "IAB Advisors, Inc.", "title": "Managing Partner", "start_year": 2018, "end_year": None},
            {"firm": "Morgan Stanley", "title": "Senior Financial Advisor", "start_year": 2010, "end_year": 2018},
            {"firm": "Merrill Lynch", "title": "Financial Advisor", "start_year": 2005, "end_year": 2010},
        ],
        "disciplinary_history": "No disciplinary history.",
        "other_business_activities": "None.",
        "additional_compensation": "None.",
        "supervision": {
            "supervisor": "James Thompson, Chief Compliance Officer",
            "phone": "(555) 100-2000",
        },
        "updated_at": (_now() - timedelta(days=30)).isoformat(),
    }


def compliance_form_crs_data_response() -> Dict[str, Any]:
    return {
        "id": "crs-data-001",
        "firm_id": FIRM_ID,
        "firm_name": "IAB Advisors, Inc.",
        "crd_number": "7891234",
        "website": "https://iabadvisors.com",
        "introduction": "IAB Advisors, Inc. is registered with the Securities and Exchange Commission as an investment adviser.",
        "services_offered": "We offer investment advisory services including discretionary portfolio management, financial planning, and retirement planning.",
        "fees_and_costs": "We charge an asset-based fee ranging from 0.50% to 1.00% annually, depending on portfolio size.",
        "conflicts_of_interest": "As a fee-only advisor, we do not receive commissions. We may receive referral fees from third-party service providers.",
        "disciplinary_history": "We have no disciplinary history. Visit investor.gov/CRS for a free search tool.",
        "additional_information": "For additional information about our advisory services, visit www.adviserinfo.sec.gov.",
        "conversation_starters": [
            "Given my financial situation, should I choose an investment advisory service? Why or why not?",
            "How will you choose investments to recommend to me?",
            "What is your relevant experience, including your licenses, education and other qualifications?",
        ],
        "updated_at": (_now() - timedelta(days=15)).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════
# COMPLIANCE ALERTS
# ═══════════════════════════════════════════════════════════════════════════

def _compliance_alerts() -> List[Dict[str, Any]]:
    return [
        {
            "id": "al100000-0000-4000-8000-000000000001",
            "advisor_id": ADVISOR_ID,
            "title": "NVDA concentration at 47% in Robinhood account",
            "description": "Single position exceeds 40% concentration threshold. Consider rebalancing to reduce idiosyncratic risk.",
            "category": "concentration",
            "severity": "high",
            "status": "open",
            "client_name": "Sarah Johnson",
            "ai_analysis": {"recommendation": "Sell 20% of NVDA position and redeploy into VTI or sector ETFs", "confidence": 0.92},
            "due_date": (_now() + timedelta(days=7)).isoformat(),
            "created_at": (_now() - timedelta(days=2)).isoformat(),
        },
        {
            "id": "al100000-0000-4000-8000-000000000002",
            "advisor_id": ADVISOR_ID,
            "title": "NW Mutual VA total fees at 2.35%",
            "description": "Variable annuity fees exceed recommended threshold. Consider 1035 exchange after surrender period ends.",
            "category": "suitability",
            "severity": "medium",
            "status": "under_review",
            "client_name": "John Smith",
            "ai_analysis": {"recommendation": "Wait for surrender period to end (6 months), then 1035 exchange to low-cost VA", "confidence": 0.85},
            "due_date": (_now() + timedelta(days=14)).isoformat(),
            "created_at": (_now() - timedelta(days=5)).isoformat(),
        },
        {
            "id": "al100000-0000-4000-8000-000000000003",
            "advisor_id": ADVISOR_ID,
            "title": "Allocation drift >5% from IPS targets",
            "description": "Rollover IRA equity allocation has drifted 7.2% above target. Rebalancing required per IPS guidelines.",
            "category": "trading",
            "severity": "medium",
            "status": "open",
            "client_name": "Michael Chen",
            "ai_analysis": {"recommendation": "Rebalance by selling equity positions and buying fixed income to return to 60/40 target", "confidence": 0.88},
            "due_date": (_now() + timedelta(days=5)).isoformat(),
            "created_at": (_now() - timedelta(days=1)).isoformat(),
        },
        {
            "id": "al100000-0000-4000-8000-000000000004",
            "advisor_id": ADVISOR_ID,
            "title": "Missing beneficiary designation on Roth IRA",
            "description": "Roth IRA account opened 30 days ago still lacks beneficiary designation.",
            "category": "documentation",
            "severity": "low",
            "status": "resolved",
            "client_name": "John Smith",
            "ai_analysis": None,
            "due_date": (_now() - timedelta(days=3)).isoformat(),
            "resolved_at": (_now() - timedelta(days=1)).isoformat(),
            "resolution_notes": "Beneficiary form signed and submitted to custodian.",
            "created_at": (_now() - timedelta(days=10)).isoformat(),
        },
        {
            "id": "al100000-0000-4000-8000-000000000005",
            "advisor_id": ADVISOR_ID,
            "title": "Quarterly compliance report overdue",
            "description": "Q4 compliance self-assessment report has not been filed. Regulatory deadline approaching.",
            "category": "regulatory",
            "severity": "critical",
            "status": "escalated",
            "client_name": None,
            "ai_analysis": {"recommendation": "File immediately — SEC expects timely self-assessment filings", "confidence": 0.95},
            "due_date": (_now() + timedelta(days=2)).isoformat(),
            "created_at": (_now() - timedelta(hours=12)).isoformat(),
        },
    ]


def compliance_alerts_response(
    status: Optional[str] = None,
    severity: Optional[str] = None,
) -> List[Dict[str, Any]]:
    items = _compliance_alerts()
    if status:
        items = [a for a in items if a["status"] == status]
    if severity:
        items = [a for a in items if a["severity"] == severity]
    return items


def compliance_alert_detail_response(alert_id: str) -> Optional[Dict[str, Any]]:
    for alert in _compliance_alerts():
        if alert["id"] == alert_id:
            alert["comments"] = [
                {
                    "id": "cm100000-0000-4000-8000-000000000001",
                    "user_name": "Demo Advisor",
                    "content": "Reviewing this with compliance team.",
                    "created_at": (_now() - timedelta(hours=6)).isoformat(),
                },
            ]
            return alert
    return None


# ═══════════════════════════════════════════════════════════════════════════
# COMPLIANCE TASKS
# ═══════════════════════════════════════════════════════════════════════════

def _compliance_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "ct100000-0000-4000-8000-000000000001",
            "advisor_id": ADVISOR_ID,
            "title": "Annual ADV Part 2A/2B Update",
            "description": "Review and file Form ADV amendments by March 31 deadline.",
            "category": "regulatory",
            "priority": "high",
            "status": "in_progress",
            "assigned_to_name": "Demo Advisor",
            "due_date": (_now() + timedelta(days=30)).isoformat(),
            "completed_at": None,
            "created_at": (_now() - timedelta(days=15)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000002",
            "advisor_id": ADVISOR_ID,
            "title": "Client Risk Tolerance Reviews",
            "description": "Complete quarterly suitability reviews for all active households.",
            "category": "client_review",
            "priority": "medium",
            "status": "pending",
            "assigned_to_name": "Demo Advisor",
            "due_date": (_now() + timedelta(days=14)).isoformat(),
            "completed_at": None,
            "created_at": (_now() - timedelta(days=5)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000003",
            "advisor_id": ADVISOR_ID,
            "title": "Cybersecurity Incident Response Test",
            "description": "Run annual tabletop exercise for cybersecurity incident response plan.",
            "category": "training",
            "priority": "medium",
            "status": "pending",
            "assigned_to_name": "Demo Advisor",
            "due_date": (_now() + timedelta(days=45)).isoformat(),
            "completed_at": None,
            "created_at": (_now() - timedelta(days=2)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000004",
            "advisor_id": ADVISOR_ID,
            "title": "Marketing Material Compliance Review",
            "description": "Review new website content and social media posts for compliance.",
            "category": "documentation",
            "priority": "low",
            "status": "completed",
            "assigned_to_name": "Demo Advisor",
            "due_date": (_now() - timedelta(days=5)).isoformat(),
            "completed_at": (_now() - timedelta(days=7)).isoformat(),
            "created_at": (_now() - timedelta(days=20)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000005",
            "advisor_id": ADVISOR_ID,
            "title": "Anti-Money Laundering Training",
            "description": "Complete annual AML/KYC training and certification.",
            "category": "training",
            "priority": "urgent",
            "status": "pending",
            "assigned_to_name": "Demo Advisor",
            "due_date": (_now() - timedelta(days=2)).isoformat(),
            "completed_at": None,
            "created_at": (_now() - timedelta(days=30)).isoformat(),
        },
    ]


def compliance_tasks_response(
    status: Optional[str] = None,
    include_completed: bool = False,
) -> List[Dict[str, Any]]:
    items = _compliance_tasks()
    if status:
        items = [t for t in items if t["status"] == status]
    if not include_completed:
        items = [t for t in items if t["status"] != "completed"]
    return items


# ═══════════════════════════════════════════════════════════════════════════
# COMPLIANCE DASHBOARD METRICS
# ═══════════════════════════════════════════════════════════════════════════

def compliance_dashboard_metrics_response() -> Dict[str, Any]:
    alerts = _compliance_alerts()
    tasks = _compliance_tasks()

    open_alerts = [a for a in alerts if a["status"] in ("open", "under_review", "escalated")]
    critical = sum(1 for a in open_alerts if a["severity"] == "critical")
    high = sum(1 for a in open_alerts if a["severity"] == "high")

    overdue_tasks = [t for t in tasks if t["status"] in ("pending", "in_progress") and t["due_date"] < _now().isoformat()]

    score = max(0, min(100, 100 - critical * 15 - high * 8 - len(overdue_tasks) * 5))

    return {
        "compliance_score": score,
        "alerts": {
            "total": len(alerts),
            "open": sum(1 for a in alerts if a["status"] == "open"),
            "under_review": sum(1 for a in alerts if a["status"] == "under_review"),
            "escalated": sum(1 for a in alerts if a["status"] == "escalated"),
            "resolved": sum(1 for a in alerts if a["status"] == "resolved"),
            "by_severity": {
                "critical": critical,
                "high": high,
                "medium": sum(1 for a in open_alerts if a["severity"] == "medium"),
                "low": sum(1 for a in open_alerts if a["severity"] == "low"),
            },
        },
        "tasks": {
            "total": len(tasks),
            "pending": sum(1 for t in tasks if t["status"] == "pending"),
            "in_progress": sum(1 for t in tasks if t["status"] == "in_progress"),
            "completed": sum(1 for t in tasks if t["status"] == "completed"),
            "overdue": len(overdue_tasks),
        },
        "pending_reviews": 3,
    }


# ═══════════════════════════════════════════════════════════════════════════
# COMPLIANCE AUDIT LOG
# ═══════════════════════════════════════════════════════════════════════════

def compliance_audit_log_response() -> List[Dict[str, Any]]:
    return [
        {"id": "alog-001", "action": "alert_created", "entity_type": "compliance_alert", "details": {"title": "NVDA concentration at 47%", "severity": "high"}, "created_at": (_now() - timedelta(days=2)).isoformat()},
        {"id": "alog-002", "action": "document_approved", "entity_type": "compliance_document", "details": {"document": "ADV Part 2B", "version": 3}, "created_at": (_now() - timedelta(days=3)).isoformat()},
        {"id": "alog-003", "action": "task_completed", "entity_type": "compliance_task", "details": {"title": "Marketing Material Compliance Review"}, "created_at": (_now() - timedelta(days=7)).isoformat()},
        {"id": "alog-004", "action": "alert_status_changed", "entity_type": "compliance_alert", "details": {"alert": "Missing beneficiary designation", "old_status": "open", "new_status": "resolved"}, "created_at": (_now() - timedelta(days=1)).isoformat()},
        {"id": "alog-005", "action": "suitability_check_passed", "entity_type": "compliance_check", "details": {"client": "Sarah Johnson", "rule": "FINRA 2111"}, "created_at": (_now() - timedelta(hours=6)).isoformat()},
        {"id": "alog-006", "action": "concentration_warning", "entity_type": "compliance_check", "details": {"client": "Sarah Johnson", "position": "NVDA", "concentration": "47%"}, "created_at": (_now() - timedelta(hours=6)).isoformat()},
        {"id": "alog-007", "action": "document_generated", "entity_type": "compliance_document", "details": {"document": "Form CRS", "ai_model": "claude-3.5-sonnet"}, "created_at": (_now() - timedelta(days=5)).isoformat()},
        {"id": "alog-008", "action": "login", "entity_type": "session", "details": {"method": "password", "ip": "192.168.1.100"}, "created_at": (_now() - timedelta(hours=2)).isoformat()},
    ]


# ═══════════════════════════════════════════════════════════════════════════
# Helper: generic "no data yet" responses for mutating endpoints
# ═══════════════════════════════════════════════════════════════════════════

def empty_list(key: str = "items") -> Dict[str, Any]:
    return {key: [], "total": 0}
