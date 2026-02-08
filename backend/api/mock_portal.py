"""
Mock Client Portal API — Multi-User Demo.

Supports multiple demo households. Login email determines which household
data is returned. Any password works.

Test credentials
────────────────
nicole@example.com    → Wilson Household       $54,905   Moderate
mark@example.com      → Henderson Family       $487,230  Conservative
carlos@example.com    → Martinez Retirement    $312,500  Moderate-Aggressive
raj@example.com       → Patel Household        $198,750  Moderate
"""

from __future__ import annotations

from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import hashlib
import uuid as _uuid
import copy

router = APIRouter(prefix="/api/v1/portal", tags=["Client Portal (Demo)"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PortalLoginRequest(BaseModel):
    email: str
    password: str


class PortalLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    client_name: str
    firm_name: Optional[str] = None
    household_id: Optional[str] = None


class RiskProfileRequest(BaseModel):
    time_horizon: Optional[int] = None
    market_drop: Optional[int] = None
    experience: Optional[int] = None
    income_stability: Optional[int] = None
    loss_tolerance: Optional[int] = None


def _tok(seed: str) -> str:
    return hashlib.sha256(f"demo-{seed}".encode()).hexdigest()


_FIRM = "IAB Advisors"
_ADVISOR = "Leslie Wilson, CFP\u00ae"

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  HOUSEHOLD DATA — keyed by email prefix                                   ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_HOUSEHOLDS: Dict[str, dict] = {}

# ---- Wilson Household (nicole) -------------------------------------------
_HOUSEHOLDS["nicole"] = {
    "household_id": "hh-001",
    "client_name": "Nicole Wilson",
    "household_name": "Wilson Household",
    "email": "nicole@example.com",
    "risk_profile": {
        "risk_score": 72,
        "risk_level": "Moderate",
        "description": "Balanced approach with 60% equities and 40% fixed income. Suitable for investors with a medium time horizon who can tolerate moderate short-term fluctuations.",
        "target_equity": 60,
        "target_fixed_income": 30,
        "target_alternatives": 10,
        "answers": {"time_horizon": 3, "market_drop": 3, "experience": 3, "income_stability": 3, "loss_tolerance": 3},
        "completed_at": "2024-06-15T10:00:00",
    },
    "accounts": [
        {"id": "acc-001", "account_name": "NW Mutual VA IRA (***4532)", "account_type": "Variable Annuity IRA", "custodian": "Northwestern Mutual", "current_value": 27891.34, "tax_type": "Tax-Deferred"},
        {"id": "acc-002", "account_name": "Robinhood Individual (***8821)", "account_type": "Individual Brokerage", "custodian": "Robinhood", "current_value": 18234.56, "tax_type": "Taxable"},
        {"id": "acc-003", "account_name": "E*TRADE 401(k) (***3390)", "account_type": "401(k)", "custodian": "E*TRADE / Morgan Stanley", "current_value": 8779.68, "tax_type": "Tax-Deferred"},
    ],
    "positions": {
        "acc-001": [
            {"symbol": "NWMVA", "name": "Index 500 Fund (BlackRock)", "quantity": 1, "price": 4631.55, "value": 4631.55, "cost_basis": 4200.00, "gain_loss": 431.55, "gain_pct": 10.27, "asset_class": "Large Cap Equity"},
            {"symbol": "NWMSB", "name": "Select Bond Fund (Allspring)", "quantity": 1, "price": 5473.65, "value": 5473.65, "cost_basis": 5600.00, "gain_loss": -126.35, "gain_pct": -2.26, "asset_class": "Fixed Income"},
            {"symbol": "NWMIG", "name": "Intl Growth Fund", "quantity": 1, "price": 3890.14, "value": 3890.14, "cost_basis": 3500.00, "gain_loss": 390.14, "gain_pct": 11.15, "asset_class": "International Equity"},
            {"symbol": "NWMRE", "name": "Real Estate Securities Fund", "quantity": 1, "price": 2420.00, "value": 2420.00, "cost_basis": 2600.00, "gain_loss": -180.00, "gain_pct": -6.92, "asset_class": "Real Estate"},
            {"symbol": "NWMHYB", "name": "High Yield Bond Fund", "quantity": 1, "price": 3176.00, "value": 3176.00, "cost_basis": 3100.00, "gain_loss": 76.00, "gain_pct": 2.45, "asset_class": "Fixed Income"},
            {"symbol": "OTHER", "name": "Other Sub-Account Funds (14)", "quantity": 1, "price": 8300.00, "value": 8300.00, "cost_basis": 8200.00, "gain_loss": 100.00, "gain_pct": 1.22, "asset_class": "Mixed"},
        ],
        "acc-002": [
            {"symbol": "NVDA", "name": "NVIDIA Corporation", "quantity": 65, "price": 132.10, "value": 8586.50, "cost_basis": 4800.00, "gain_loss": 3786.50, "gain_pct": 78.89, "asset_class": "Large Cap Equity"},
            {"symbol": "AAPL", "name": "Apple Inc.", "quantity": 25, "price": 185.50, "value": 4637.50, "cost_basis": 4000.00, "gain_loss": 637.50, "gain_pct": 15.94, "asset_class": "Large Cap Equity"},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "quantity": 10, "price": 337.45, "value": 3374.50, "cost_basis": 3200.00, "gain_loss": 174.50, "gain_pct": 5.45, "asset_class": "Large Cap Equity"},
            {"symbol": "TSLA", "name": "Tesla Inc.", "quantity": 8, "price": 204.51, "value": 1636.06, "cost_basis": 2100.00, "gain_loss": -463.94, "gain_pct": -22.09, "asset_class": "Large Cap Equity"},
        ],
        "acc-003": [
            {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "quantity": 20, "price": 239.43, "value": 4788.60, "cost_basis": 4500.00, "gain_loss": 288.60, "gain_pct": 6.41, "asset_class": "Broad Market Equity"},
            {"symbol": "VXUS", "name": "Vanguard Total Intl Stock ETF", "quantity": 30, "price": 59.20, "value": 1776.00, "cost_basis": 1650.00, "gain_loss": 126.00, "gain_pct": 7.64, "asset_class": "International Equity"},
            {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "quantity": 25, "price": 88.60, "value": 2215.08, "cost_basis": 2300.00, "gain_loss": -84.92, "gain_pct": -3.69, "asset_class": "Fixed Income"},
        ],
    },
    "ytd_return": 0.0215,
    "nudges": [
        {"id": "nudge-001", "nudge_type": "concentration", "title": "NVDA Concentration Warning", "message": "NVIDIA makes up 47% of your Robinhood account. Your advisor recommends diversifying a portion into broad-market ETFs.", "action_url": "/portal/dashboard", "action_label": "View Details", "priority": 1, "status": "pending", "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat()},
        {"id": "nudge-002", "nudge_type": "fee", "title": "High-Fee Account Review", "message": "Your NW Mutual Variable Annuity charges 2.35% in total fees. We're evaluating a 1035 exchange to a lower-cost option.", "action_url": "/portal/dashboard", "action_label": "Learn More", "priority": 2, "status": "pending", "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat()},
        {"id": "nudge-003", "nudge_type": "planning", "title": "529 Plan Update Needed", "message": "With Emma starting college Fall 2028, it's time to shift the 529 allocation to a more conservative mix.", "action_url": "/portal/goals", "action_label": "View Goals", "priority": 2, "status": "pending", "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
    ],
    "goals": [
        {"id": "goal-001", "goal_type": "retirement", "name": "Retirement Fund", "target_amount": 750000, "current_amount": 54905.58, "target_date": "2050-01-01T00:00:00", "monthly_contribution": 1500, "progress_pct": 0.073, "on_track": True, "notes": "Combined household retirement savings. Target age 65.", "created_at": "2024-06-01T10:00:00"},
        {"id": "goal-002", "goal_type": "education", "name": "Emma's College Fund", "target_amount": 120000, "current_amount": 22000, "target_date": "2028-09-01T00:00:00", "monthly_contribution": 800, "progress_pct": 0.183, "on_track": False, "notes": "529 plan for Emma. Starting college Fall 2028.", "created_at": "2024-01-15T10:00:00"},
        {"id": "goal-003", "goal_type": "emergency_fund", "name": "Emergency Reserve", "target_amount": 30000, "current_amount": 18500, "target_date": "2026-12-31T00:00:00", "monthly_contribution": 500, "progress_pct": 0.617, "on_track": True, "notes": "6-month expense reserve.", "created_at": "2025-03-01T10:00:00"},
    ],
    "narratives": [
        {"id": "nar-001", "narrative_type": "quarterly", "title": "Q4 2025 Portfolio Review", "content": "Nicole, your portfolio gained 4.23% in Q4 2025, outperforming the blended benchmark by 0.36%. Your total household value stands at $54,905.58 across three accounts.\n\nKey highlights:\n\u2022 Your NVIDIA position was the top performer (+78.9% since purchase)\n\u2022 The NW Mutual VA IRA returned 2.1% after fees\n\u2022 Your E*TRADE 401(k) delivered solid returns\n\nAreas of attention:\n\u2022 NVIDIA concentration at 47% in Robinhood\n\u2022 NW Mutual VA fees at 2.35%\n\u2022 Overall allocation is equity-heavy", "content_html": None, "period_start": "2025-10-01T00:00:00", "period_end": "2025-12-31T00:00:00", "is_read": False, "created_at": "2026-01-15T10:00:00"},
        {"id": "nar-002", "narrative_type": "meeting_summary", "title": "Q1 2026 Review Meeting Summary", "content": "Summary of your review meeting on February 4, 2026 with Leslie Wilson, CFP\u00ae.\n\nTopics discussed:\n\u2022 Portfolio performance review (+2.15% YTD)\n\u2022 Emma\u2019s college planning\n\u2022 Tax-loss harvesting (~$3,200 identified)\n\u2022 Estate planning update\n\nAction items:\n\u2022 Prepare 529 reallocation options (Due: Feb 11)\n\u2022 Execute tax-loss harvesting trades (In progress)\n\u2022 Schedule estate planning consultation (Completed)", "content_html": None, "period_start": "2026-02-04T00:00:00", "period_end": "2026-02-04T00:00:00", "is_read": False, "created_at": "2026-02-04T14:00:00"},
    ],
    "documents": [
        {"id": "doc-001", "document_type": "report", "title": "Q4 2025 Performance Report", "period": "Q4 2025", "file_size": 342000, "is_read": True, "created_at": "2026-01-15T10:00:00"},
        {"id": "doc-002", "document_type": "statement", "title": "January 2026 Account Statement", "period": "January 2026", "file_size": 198000, "is_read": True, "created_at": "2026-02-01T10:00:00"},
        {"id": "doc-003", "document_type": "tax", "title": "2025 Form 1099-DIV (Robinhood)", "period": "Tax Year 2025", "file_size": 85000, "is_read": False, "created_at": "2026-01-31T10:00:00"},
        {"id": "doc-004", "document_type": "tax", "title": "2025 Form 1099-B (Robinhood)", "period": "Tax Year 2025", "file_size": 112000, "is_read": False, "created_at": "2026-01-31T10:00:00"},
        {"id": "doc-005", "document_type": "agreement", "title": "Investment Advisory Agreement", "period": None, "file_size": 425000, "is_read": True, "created_at": "2024-06-01T10:00:00"},
        {"id": "doc-006", "document_type": "report", "title": "Fee Disclosure Schedule 2026", "period": "2026", "file_size": 67000, "is_read": False, "created_at": "2026-01-02T10:00:00"},
    ],
}

# ---- Henderson Family (mark / susan) ------------------------------------
_HOUSEHOLDS["mark"] = _HOUSEHOLDS["susan"] = {
    "household_id": "hh-002",
    "client_name": "Mark Henderson",
    "household_name": "Henderson Family",
    "email": "mark@example.com",
    "risk_profile": {
        "risk_score": 45,
        "risk_level": "Conservative",
        "description": "Capital preservation with modest growth. Suitable for investors nearing retirement who prioritize stability over growth.",
        "target_equity": 40,
        "target_fixed_income": 50,
        "target_alternatives": 10,
        "answers": {"time_horizon": 2, "market_drop": 2, "experience": 3, "income_stability": 4, "loss_tolerance": 2},
        "completed_at": "2024-08-10T10:00:00",
    },
    "accounts": [
        {"id": "acc-004", "account_name": "Schwab Joint Account (***7001)", "account_type": "Joint Brokerage", "custodian": "Charles Schwab", "current_value": 245000.00, "tax_type": "Taxable"},
        {"id": "acc-005", "account_name": "Fidelity IRA - Mark (***7002)", "account_type": "Traditional IRA", "custodian": "Fidelity", "current_value": 142230.00, "tax_type": "Tax-Deferred"},
        {"id": "acc-006", "account_name": "Fidelity Roth - Susan (***7003)", "account_type": "Roth IRA", "custodian": "Fidelity", "current_value": 68000.00, "tax_type": "Tax-Free"},
        {"id": "acc-007", "account_name": "529 College Fund (***7004)", "account_type": "529 Plan", "custodian": "Vanguard", "current_value": 32000.00, "tax_type": "Tax-Free"},
    ],
    "positions": {
        "acc-004": [
            {"symbol": "VTI", "name": "Vanguard Total Stock Market", "quantity": 350, "price": 239.43, "value": 83800.50, "cost_basis": 75000.00, "gain_loss": 8800.50, "gain_pct": 11.73, "asset_class": "Broad Market Equity"},
            {"symbol": "BND", "name": "Vanguard Total Bond Market", "quantity": 800, "price": 88.60, "value": 70880.00, "cost_basis": 72000.00, "gain_loss": -1120.00, "gain_pct": -1.56, "asset_class": "Fixed Income"},
            {"symbol": "VXUS", "name": "Vanguard Total Intl Stock", "quantity": 600, "price": 59.20, "value": 35520.00, "cost_basis": 33000.00, "gain_loss": 2520.00, "gain_pct": 7.64, "asset_class": "International Equity"},
            {"symbol": "SCHD", "name": "Schwab US Dividend Equity", "quantity": 700, "price": 78.28, "value": 54799.50, "cost_basis": 50000.00, "gain_loss": 4799.50, "gain_pct": 9.60, "asset_class": "Dividend Equity"},
        ],
        "acc-005": [
            {"symbol": "FXAIX", "name": "Fidelity 500 Index", "quantity": 450, "price": 198.40, "value": 89280.00, "cost_basis": 80000.00, "gain_loss": 9280.00, "gain_pct": 11.60, "asset_class": "Large Cap Equity"},
            {"symbol": "FTBFX", "name": "Fidelity Total Bond", "quantity": 4500, "price": 11.77, "value": 52950.00, "cost_basis": 55000.00, "gain_loss": -2050.00, "gain_pct": -3.73, "asset_class": "Fixed Income"},
        ],
        "acc-006": [
            {"symbol": "QQQ", "name": "Invesco QQQ Trust", "quantity": 80, "price": 510.00, "value": 40800.00, "cost_basis": 35000.00, "gain_loss": 5800.00, "gain_pct": 16.57, "asset_class": "Large Cap Growth"},
            {"symbol": "SCHD", "name": "Schwab US Dividend Equity", "quantity": 348, "price": 78.28, "value": 27200.00, "cost_basis": 25000.00, "gain_loss": 2200.00, "gain_pct": 8.80, "asset_class": "Dividend Equity"},
        ],
    },
    "ytd_return": 0.0342,
    "nudges": [
        {"id": "nudge-h2-001", "nudge_type": "planning", "title": "Annual Review Scheduling", "message": "It's time to schedule your annual review. Please select a convenient time.", "action_url": "/portal/dashboard", "action_label": "Schedule", "priority": 2, "status": "pending", "created_at": (datetime.utcnow() - timedelta(days=5)).isoformat()},
    ],
    "goals": [
        {"id": "goal-h2-001", "goal_type": "retirement", "name": "Retirement (2030)", "target_amount": 600000, "current_amount": 487230, "target_date": "2030-06-01T00:00:00", "monthly_contribution": 3000, "progress_pct": 0.812, "on_track": True, "notes": "Mark and Susan retiring in 2030.", "created_at": "2023-01-01T10:00:00"},
        {"id": "goal-h2-002", "goal_type": "education", "name": "College Fund - Tyler", "target_amount": 80000, "current_amount": 32000, "target_date": "2029-09-01T00:00:00", "monthly_contribution": 500, "progress_pct": 0.40, "on_track": True, "notes": "529 for Tyler, starting college Fall 2029.", "created_at": "2023-06-01T10:00:00"},
    ],
    "narratives": [
        {"id": "nar-h2-001", "narrative_type": "quarterly", "title": "Q4 2025 Portfolio Review", "content": "Mark & Susan, your combined portfolio grew 3.42% YTD, outperforming the conservative benchmark. Your retirement goal is 81% funded.\n\nHighlights:\n\u2022 Schwab joint account had a strong dividend quarter\n\u2022 Bond allocation provided stability during October volatility\n\u2022 529 plan is on track for Tyler's college timeline", "content_html": None, "period_start": "2025-10-01T00:00:00", "period_end": "2025-12-31T00:00:00", "is_read": False, "created_at": "2026-01-15T10:00:00"},
    ],
    "documents": [
        {"id": "doc-h2-001", "document_type": "report", "title": "Q4 2025 Performance Report", "period": "Q4 2025", "file_size": 410000, "is_read": True, "created_at": "2026-01-15T10:00:00"},
        {"id": "doc-h2-002", "document_type": "statement", "title": "January 2026 Account Statement", "period": "January 2026", "file_size": 220000, "is_read": False, "created_at": "2026-02-01T10:00:00"},
        {"id": "doc-h2-003", "document_type": "agreement", "title": "Investment Advisory Agreement", "period": None, "file_size": 380000, "is_read": True, "created_at": "2023-01-15T10:00:00"},
    ],
}

# ---- Martinez Retirement (carlos) ----------------------------------------
_HOUSEHOLDS["carlos"] = {
    "household_id": "hh-003",
    "client_name": "Carlos Martinez",
    "household_name": "Martinez Retirement",
    "email": "carlos@example.com",
    "risk_profile": {
        "risk_score": 58,
        "risk_level": "Moderate-Aggressive",
        "description": "Growth-oriented portfolio accepting higher volatility for greater long-term returns. Suitable for investors with 10+ year horizon.",
        "target_equity": 70,
        "target_fixed_income": 20,
        "target_alternatives": 10,
        "answers": {"time_horizon": 4, "market_drop": 3, "experience": 4, "income_stability": 3, "loss_tolerance": 3},
        "completed_at": "2025-01-20T10:00:00",
    },
    "accounts": [
        {"id": "acc-008", "account_name": "Schwab Rollover IRA (***8001)", "account_type": "Rollover IRA", "custodian": "Charles Schwab", "current_value": 225000.00, "tax_type": "Tax-Deferred"},
        {"id": "acc-009", "account_name": "Schwab Roth IRA (***8002)", "account_type": "Roth IRA", "custodian": "Charles Schwab", "current_value": 87500.00, "tax_type": "Tax-Free"},
    ],
    "positions": {
        "acc-008": [
            {"symbol": "SWPPX", "name": "Schwab S&P 500 Index", "quantity": 2200, "price": 68.18, "value": 150000.00, "cost_basis": 130000.00, "gain_loss": 20000.00, "gain_pct": 15.38, "asset_class": "Large Cap Equity"},
            {"symbol": "SWISX", "name": "Schwab International Index", "quantity": 1800, "price": 25.00, "value": 45000.00, "cost_basis": 40000.00, "gain_loss": 5000.00, "gain_pct": 12.50, "asset_class": "International Equity"},
            {"symbol": "SWAGX", "name": "Schwab US Aggregate Bond", "quantity": 3000, "price": 10.00, "value": 30000.00, "cost_basis": 32000.00, "gain_loss": -2000.00, "gain_pct": -6.25, "asset_class": "Fixed Income"},
        ],
        "acc-009": [
            {"symbol": "SCHG", "name": "Schwab US Large-Cap Growth", "quantity": 500, "price": 105.00, "value": 52500.00, "cost_basis": 45000.00, "gain_loss": 7500.00, "gain_pct": 16.67, "asset_class": "Large Cap Growth"},
            {"symbol": "SCHF", "name": "Schwab Intl Equity ETF", "quantity": 1000, "price": 35.00, "value": 35000.00, "cost_basis": 30000.00, "gain_loss": 5000.00, "gain_pct": 16.67, "asset_class": "International Equity"},
        ],
    },
    "ytd_return": 0.0189,
    "nudges": [
        {"id": "nudge-h3-001", "nudge_type": "planning", "title": "Rebalance Recommended", "message": "Your equity allocation has drifted to 78%, above your 70% target. Consider rebalancing.", "action_url": "/portal/dashboard", "action_label": "View Details", "priority": 2, "status": "pending", "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()},
    ],
    "goals": [
        {"id": "goal-h3-001", "goal_type": "retirement", "name": "Early Retirement (2035)", "target_amount": 500000, "current_amount": 312500, "target_date": "2035-01-01T00:00:00", "monthly_contribution": 2000, "progress_pct": 0.625, "on_track": True, "notes": "Target early retirement at 58.", "created_at": "2024-01-01T10:00:00"},
    ],
    "narratives": [
        {"id": "nar-h3-001", "narrative_type": "quarterly", "title": "Q4 2025 Portfolio Review", "content": "Carlos, your portfolio returned 1.89% YTD. The growth-oriented allocation performed well in equities but bond allocation dragged slightly.\n\nYour early retirement goal is 63% funded — on track if contributions continue at current pace.", "content_html": None, "period_start": "2025-10-01T00:00:00", "period_end": "2025-12-31T00:00:00", "is_read": False, "created_at": "2026-01-15T10:00:00"},
    ],
    "documents": [
        {"id": "doc-h3-001", "document_type": "report", "title": "Q4 2025 Performance Report", "period": "Q4 2025", "file_size": 380000, "is_read": False, "created_at": "2026-01-15T10:00:00"},
        {"id": "doc-h3-002", "document_type": "statement", "title": "January 2026 Account Statement", "period": "January 2026", "file_size": 165000, "is_read": False, "created_at": "2026-02-01T10:00:00"},
    ],
}

# ---- Patel Household (raj / priya) ----------------------------------------
_HOUSEHOLDS["raj"] = _HOUSEHOLDS["priya"] = {
    "household_id": "hh-004",
    "client_name": "Raj Patel",
    "household_name": "Patel Household",
    "email": "raj@example.com",
    "risk_profile": {
        "risk_score": 35,
        "risk_level": "Moderate",
        "description": "Balanced portfolio targeting steady growth with moderate risk. Suitable for long-term wealth accumulation with a diversified approach.",
        "target_equity": 55,
        "target_fixed_income": 35,
        "target_alternatives": 10,
        "answers": {"time_horizon": 4, "market_drop": 2, "experience": 2, "income_stability": 4, "loss_tolerance": 2},
        "completed_at": "2025-06-01T10:00:00",
    },
    "accounts": [
        {"id": "acc-010", "account_name": "Vanguard Brokerage (***9001)", "account_type": "Individual Brokerage", "custodian": "Vanguard", "current_value": 98750.00, "tax_type": "Taxable"},
        {"id": "acc-011", "account_name": "Vanguard IRA - Raj (***9002)", "account_type": "Traditional IRA", "custodian": "Vanguard", "current_value": 65000.00, "tax_type": "Tax-Deferred"},
        {"id": "acc-012", "account_name": "Vanguard IRA - Priya (***9003)", "account_type": "Traditional IRA", "custodian": "Vanguard", "current_value": 35000.00, "tax_type": "Tax-Deferred"},
    ],
    "positions": {
        "acc-010": [
            {"symbol": "VTI", "name": "Vanguard Total Stock Market", "quantity": 200, "price": 239.43, "value": 47886.00, "cost_basis": 42000.00, "gain_loss": 5886.00, "gain_pct": 14.01, "asset_class": "Broad Market Equity"},
            {"symbol": "BND", "name": "Vanguard Total Bond Market", "quantity": 350, "price": 88.60, "value": 31010.00, "cost_basis": 32000.00, "gain_loss": -990.00, "gain_pct": -3.09, "asset_class": "Fixed Income"},
            {"symbol": "VNQ", "name": "Vanguard Real Estate ETF", "quantity": 250, "price": 79.42, "value": 19854.00, "cost_basis": 18000.00, "gain_loss": 1854.00, "gain_pct": 10.30, "asset_class": "Real Estate"},
        ],
        "acc-011": [
            {"symbol": "VFIAX", "name": "Vanguard 500 Index Admiral", "quantity": 130, "price": 500.00, "value": 65000.00, "cost_basis": 58000.00, "gain_loss": 7000.00, "gain_pct": 12.07, "asset_class": "Large Cap Equity"},
        ],
        "acc-012": [
            {"symbol": "VBTLX", "name": "Vanguard Total Bond Market Admiral", "quantity": 3200, "price": 10.94, "value": 35000.00, "cost_basis": 36000.00, "gain_loss": -1000.00, "gain_pct": -2.78, "asset_class": "Fixed Income"},
        ],
    },
    "ytd_return": 0.0278,
    "nudges": [],
    "goals": [
        {"id": "goal-h4-001", "goal_type": "retirement", "name": "Retirement Savings", "target_amount": 500000, "current_amount": 198750, "target_date": "2045-01-01T00:00:00", "monthly_contribution": 1200, "progress_pct": 0.398, "on_track": True, "notes": "Joint retirement target.", "created_at": "2025-06-01T10:00:00"},
        {"id": "goal-h4-002", "goal_type": "home_purchase", "name": "Investment Property", "target_amount": 100000, "current_amount": 45000, "target_date": "2028-06-01T00:00:00", "monthly_contribution": 1000, "progress_pct": 0.45, "on_track": True, "notes": "Down payment for rental property.", "created_at": "2025-06-01T10:00:00"},
    ],
    "narratives": [
        {"id": "nar-h4-001", "narrative_type": "quarterly", "title": "Q4 2025 Portfolio Review", "content": "Raj & Priya, your household portfolio returned 2.78% YTD. The balanced allocation is performing as expected.\n\nYour retirement goal is 40% funded and on track. The investment property fund is also progressing well at 45%.", "content_html": None, "period_start": "2025-10-01T00:00:00", "period_end": "2025-12-31T00:00:00", "is_read": False, "created_at": "2026-01-15T10:00:00"},
    ],
    "documents": [
        {"id": "doc-h4-001", "document_type": "report", "title": "Q4 2025 Performance Report", "period": "Q4 2025", "file_size": 355000, "is_read": False, "created_at": "2026-01-15T10:00:00"},
        {"id": "doc-h4-002", "document_type": "agreement", "title": "Investment Advisory Agreement", "period": None, "file_size": 400000, "is_read": True, "created_at": "2025-06-01T10:00:00"},
    ],
}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  In-memory session store: token → email prefix                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_TOKEN_MAP: Dict[str, str] = {}


def _resolve_household(authorization: str | None = None) -> dict:
    """Look up household from Bearer token; default to Nicole."""
    if authorization:
        token = authorization.replace("Bearer ", "")
        prefix = _TOKEN_MAP.get(token, "nicole")
    else:
        prefix = "nicole"
    return _HOUSEHOLDS.get(prefix, _HOUSEHOLDS["nicole"])


def _prefix_from_email(email: str) -> str:
    return email.split("@")[0].lower().strip()


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  AUTH                                                                      ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.post("/auth/login", response_model=PortalLoginResponse)
async def portal_login(req: PortalLoginRequest):
    prefix = _prefix_from_email(req.email)
    hh = _HOUSEHOLDS.get(prefix, _HOUSEHOLDS["nicole"])
    token = _tok(req.email)
    _TOKEN_MAP[token] = prefix
    return PortalLoginResponse(
        access_token=token,
        refresh_token=_tok(req.email + "-r"),
        expires_in=86400,
        client_name=hh["client_name"],
        firm_name=_FIRM,
        household_id=hh["household_id"],
    )


@router.post("/auth/refresh", response_model=PortalLoginResponse)
async def portal_refresh(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    token = _tok("refresh-" + hh["household_id"])
    _TOKEN_MAP[token] = _prefix_from_email(hh["email"])
    return PortalLoginResponse(
        access_token=token,
        refresh_token=_tok("refresh-r"),
        expires_in=86400,
        client_name=hh["client_name"],
        firm_name=_FIRM,
        household_id=hh["household_id"],
    )


@router.post("/auth/logout")
async def portal_logout():
    return {"message": "Logged out successfully"}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  DASHBOARD                                                                 ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.get("/dashboard")
async def get_dashboard(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    total = sum(a["current_value"] for a in hh["accounts"])
    return {
        "client_name": hh["client_name"],
        "household_name": hh["household_name"],
        "advisor_name": _ADVISOR,
        "firm_name": _FIRM,
        "total_value": total,
        "ytd_return": hh["ytd_return"],
        "ytd_return_dollar": total * hh["ytd_return"],
        "accounts": hh["accounts"],
        "pending_nudges": len([n for n in hh["nudges"] if n["status"] == "pending"]),
        "unread_narratives": len([n for n in hh["narratives"] if not n["is_read"]]),
        "active_goals": len(hh["goals"]),
        "risk_profile": hh.get("risk_profile"),
        "last_updated": datetime.utcnow().isoformat(),
    }


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  RISK PROFILE                                                             ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

RISK_LEVELS = [
    (0,  25, "Conservative",        "Capital preservation focused. Minimal equity exposure, heavy bonds/cash.",                   30, 60, 10),
    (26, 45, "Moderately Conservative", "Stability with modest growth. Lower equity, higher fixed income.",                       40, 50, 10),
    (46, 60, "Moderate",            "Balanced approach with roughly equal equity and fixed income.",                               55, 35, 10),
    (61, 75, "Moderate-Aggressive",  "Growth-oriented, accepting higher short-term volatility.",                                  70, 20, 10),
    (76, 100, "Aggressive",          "Maximum growth, high equity exposure, suitable for long time horizons.",                    85, 10,  5),
]


def _compute_risk(answers: dict) -> dict:
    """Compute risk profile from questionnaire answers (1-5 scale)."""
    raw = sum(answers.get(k, 3) for k in ["time_horizon", "market_drop", "experience", "income_stability", "loss_tolerance"])
    score = int((raw / 25) * 100)
    for lo, hi, level, desc, eq, fi, alt in RISK_LEVELS:
        if lo <= score <= hi:
            return {
                "risk_score": score,
                "risk_level": level,
                "description": desc,
                "target_equity": eq,
                "target_fixed_income": fi,
                "target_alternatives": alt,
                "answers": answers,
                "completed_at": datetime.utcnow().isoformat(),
            }
    return {"risk_score": score, "risk_level": "Moderate", "description": "Balanced approach.", "target_equity": 55, "target_fixed_income": 35, "target_alternatives": 10, "answers": answers, "completed_at": datetime.utcnow().isoformat()}


@router.get("/risk-profile")
async def get_risk_profile(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    profile = hh.get("risk_profile")
    if not profile:
        return {"completed": False, "risk_profile": None}
    return {"completed": True, "risk_profile": profile}


@router.post("/risk-profile")
async def save_risk_profile(req: RiskProfileRequest, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    answers = {
        "time_horizon": req.time_horizon or 3,
        "market_drop": req.market_drop or 3,
        "experience": req.experience or 3,
        "income_stability": req.income_stability or 3,
        "loss_tolerance": req.loss_tolerance or 3,
    }
    profile = _compute_risk(answers)
    hh["risk_profile"] = profile
    return {"completed": True, "risk_profile": profile}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  ACCOUNTS & POSITIONS                                                      ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.get("/accounts/{account_id}/positions")
async def get_positions(account_id: str, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    return hh.get("positions", {}).get(account_id, [])


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  NUDGES                                                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.get("/nudges")
async def get_nudges(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    return hh.get("nudges", [])


@router.post("/nudges/{nudge_id}/dismiss")
async def dismiss_nudge(nudge_id: str):
    return {"ok": True}

@router.post("/nudges/{nudge_id}/view")
async def view_nudge(nudge_id: str):
    return {"ok": True}

@router.post("/nudges/{nudge_id}/act")
async def act_on_nudge(nudge_id: str):
    return {"ok": True}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  GOALS                                                                     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.get("/goals")
async def get_goals(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    return hh.get("goals", [])

@router.post("/goals")
async def create_goal(data: dict):
    return {"id": str(_uuid.uuid4()), "goal_type": data.get("goal_type", "custom"), "name": data.get("name", "New Goal"), "target_amount": data.get("target_amount", 100000), "current_amount": 0, "target_date": data.get("target_date", "2035-01-01T00:00:00"), "monthly_contribution": data.get("monthly_contribution"), "progress_pct": 0, "on_track": True, "notes": data.get("notes"), "created_at": datetime.utcnow().isoformat()}

@router.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, data: dict, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    for g in hh.get("goals", []):
        if g["id"] == goal_id:
            g.update({k: v for k, v in data.items() if v is not None})
            return g
    return {"error": "Goal not found"}

@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    return {"ok": True, "message": "Goal deleted"}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  NARRATIVES                                                                ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.get("/narratives")
async def get_narratives(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    return hh.get("narratives", [])

@router.post("/narratives/{narrative_id}/read")
async def mark_narrative_read(narrative_id: str):
    return {"ok": True}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  DOCUMENTS                                                                 ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.get("/documents")
async def get_documents(document_type: str | None = None, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    docs = hh.get("documents", [])
    if document_type:
        return [d for d in docs if d["document_type"] == document_type]
    return docs

@router.post("/documents/{document_id}/read")
async def mark_document_read(document_id: str):
    return {"ok": True}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BRANDING & PREFERENCES                                                   ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@router.get("/config/branding")
async def get_branding():
    return {"logo_url": None, "primary_color": "#1a56db", "secondary_color": "#7c3aed", "accent_color": "#059669", "font_family": "Inter", "portal_title": "IAB Advisors Client Portal", "footer_text": "IAB Advisors LLC \u00b7 Registered Investment Advisor", "disclaimer_text": "Investment advisory services offered through IAB Advisors LLC, a registered investment advisor. Past performance is not indicative of future results."}

@router.get("/preferences")
async def get_preferences():
    return {"email_narratives": True, "email_nudges": True, "email_documents": True}

@router.patch("/preferences")
async def update_preferences(data: dict):
    return {"email_narratives": data.get("email_narratives", True), "email_nudges": data.get("email_nudges", True), "email_documents": data.get("email_documents", True)}
