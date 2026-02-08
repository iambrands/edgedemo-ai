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


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  PERFORMANCE REPORTING                                                     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

import random as _random

_PERFORMANCE: Dict[str, dict] = {
    "nicole": {
        "summary": {"total_value": 54905.58, "total_cost_basis": 48500.00, "total_gain_loss": 6405.58, "total_gain_loss_pct": 13.21, "ytd_return": 8.5, "mtd_return": 2.1, "inception_return": 13.21, "inception_date": "2022-03-15"},
        "time_series": {
            "1M": [{"date": "2026-01-07", "value": 53200, "benchmark": 53000}, {"date": "2026-01-14", "value": 53800, "benchmark": 53400}, {"date": "2026-01-21", "value": 54100, "benchmark": 53600}, {"date": "2026-01-28", "value": 53900, "benchmark": 53800}, {"date": "2026-02-04", "value": 54905, "benchmark": 54100}],
            "3M": [{"date": "2025-11-07", "value": 51000, "benchmark": 50800}, {"date": "2025-12-07", "value": 52200, "benchmark": 51800}, {"date": "2026-01-07", "value": 53200, "benchmark": 53000}, {"date": "2026-02-04", "value": 54905, "benchmark": 54100}],
            "YTD": [{"date": "2026-01-01", "value": 50600, "benchmark": 50400}, {"date": "2026-01-15", "value": 53500, "benchmark": 53200}, {"date": "2026-02-01", "value": 54500, "benchmark": 53900}, {"date": "2026-02-04", "value": 54905, "benchmark": 54100}],
            "1Y": [{"date": "2025-02-07", "value": 45000, "benchmark": 44800}, {"date": "2025-05-07", "value": 47500, "benchmark": 47200}, {"date": "2025-08-07", "value": 49200, "benchmark": 49000}, {"date": "2025-11-07", "value": 51000, "benchmark": 50800}, {"date": "2026-02-04", "value": 54905, "benchmark": 54100}],
            "ALL": [{"date": "2022-03-15", "value": 48500, "benchmark": 48500}, {"date": "2023-03-15", "value": 46500, "benchmark": 47000}, {"date": "2024-03-15", "value": 50500, "benchmark": 50000}, {"date": "2025-03-15", "value": 49000, "benchmark": 49500}, {"date": "2026-02-04", "value": 54905, "benchmark": 54100}],
        },
        "asset_allocation": {
            "current": [{"category": "US Equity", "value": 32943, "pct": 60}, {"category": "International Equity", "value": 8236, "pct": 15}, {"category": "Fixed Income", "value": 10981, "pct": 20}, {"category": "Alternatives", "value": 2745, "pct": 5}],
            "target": [{"category": "US Equity", "pct": 55}, {"category": "International Equity", "pct": 15}, {"category": "Fixed Income", "pct": 25}, {"category": "Alternatives", "pct": 5}],
        },
        "monthly_returns": [
            {"month": "Mar 2025", "return": 2.5, "benchmark": 2.1}, {"month": "Apr 2025", "return": 1.8, "benchmark": 1.5}, {"month": "May 2025", "return": 0.9, "benchmark": 1.2}, {"month": "Jun 2025", "return": 3.2, "benchmark": 2.8},
            {"month": "Jul 2025", "return": -0.5, "benchmark": -0.3}, {"month": "Aug 2025", "return": 1.4, "benchmark": 1.1}, {"month": "Sep 2025", "return": -2.1, "benchmark": -1.8}, {"month": "Oct 2025", "return": 2.8, "benchmark": 2.5},
            {"month": "Nov 2025", "return": 1.6, "benchmark": 1.4}, {"month": "Dec 2025", "return": 2.2, "benchmark": 1.9}, {"month": "Jan 2026", "return": 3.1, "benchmark": 2.7}, {"month": "Feb 2026", "return": 2.1, "benchmark": 1.8},
        ],
        "benchmark_name": "60/40 Balanced Index",
    },
    "mark": {
        "summary": {"total_value": 487230.00, "total_cost_basis": 425000.00, "total_gain_loss": 62230.00, "total_gain_loss_pct": 14.64, "ytd_return": 5.2, "mtd_return": 1.4, "inception_return": 14.64, "inception_date": "2019-06-01"},
        "time_series": {
            "1M": [{"date": "2026-01-07", "value": 478000, "benchmark": 476000}, {"date": "2026-01-21", "value": 483000, "benchmark": 481000}, {"date": "2026-02-04", "value": 487230, "benchmark": 485000}],
            "YTD": [{"date": "2026-01-01", "value": 463200, "benchmark": 461000}, {"date": "2026-02-04", "value": 487230, "benchmark": 485000}],
            "ALL": [{"date": "2019-06-01", "value": 425000, "benchmark": 425000}, {"date": "2021-01-01", "value": 410000, "benchmark": 405000}, {"date": "2023-01-01", "value": 430000, "benchmark": 435000}, {"date": "2025-01-01", "value": 470000, "benchmark": 468000}, {"date": "2026-02-04", "value": 487230, "benchmark": 485000}],
        },
        "asset_allocation": {
            "current": [{"category": "US Equity", "value": 146169, "pct": 30}, {"category": "International Equity", "value": 48723, "pct": 10}, {"category": "Fixed Income", "value": 243615, "pct": 50}, {"category": "Alternatives", "value": 48723, "pct": 10}],
            "target": [{"category": "US Equity", "pct": 30}, {"category": "International Equity", "pct": 10}, {"category": "Fixed Income", "pct": 50}, {"category": "Alternatives", "pct": 10}],
        },
        "monthly_returns": [
            {"month": "Mar 2025", "return": 1.2, "benchmark": 1.0}, {"month": "Apr 2025", "return": 0.8, "benchmark": 0.7}, {"month": "May 2025", "return": 0.6, "benchmark": 0.5}, {"month": "Jun 2025", "return": 1.5, "benchmark": 1.3},
            {"month": "Jul 2025", "return": -0.2, "benchmark": -0.1}, {"month": "Aug 2025", "return": 0.9, "benchmark": 0.8}, {"month": "Sep 2025", "return": -1.0, "benchmark": -0.9}, {"month": "Oct 2025", "return": 1.4, "benchmark": 1.2},
            {"month": "Nov 2025", "return": 0.8, "benchmark": 0.7}, {"month": "Dec 2025", "return": 1.1, "benchmark": 1.0}, {"month": "Jan 2026", "return": 1.8, "benchmark": 1.5}, {"month": "Feb 2026", "return": 1.4, "benchmark": 1.2},
        ],
        "benchmark_name": "40/60 Conservative Index",
    },
    "carlos": {
        "summary": {"total_value": 312500.00, "total_cost_basis": 280000.00, "total_gain_loss": 32500.00, "total_gain_loss_pct": 11.61, "ytd_return": 6.8, "mtd_return": 1.9, "inception_return": 11.61, "inception_date": "2021-01-15"},
        "time_series": {
            "1M": [{"date": "2026-01-07", "value": 305000, "benchmark": 304000}, {"date": "2026-01-21", "value": 309000, "benchmark": 308000}, {"date": "2026-02-04", "value": 312500, "benchmark": 311500}],
            "YTD": [{"date": "2026-01-01", "value": 292600, "benchmark": 291500}, {"date": "2026-02-04", "value": 312500, "benchmark": 311500}],
            "ALL": [{"date": "2021-01-15", "value": 280000, "benchmark": 280000}, {"date": "2023-01-15", "value": 290000, "benchmark": 288000}, {"date": "2025-01-15", "value": 298000, "benchmark": 296000}, {"date": "2026-02-04", "value": 312500, "benchmark": 311500}],
        },
        "asset_allocation": {
            "current": [{"category": "US Equity", "value": 187500, "pct": 60}, {"category": "International Equity", "value": 46875, "pct": 15}, {"category": "Fixed Income", "value": 62500, "pct": 20}, {"category": "Alternatives", "value": 15625, "pct": 5}],
            "target": [{"category": "US Equity", "pct": 55}, {"category": "International Equity", "pct": 15}, {"category": "Fixed Income", "pct": 20}, {"category": "Alternatives", "pct": 10}],
        },
        "monthly_returns": [
            {"month": "Mar 2025", "return": 2.8, "benchmark": 2.4}, {"month": "Apr 2025", "return": 2.0, "benchmark": 1.7}, {"month": "May 2025", "return": 1.1, "benchmark": 0.9}, {"month": "Jun 2025", "return": 3.5, "benchmark": 3.0},
            {"month": "Jul 2025", "return": -0.7, "benchmark": -0.5}, {"month": "Aug 2025", "return": 1.6, "benchmark": 1.3}, {"month": "Sep 2025", "return": -2.5, "benchmark": -2.1}, {"month": "Oct 2025", "return": 3.2, "benchmark": 2.8},
            {"month": "Nov 2025", "return": 1.9, "benchmark": 1.6}, {"month": "Dec 2025", "return": 2.5, "benchmark": 2.2}, {"month": "Jan 2026", "return": 3.5, "benchmark": 3.0}, {"month": "Feb 2026", "return": 1.9, "benchmark": 1.6},
        ],
        "benchmark_name": "Moderate Growth Index",
    },
    "raj": {
        "summary": {"total_value": 198750.00, "total_cost_basis": 175000.00, "total_gain_loss": 23750.00, "total_gain_loss_pct": 13.57, "ytd_return": 7.2, "mtd_return": 1.6, "inception_return": 13.57, "inception_date": "2020-09-01"},
        "time_series": {
            "1M": [{"date": "2026-01-07", "value": 194000, "benchmark": 193500}, {"date": "2026-01-21", "value": 196800, "benchmark": 196300}, {"date": "2026-02-04", "value": 198750, "benchmark": 198200}],
            "YTD": [{"date": "2026-01-01", "value": 185400, "benchmark": 184900}, {"date": "2026-02-04", "value": 198750, "benchmark": 198200}],
            "ALL": [{"date": "2020-09-01", "value": 175000, "benchmark": 175000}, {"date": "2022-09-01", "value": 178000, "benchmark": 180000}, {"date": "2024-09-01", "value": 192000, "benchmark": 191000}, {"date": "2026-02-04", "value": 198750, "benchmark": 198200}],
        },
        "asset_allocation": {
            "current": [{"category": "US Equity", "value": 109312, "pct": 55}, {"category": "International Equity", "value": 29812, "pct": 15}, {"category": "Fixed Income", "value": 49688, "pct": 25}, {"category": "Alternatives", "value": 9938, "pct": 5}],
            "target": [{"category": "US Equity", "pct": 50}, {"category": "International Equity", "pct": 15}, {"category": "Fixed Income", "pct": 30}, {"category": "Alternatives", "pct": 5}],
        },
        "monthly_returns": [
            {"month": "Mar 2025", "return": 2.2, "benchmark": 1.9}, {"month": "Apr 2025", "return": 1.5, "benchmark": 1.3}, {"month": "May 2025", "return": 0.8, "benchmark": 0.7}, {"month": "Jun 2025", "return": 2.8, "benchmark": 2.4},
            {"month": "Jul 2025", "return": -0.4, "benchmark": -0.3}, {"month": "Aug 2025", "return": 1.2, "benchmark": 1.0}, {"month": "Sep 2025", "return": -1.8, "benchmark": -1.5}, {"month": "Oct 2025", "return": 2.5, "benchmark": 2.2},
            {"month": "Nov 2025", "return": 1.4, "benchmark": 1.2}, {"month": "Dec 2025", "return": 1.9, "benchmark": 1.6}, {"month": "Jan 2026", "return": 2.8, "benchmark": 2.4}, {"month": "Feb 2026", "return": 1.6, "benchmark": 1.4},
        ],
        "benchmark_name": "Moderate Balanced Index",
    },
}
# Alias for shared households
_PERFORMANCE["susan"] = _PERFORMANCE["mark"]
_PERFORMANCE["priya"] = _PERFORMANCE["raj"]


@router.get("/performance")
async def get_performance(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    return _PERFORMANCE.get(prefix, _PERFORMANCE["nicole"])


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  MEETING SCHEDULER                                                         ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_MEETING_TYPES = [
    {"id": "portfolio_review", "name": "Portfolio Review", "duration": 30, "description": "Review your portfolio performance and allocation"},
    {"id": "financial_planning", "name": "Financial Planning", "duration": 60, "description": "Comprehensive financial planning session"},
    {"id": "retirement_planning", "name": "Retirement Planning", "duration": 60, "description": "Retirement strategies and projections"},
    {"id": "tax_planning", "name": "Tax Planning", "duration": 45, "description": "Tax-efficient investment strategies"},
    {"id": "general_questions", "name": "General Questions", "duration": 30, "description": "Quick questions about your accounts"},
]


def _generate_slots() -> list:
    slots = []
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    for day_offset in range(1, 15):
        d = today + timedelta(days=day_offset)
        if d.weekday() >= 5:
            continue
        for hour in [9, 10, 11, 14, 15, 16]:
            if _random.random() > 0.3:
                ampm = "AM" if hour < 12 else "PM"
                h12 = hour if hour <= 12 else hour - 12
                slots.append({
                    "id": f"slot-{d.strftime('%Y%m%d')}-{hour:02d}00",
                    "date": d.strftime("%Y-%m-%d"),
                    "time": f"{h12}:00 {ampm}",
                    "datetime": d.replace(hour=hour).isoformat(),
                    "duration_minutes": 30,
                })
    return slots


_AVAILABLE_SLOTS = _generate_slots()

_SCHEDULED_MEETINGS: Dict[str, list] = {
    "nicole": [{"id": "mtg-001", "title": "Quarterly Portfolio Review", "datetime": (datetime.utcnow() + timedelta(days=7, hours=10)).isoformat(), "duration_minutes": 30, "meeting_type": "portfolio_review", "status": "confirmed", "advisor_name": _ADVISOR, "notes": "Discuss Q1 performance and 529 reallocation", "meeting_link": "https://zoom.us/j/123456789"}],
    "mark": [],
    "carlos": [{"id": "mtg-002", "title": "Retirement Planning Session", "datetime": (datetime.utcnow() + timedelta(days=3, hours=14)).isoformat(), "duration_minutes": 60, "meeting_type": "retirement_planning", "status": "confirmed", "advisor_name": _ADVISOR, "notes": "Review retirement projections and early retirement timeline", "meeting_link": "https://zoom.us/j/987654321"}],
    "raj": [],
}
_SCHEDULED_MEETINGS["susan"] = _SCHEDULED_MEETINGS["mark"]
_SCHEDULED_MEETINGS["priya"] = _SCHEDULED_MEETINGS["raj"]


@router.get("/meetings")
async def get_meetings(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    return {"upcoming": _SCHEDULED_MEETINGS.get(prefix, []), "advisor_name": _ADVISOR, "advisor_email": "leslie@iabadvisors.com", "advisor_phone": "(555) 281-4567"}


@router.get("/meetings/availability")
async def get_meeting_availability(authorization: str | None = Header(None)):
    return {"slots": _AVAILABLE_SLOTS, "meeting_types": _MEETING_TYPES}


@router.post("/meetings")
async def schedule_meeting(data: dict, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    mt = next((t for t in _MEETING_TYPES if t["id"] == data.get("meeting_type")), _MEETING_TYPES[0])
    new = {
        "id": f"mtg-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "title": mt["name"],
        "datetime": data["datetime"],
        "duration_minutes": mt["duration"],
        "meeting_type": data.get("meeting_type", "general_questions"),
        "status": "confirmed",
        "advisor_name": _ADVISOR,
        "notes": data.get("notes", ""),
        "meeting_link": f"https://zoom.us/j/{_random.randint(100000000, 999999999)}",
    }
    _SCHEDULED_MEETINGS.setdefault(prefix, []).append(new)
    return {"success": True, "meeting": new}


@router.delete("/meetings/{meeting_id}")
async def cancel_meeting(meeting_id: str, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    meetings = _SCHEDULED_MEETINGS.get(prefix, [])
    for i, m in enumerate(meetings):
        if m["id"] == meeting_id:
            meetings.pop(i)
            return {"success": True}
    return {"success": False, "error": "Meeting not found"}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  REQUEST CENTER                                                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_REQUEST_TYPES = [
    {"id": "withdrawal", "name": "Withdrawal Request", "description": "Request a withdrawal from an account", "icon": "banknote"},
    {"id": "transfer", "name": "Transfer Request", "description": "Transfer funds between accounts", "icon": "arrow-right-left"},
    {"id": "address_change", "name": "Address Change", "description": "Update your mailing address", "icon": "map-pin"},
    {"id": "document_request", "name": "Document Request", "description": "Request specific documents", "icon": "file-text"},
    {"id": "contribution", "name": "Contribution", "description": "Make a contribution to an account", "icon": "plus-circle"},
    {"id": "beneficiary_change", "name": "Beneficiary Change", "description": "Update account beneficiaries", "icon": "users"},
    {"id": "other", "name": "Other Request", "description": "Other requests or questions", "icon": "help-circle"},
]

_REQUESTS: Dict[str, list] = {
    "nicole": [
        {"id": "req-001", "type": "withdrawal", "type_name": "Withdrawal Request", "status": "in_review", "submitted_at": (datetime.utcnow() - timedelta(days=2)).isoformat(), "details": {"account": "Robinhood Individual (***8821)", "amount": 5000, "method": "ACH Transfer"}, "notes": "Need funds for home repair", "updates": [{"date": (datetime.utcnow() - timedelta(days=2)).isoformat(), "message": "Request submitted", "status": "submitted"}, {"date": (datetime.utcnow() - timedelta(days=1)).isoformat(), "message": "Under review by your advisor", "status": "in_review"}]},
    ],
    "mark": [],
    "carlos": [],
    "raj": [],
}
_REQUESTS["susan"] = _REQUESTS["mark"]
_REQUESTS["priya"] = _REQUESTS["raj"]


@router.get("/requests/types")
async def get_request_types():
    return {"types": _REQUEST_TYPES}


@router.get("/requests")
async def get_requests(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    return {"requests": _REQUESTS.get(prefix, [])}


@router.post("/requests")
async def submit_request(data: dict, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    rt = next((t for t in _REQUEST_TYPES if t["id"] == data.get("type")), None)
    new = {
        "id": f"req-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "type": data.get("type", "other"),
        "type_name": rt["name"] if rt else "Request",
        "status": "pending",
        "submitted_at": datetime.utcnow().isoformat(),
        "details": data.get("details", {}),
        "notes": data.get("notes", ""),
        "updates": [{"date": datetime.utcnow().isoformat(), "message": "Request submitted successfully", "status": "submitted"}],
    }
    _REQUESTS.setdefault(prefix, []).insert(0, new)
    return {"success": True, "request": new}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  NOTIFICATIONS CENTER                                                      ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_NOTIFICATIONS: Dict[str, list] = {
    "nicole": [
        {"id": "n1", "type": "document", "title": "New Document Available", "message": "Q4 2025 Performance Report is ready to view", "link": "/portal/documents", "is_read": False, "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat()},
        {"id": "n2", "type": "alert", "title": "NVDA Concentration Warning", "message": "NVIDIA position exceeds 40% of your Robinhood account", "link": "/portal/dashboard", "is_read": False, "created_at": (datetime.utcnow() - timedelta(hours=8)).isoformat()},
        {"id": "n3", "type": "meeting", "title": "Meeting Reminder", "message": "Quarterly Portfolio Review in 7 days", "link": "/portal/meetings", "is_read": True, "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
        {"id": "n4", "type": "goal", "title": "Goal Milestone!", "message": "Emergency Reserve reached 60% of target", "link": "/portal/goals", "is_read": True, "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat()},
        {"id": "n5", "type": "request", "title": "Request Update", "message": "Your withdrawal request is under review", "link": "/portal/requests", "is_read": False, "created_at": (datetime.utcnow() - timedelta(hours=20)).isoformat()},
    ],
    "mark": [
        {"id": "n6", "type": "document", "title": "Tax Document Ready", "message": "2025 1099-DIV is available for download", "link": "/portal/documents", "is_read": False, "created_at": (datetime.utcnow() - timedelta(hours=4)).isoformat()},
        {"id": "n7", "type": "meeting", "title": "Annual Review", "message": "It's time to schedule your annual review", "link": "/portal/meetings", "is_read": False, "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
    ],
    "carlos": [
        {"id": "n8", "type": "meeting", "title": "Upcoming Meeting", "message": "Retirement Planning Session in 3 days", "link": "/portal/meetings", "is_read": False, "created_at": (datetime.utcnow() - timedelta(hours=1)).isoformat()},
        {"id": "n9", "type": "alert", "title": "Rebalance Recommended", "message": "Your equity allocation has drifted above target", "link": "/portal/performance", "is_read": False, "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()},
    ],
    "raj": [
        {"id": "n10", "type": "trade", "title": "Rebalancing Complete", "message": "Quarterly rebalancing has been executed", "link": "/portal/dashboard", "is_read": False, "created_at": (datetime.utcnow() - timedelta(hours=6)).isoformat()},
    ],
}
_NOTIFICATIONS["susan"] = _NOTIFICATIONS["mark"]
_NOTIFICATIONS["priya"] = _NOTIFICATIONS["raj"]


@router.get("/notifications")
async def get_notifications(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    notifs = _NOTIFICATIONS.get(prefix, [])
    return {"notifications": notifs, "unread_count": sum(1 for n in notifs if not n["is_read"])}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    for n in _NOTIFICATIONS.get(prefix, []):
        if n["id"] == notification_id:
            n["is_read"] = True
            return {"ok": True}
    return {"ok": False}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    for n in _NOTIFICATIONS.get(prefix, []):
        n["is_read"] = True
    return {"ok": True}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  AI FINANCIAL ASSISTANT                                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

import math as _math

_RESPONSE_KEYWORDS: list[tuple[str, list[str]]] = [
    ("balance",     ["balance", "how much", "total", "worth", "value", "portfolio"]),
    ("performance", ["performance", "return", "gains", "doing", "ytd", "growth"]),
    ("advisor",     ["advisor", "contact", "speak", "call", "meet", "schedule"]),
    ("fees",        ["fee", "cost", "expense", "charge"]),
    ("tax",         ["tax", "1099", "capital gain", "harvest"]),
    ("goal",        ["goal", "retirement", "target", "progress", "saving"]),
    ("rebalance",   ["rebalance", "allocation", "drift", "diversi"]),
    ("account",     ["account", "ira", "401k", "roth", "brokerage"]),
    ("document",    ["document", "statement", "report", "download"]),
    ("risk",        ["risk", "volatility", "conservative", "aggressive"]),
]


def _classify(msg: str) -> str:
    low = msg.lower()
    for cat, keywords in _RESPONSE_KEYWORDS:
        if any(k in low for k in keywords):
            return cat
    return "general"


def _build_response(cat: str, hh: dict) -> dict:
    total = sum(a["current_value"] for a in hh["accounts"])
    acct_count = len(hh["accounts"])
    name = hh["client_name"].split()[0]
    rp = hh.get("risk_profile", {})

    templates: dict[str, tuple[str, list[str]]] = {
        "balance": (
            f"{name}, your total household portfolio value is **${total:,.2f}** across {acct_count} account{'s' if acct_count != 1 else ''}.\n\n"
            + "\n".join(f"• **{a['account_name']}** — ${a['current_value']:,.2f} ({a['tax_type']})" for a in hh["accounts"]),
            ["How is my portfolio performing?", "Show my goals", "View risk profile"],
        ),
        "performance": (
            f"{name}, your portfolio is up **{hh['ytd_return']*100:.1f}%** year-to-date, which translates to roughly **${total * hh['ytd_return']:,.0f}** in gains this year.\n\n"
            "You can see a detailed breakdown including monthly returns and benchmark comparison on your Performance page.",
            ["View performance charts", "What's my asset allocation?", "Show tax impact"],
        ),
        "advisor": (
            f"Your advisor is **{_ADVISOR}** at {_FIRM}.\n\n"
            "You can:\n"
            "• **Schedule a meeting** — go to your Meetings page\n"
            "• **Call** — (555) 281-4567\n"
            "• **Email** — leslie@iabadvisors.com\n\n"
            "Would you like me to help you schedule a meeting?",
            ["Schedule a meeting", "What are my open action items?", "View my goals"],
        ),
        "fees": (
            f"{name}, here's a summary of fees across your accounts:\n\n"
            + "\n".join(f"• **{a['account_name']}** — {a['custodian']}" for a in hh["accounts"])
            + "\n\nYour advisor is monitoring fee levels and has flagged any high-fee accounts in your action items.",
            ["Show my action items", "View account details", "Contact advisor"],
        ),
        "tax": (
            f"{name}, for the current tax year:\n\n"
            "• Your **realized gains** and tax documents are available in the Tax Center\n"
            "• Tax forms (1099-DIV, 1099-B) can be downloaded from the Documents page\n"
            "• Your advisor is monitoring **tax-loss harvesting** opportunities\n\n"
            "Visit your Tax Center for a detailed breakdown of gains, losses, and estimated tax liability.",
            ["Go to Tax Center", "View tax documents", "What are tax-loss opportunities?"],
        ),
        "goal": (
            f"{name}, you have **{len(hh.get('goals', []))}** active goals:\n\n"
            + "\n".join(
                f"• **{g['name']}** — ${g['current_amount']:,.0f} of ${g['target_amount']:,.0f} "
                f"({g['progress_pct']*100:.0f}%) {'✅ On track' if g['on_track'] else '⚠️ Needs attention'}"
                for g in hh.get("goals", [])
            )
            + "\n\nYou can adjust contributions or timelines on your Goals page.",
            ["Adjust a goal", "Run what-if scenario", "Contact advisor"],
        ),
        "rebalance": (
            f"{name}, your current allocation based on your **{rp.get('risk_level', 'Moderate')}** risk profile targets:\n\n"
            f"• Equities: {rp.get('target_equity', 55)}%\n"
            f"• Fixed Income: {rp.get('target_fixed_income', 35)}%\n"
            f"• Alternatives: {rp.get('target_alternatives', 10)}%\n\n"
            "Check your Performance page for current vs. target allocation details. Your advisor reviews allocation drift quarterly.",
            ["View allocation chart", "Retake risk assessment", "Schedule rebalance review"],
        ),
        "account": (
            f"{name}, you have {acct_count} accounts in your household:\n\n"
            + "\n".join(f"• **{a['account_name']}** — {a['account_type']} at {a['custodian']} — ${a['current_value']:,.2f}" for a in hh["accounts"])
            + "\n\nClick on any account in your Dashboard to see holdings details.",
            ["Show portfolio performance", "View account holdings", "Contact advisor"],
        ),
        "document": (
            f"{name}, your documents are organized in the Documents page. You currently have **{len(hh.get('documents', []))}** documents available including:\n\n"
            "• Performance reports\n• Account statements\n• Tax forms (1099s)\n• Advisory agreements\n\n"
            "Visit the Documents page to view or download any document.",
            ["Go to Documents", "View tax forms", "Show latest statement"],
        ),
        "risk": (
            f"{name}, your risk profile is **{rp.get('risk_level', 'Moderate')}** (score: {rp.get('risk_score', 50)}/100).\n\n"
            f"This means your recommended allocation is {rp.get('target_equity', 55)}% equities, "
            f"{rp.get('target_fixed_income', 35)}% fixed income, and {rp.get('target_alternatives', 10)}% alternatives.\n\n"
            "You can retake the risk assessment anytime from your Risk Profile page if your circumstances have changed.",
            ["Retake risk assessment", "View allocation", "Run what-if scenario"],
        ),
        "general": (
            f"Hi {name}! I'm your AI financial assistant. I can help with:\n\n"
            "• 💰 **Account balances** — \"What's my portfolio worth?\"\n"
            "• 📈 **Performance** — \"How are my investments doing?\"\n"
            "• 🎯 **Goals** — \"Am I on track for retirement?\"\n"
            "• 📋 **Tax info** — \"Show my tax summary\"\n"
            "• 📅 **Meetings** — \"Schedule a meeting with my advisor\"\n"
            "• 🔄 **Allocation** — \"What's my asset allocation?\"\n\n"
            "What would you like to know?",
            ["What's my balance?", "How am I doing?", "Show my goals"],
        ),
    }
    text, followups = templates.get(cat, templates["general"])
    return {"response": text, "suggested_follow_ups": followups, "category": cat}


@router.get("/assistant/history")
async def get_chat_history(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    name = hh["client_name"].split()[0]
    return {"messages": [
        {"role": "assistant", "content": f"Hi {name}! 👋 I'm your AI financial assistant. Ask me anything about your accounts, performance, goals, or taxes.", "timestamp": datetime.utcnow().isoformat()},
    ]}


@router.post("/assistant/chat")
async def chat_with_assistant(data: dict, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    msg = data.get("message", "")
    cat = _classify(msg)
    return _build_response(cat, hh)


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  WHAT-IF SCENARIOS                                                         ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def _project(current_savings: float, monthly_contrib: float, annual_return: float,
             years: int, inflation: float = 0.025) -> list[dict]:
    """Return year-by-year projection."""
    balance = current_savings
    monthly_r = annual_return / 12
    rows: list[dict] = []
    for y in range(years + 1):
        rows.append({"year": y, "balance": round(balance, 0)})
        for _ in range(12):
            balance = balance * (1 + monthly_r) + monthly_contrib
    return rows


def _scenario(current_savings: float, monthly_contrib: float, annual_return: float,
              current_age: int, retire_age: int, monthly_spending: float,
              inflation: float = 0.025) -> dict:
    years = retire_age - current_age
    balance = current_savings
    monthly_r = annual_return / 12
    for _ in range(years * 12):
        balance = balance * (1 + monthly_r) + monthly_contrib
    balance = round(balance, 0)
    real_return = annual_return - inflation
    monthly_income = round(balance * 0.04 / 12, 0)
    years_income = round(balance / (monthly_spending * 12), 1) if monthly_spending > 0 else 99
    success = min(99, max(30, int(60 + (monthly_income / max(monthly_spending, 1)) * 25)))
    return {
        "retirement_age": retire_age,
        "balance": balance,
        "monthly_income": monthly_income,
        "years_of_income": years_income,
        "success_probability": success,
        "shortfall_risk": monthly_income < monthly_spending,
    }


@router.post("/what-if/calculate")
async def what_if_calculate(data: dict, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    current_savings = data.get("current_savings", sum(a["current_value"] for a in hh["accounts"]))
    current_age = data.get("current_age", 45)
    retire_age = data.get("retirement_age", 65)
    monthly_contrib = data.get("monthly_contribution", 1500)
    annual_return = data.get("expected_return", 7.0) / 100
    inflation = data.get("inflation_rate", 2.5) / 100
    monthly_spending = data.get("retirement_spending", 6000)

    primary = _scenario(current_savings, monthly_contrib, annual_return, current_age, retire_age, monthly_spending, inflation)
    yearly = _project(current_savings, monthly_contrib, annual_return, retire_age - current_age, inflation)

    comparisons = []
    for ra in [max(current_age + 5, 60), 65, 67]:
        if ra == retire_age:
            comparisons.append(primary)
        else:
            comparisons.append(_scenario(current_savings, monthly_contrib, annual_return, current_age, ra, monthly_spending, inflation))

    return {
        "projection": primary,
        "yearly_projections": yearly,
        "comparison": comparisons,
        "inputs": {
            "current_age": current_age,
            "retirement_age": retire_age,
            "current_savings": current_savings,
            "monthly_contribution": monthly_contrib,
            "expected_return": annual_return * 100,
            "inflation_rate": inflation * 100,
            "retirement_spending": monthly_spending,
        },
    }


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  TAX CENTER                                                                ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_TAX_DATA: Dict[str, dict] = {
    "nicole": {
        "summary": {
            "realized_gains_st": 1250.00, "realized_gains_lt": 4500.00, "realized_losses": -890.00,
            "net_realized": 4860.00, "estimated_tax_st": 312.50, "estimated_tax_lt": 675.00,
            "total_estimated_tax": 987.50, "unrealized_gains": 6405.58, "unrealized_losses": -1854.86,
            "tax_loss_harvest_opportunities": 2,
        },
        "realized_transactions": [
            {"date": "2025-11-15", "symbol": "AAPL", "shares": 10, "proceeds": 2250, "cost_basis": 1800, "gain": 450, "term": "long", "account": "Robinhood"},
            {"date": "2025-12-01", "symbol": "MSFT", "shares": 5, "proceeds": 1875, "cost_basis": 1625, "gain": 250, "term": "short", "account": "Robinhood"},
            {"date": "2026-01-10", "symbol": "VTI", "shares": 20, "proceeds": 4500, "cost_basis": 4000, "gain": 500, "term": "long", "account": "E*TRADE"},
            {"date": "2025-08-20", "symbol": "NWMRE", "shares": 1, "proceeds": 2420, "cost_basis": 2600, "gain": -180, "term": "long", "account": "NW Mutual"},
            {"date": "2025-10-05", "symbol": "BND", "shares": 10, "proceeds": 880, "cost_basis": 950, "gain": -70, "term": "short", "account": "E*TRADE"},
        ],
        "tax_lots": [
            {"symbol": "NVDA", "name": "NVIDIA Corporation", "shares": 65, "cost_basis": 4800, "current_value": 8586.50, "unrealized": 3786.50, "term": "long", "purchase_date": "2024-03-15", "account": "Robinhood"},
            {"symbol": "AAPL", "name": "Apple Inc.", "shares": 25, "cost_basis": 4000, "current_value": 4637.50, "unrealized": 637.50, "term": "long", "purchase_date": "2023-08-20", "account": "Robinhood"},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "shares": 10, "cost_basis": 3200, "current_value": 3374.50, "unrealized": 174.50, "term": "long", "purchase_date": "2024-01-10", "account": "Robinhood"},
            {"symbol": "TSLA", "name": "Tesla Inc.", "shares": 8, "cost_basis": 2100, "current_value": 1636.06, "unrealized": -463.94, "term": "short", "purchase_date": "2025-06-15", "account": "Robinhood"},
            {"symbol": "NWMRE", "name": "Real Estate Securities Fund", "shares": 1, "cost_basis": 2600, "current_value": 2420, "unrealized": -180.00, "term": "long", "purchase_date": "2024-09-01", "account": "NW Mutual"},
            {"symbol": "BND", "name": "Vanguard Total Bond Market", "shares": 25, "cost_basis": 2300, "current_value": 2215.08, "unrealized": -84.92, "term": "long", "purchase_date": "2024-11-20", "account": "E*TRADE"},
            {"symbol": "NWMSB", "name": "Select Bond Fund (Allspring)", "shares": 1, "cost_basis": 5600, "current_value": 5473.65, "unrealized": -126.35, "term": "long", "purchase_date": "2024-06-01", "account": "NW Mutual"},
        ],
        "tax_documents": [
            {"name": "2025 Form 1099-DIV (Robinhood)", "status": "available", "date": "2026-01-31"},
            {"name": "2025 Form 1099-B (Robinhood)", "status": "available", "date": "2026-02-15"},
            {"name": "2025 Form 1099-INT (E*TRADE)", "status": "pending", "date": "2026-02-28"},
            {"name": "2024 Form 1099-DIV (Robinhood)", "status": "available", "date": "2025-01-31"},
        ],
    },
    "mark": {
        "summary": {
            "realized_gains_st": 0, "realized_gains_lt": 8500, "realized_losses": -1200,
            "net_realized": 7300, "estimated_tax_st": 0, "estimated_tax_lt": 1275,
            "total_estimated_tax": 1275, "unrealized_gains": 31300, "unrealized_losses": -3170,
            "tax_loss_harvest_opportunities": 1,
        },
        "realized_transactions": [
            {"date": "2025-12-15", "symbol": "SCHD", "shares": 100, "proceeds": 8500, "cost_basis": 7200, "gain": 1300, "term": "long", "account": "Schwab Joint"},
        ],
        "tax_lots": [
            {"symbol": "VTI", "name": "Vanguard Total Stock Market", "shares": 350, "cost_basis": 75000, "current_value": 83800, "unrealized": 8800, "term": "long", "purchase_date": "2022-03-01", "account": "Schwab Joint"},
            {"symbol": "BND", "name": "Vanguard Total Bond Market", "shares": 800, "cost_basis": 72000, "current_value": 70880, "unrealized": -1120, "term": "long", "purchase_date": "2023-01-15", "account": "Schwab Joint"},
        ],
        "tax_documents": [
            {"name": "2025 Form 1099-DIV (Schwab)", "status": "available", "date": "2026-01-31"},
            {"name": "2025 Form 1099-B (Schwab)", "status": "pending", "date": "2026-02-28"},
        ],
    },
    "carlos": {
        "summary": {
            "realized_gains_st": 500, "realized_gains_lt": 3200, "realized_losses": -400,
            "net_realized": 3300, "estimated_tax_st": 125, "estimated_tax_lt": 480,
            "total_estimated_tax": 605, "unrealized_gains": 30500, "unrealized_losses": -2000,
            "tax_loss_harvest_opportunities": 1,
        },
        "realized_transactions": [],
        "tax_lots": [
            {"symbol": "SWPPX", "name": "Schwab S&P 500 Index", "shares": 2200, "cost_basis": 130000, "current_value": 150000, "unrealized": 20000, "term": "long", "purchase_date": "2021-06-01", "account": "Schwab Rollover"},
        ],
        "tax_documents": [
            {"name": "2025 Form 1099-DIV (Schwab)", "status": "available", "date": "2026-01-31"},
        ],
    },
    "raj": {
        "summary": {
            "realized_gains_st": 0, "realized_gains_lt": 2100, "realized_losses": -300,
            "net_realized": 1800, "estimated_tax_st": 0, "estimated_tax_lt": 315,
            "total_estimated_tax": 315, "unrealized_gains": 12886, "unrealized_losses": -1990,
            "tax_loss_harvest_opportunities": 1,
        },
        "realized_transactions": [],
        "tax_lots": [
            {"symbol": "VTI", "name": "Vanguard Total Stock Market", "shares": 200, "cost_basis": 42000, "current_value": 47886, "unrealized": 5886, "term": "long", "purchase_date": "2021-09-01", "account": "Vanguard Brokerage"},
        ],
        "tax_documents": [
            {"name": "2025 Form 1099-DIV (Vanguard)", "status": "available", "date": "2026-01-31"},
        ],
    },
}
_TAX_DATA["susan"] = _TAX_DATA["mark"]
_TAX_DATA["priya"] = _TAX_DATA["raj"]


@router.get("/tax/summary")
async def get_tax_summary(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    td = _TAX_DATA.get(prefix, _TAX_DATA["nicole"])
    return {"summary": td["summary"], "tax_documents": td["tax_documents"]}


@router.get("/tax/lots")
async def get_tax_lots(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    td = _TAX_DATA.get(prefix, _TAX_DATA["nicole"])
    return {"realized_transactions": td["realized_transactions"], "tax_lots": td["tax_lots"]}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  BENEFICIARY MANAGEMENT                                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_BENEFICIARIES: Dict[str, dict] = {
    "nicole": {
        "accounts": [
            {
                "account_id": "acc-001",
                "account_name": "NW Mutual VA IRA (4532)",
                "account_type": "IRA",
                "primary_beneficiaries": [
                    {"name": "Michael Wilson", "relationship": "Spouse", "percentage": 100, "dob": "1982-05-20"},
                ],
                "contingent_beneficiaries": [
                    {"name": "Emma Wilson", "relationship": "Daughter", "percentage": 50, "dob": "2010-03-15"},
                    {"name": "James Wilson", "relationship": "Son", "percentage": 50, "dob": "2013-07-22"},
                ],
                "last_updated": "2024-06-15",
                "needs_review": False,
                "review_reason": None,
            },
            {
                "account_id": "acc-002",
                "account_name": "Robinhood Individual (8821)",
                "account_type": "Taxable",
                "primary_beneficiaries": [
                    {"name": "Michael Wilson", "relationship": "Spouse", "percentage": 100},
                ],
                "contingent_beneficiaries": [],
                "last_updated": "2023-11-20",
                "needs_review": True,
                "review_reason": "No contingent beneficiaries designated",
            },
            {
                "account_id": "acc-003",
                "account_name": "E*TRADE 401(k) (3390)",
                "account_type": "401(k)",
                "primary_beneficiaries": [
                    {"name": "Michael Wilson", "relationship": "Spouse", "percentage": 100},
                ],
                "contingent_beneficiaries": [
                    {"name": "Emma Wilson", "relationship": "Daughter", "percentage": 50},
                    {"name": "James Wilson", "relationship": "Son", "percentage": 50},
                ],
                "last_updated": "2024-01-10",
                "needs_review": False,
                "review_reason": None,
            },
            {
                "account_id": "acc-004",
                "account_name": "NW Mutual 529 Plan (6617)",
                "account_type": "529",
                "primary_beneficiaries": [
                    {"name": "Emma Wilson", "relationship": "Daughter", "percentage": 100, "dob": "2010-03-15"},
                ],
                "contingent_beneficiaries": [
                    {"name": "James Wilson", "relationship": "Son", "percentage": 100, "dob": "2013-07-22"},
                ],
                "last_updated": "2024-06-15",
                "needs_review": False,
                "review_reason": None,
            },
        ],
        "pending_requests": [],
    },
    "mark": {
        "accounts": [
            {
                "account_id": "acc-h1",
                "account_name": "Schwab Joint Brokerage (7701)",
                "account_type": "Joint",
                "primary_beneficiaries": [
                    {"name": "Susan Henderson", "relationship": "Spouse", "percentage": 100},
                ],
                "contingent_beneficiaries": [
                    {"name": "Olivia Henderson", "relationship": "Daughter", "percentage": 50},
                    {"name": "Ethan Henderson", "relationship": "Son", "percentage": 50},
                ],
                "last_updated": "2024-03-20",
                "needs_review": False,
                "review_reason": None,
            },
            {
                "account_id": "acc-h2",
                "account_name": "Schwab Traditional IRA (7702)",
                "account_type": "IRA",
                "primary_beneficiaries": [
                    {"name": "Susan Henderson", "relationship": "Spouse", "percentage": 100},
                ],
                "contingent_beneficiaries": [],
                "last_updated": "2022-09-15",
                "needs_review": True,
                "review_reason": "No contingent beneficiaries; last reviewed over 2 years ago",
            },
        ],
        "pending_requests": [],
    },
    "carlos": {
        "accounts": [
            {
                "account_id": "acc-m1",
                "account_name": "Schwab Rollover IRA (5501)",
                "account_type": "IRA",
                "primary_beneficiaries": [
                    {"name": "Maria Martinez", "relationship": "Spouse", "percentage": 100},
                ],
                "contingent_beneficiaries": [
                    {"name": "Sofia Martinez", "relationship": "Daughter", "percentage": 100},
                ],
                "last_updated": "2024-08-10",
                "needs_review": False,
                "review_reason": None,
            },
        ],
        "pending_requests": [],
    },
    "raj": {
        "accounts": [
            {
                "account_id": "acc-p1",
                "account_name": "Vanguard Brokerage (9901)",
                "account_type": "Taxable",
                "primary_beneficiaries": [
                    {"name": "Priya Patel", "relationship": "Spouse", "percentage": 100},
                ],
                "contingent_beneficiaries": [
                    {"name": "Arjun Patel", "relationship": "Son", "percentage": 50},
                    {"name": "Meera Patel", "relationship": "Daughter", "percentage": 50},
                ],
                "last_updated": "2024-05-01",
                "needs_review": False,
                "review_reason": None,
            },
        ],
        "pending_requests": [],
    },
}
_BENEFICIARIES["susan"] = _BENEFICIARIES["mark"]
_BENEFICIARIES["priya"] = _BENEFICIARIES["raj"]


@router.get("/beneficiaries")
async def get_beneficiaries(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    data = _BENEFICIARIES.get(prefix, _BENEFICIARIES["nicole"])
    return data


@router.post("/beneficiaries/update-request")
async def submit_beneficiary_update(data: dict, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    ben = _BENEFICIARIES.get(prefix, _BENEFICIARIES["nicole"])
    req_id = f"ben-req-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    new_req = {
        "id": req_id,
        "account_id": data.get("account_id"),
        "change_type": data.get("change_type", "review"),
        "description": data.get("description", ""),
        "status": "submitted",
        "submitted_at": datetime.utcnow().isoformat(),
    }
    ben["pending_requests"].insert(0, new_req)
    return {
        "success": True,
        "request_id": req_id,
        "message": "Your beneficiary update request has been submitted. Your advisor will contact you within 2 business days.",
        "next_steps": [
            "Advisor review within 2 business days",
            "You may need to sign updated forms",
            "Changes effective after processing",
        ],
    }


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  FAMILY DASHBOARD                                                          ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

_FAMILY_DATA: Dict[str, dict] = {
    "nicole": {
        "household_name": "Wilson Family",
        "total_household_value": 142405.58,
        "members": [
            {
                "id": "member-001",
                "name": "Nicole Wilson",
                "relationship": "Self",
                "is_self": True,
                "total_value": 54905.58,
                "accounts_count": 3,
                "ytd_return": 8.5,
                "can_view_details": True,
                "accounts": [
                    {"name": "NW Mutual VA IRA (4532)", "value": 16849.36, "type": "IRA"},
                    {"name": "Robinhood Individual (8821)", "value": 26982.57, "type": "Taxable"},
                    {"name": "E*TRADE 401(k) (3390)", "value": 11073.65, "type": "401(k)"},
                ],
            },
            {
                "id": "member-002",
                "name": "Michael Wilson",
                "relationship": "Spouse",
                "is_self": False,
                "total_value": 87500.00,
                "accounts_count": 2,
                "ytd_return": 6.2,
                "can_view_details": True,
                "accounts": [
                    {"name": "Fidelity 401(k)", "value": 65000, "type": "401(k)"},
                    {"name": "Roth IRA", "value": 22500, "type": "Roth IRA"},
                ],
            },
        ],
        "dependents": [
            {"name": "Emma Wilson", "relationship": "Daughter", "age": 15, "has_529": True, "plan_value": 18500},
            {"name": "James Wilson", "relationship": "Son", "age": 12, "has_529": False, "plan_value": 0},
        ],
        "joint_accounts": [],
        "household_allocation": {"equity": 62, "fixed_income": 28, "alternatives": 10},
    },
    "mark": {
        "household_name": "Henderson Family",
        "total_household_value": 687230.00,
        "members": [
            {
                "id": "member-003",
                "name": "Mark Henderson",
                "relationship": "Self",
                "is_self": True,
                "total_value": 487230.00,
                "accounts_count": 4,
                "ytd_return": 5.2,
                "can_view_details": True,
                "accounts": [
                    {"name": "Schwab Joint Brokerage (7701)", "value": 195000, "type": "Joint"},
                    {"name": "Schwab Trad IRA (7702)", "value": 145000, "type": "IRA"},
                    {"name": "Schwab Roth IRA (7703)", "value": 82230, "type": "Roth IRA"},
                    {"name": "Fidelity 401(k) (7704)", "value": 65000, "type": "401(k)"},
                ],
            },
            {
                "id": "member-004",
                "name": "Susan Henderson",
                "relationship": "Spouse",
                "is_self": False,
                "total_value": 200000.00,
                "accounts_count": 2,
                "ytd_return": 4.8,
                "can_view_details": True,
                "accounts": [
                    {"name": "Fidelity Roth IRA", "value": 120000, "type": "Roth IRA"},
                    {"name": "Schwab Brokerage", "value": 80000, "type": "Taxable"},
                ],
            },
        ],
        "dependents": [
            {"name": "Olivia Henderson", "relationship": "Daughter", "age": 20, "has_529": True, "plan_value": 42000},
            {"name": "Ethan Henderson", "relationship": "Son", "age": 17, "has_529": True, "plan_value": 35000},
        ],
        "joint_accounts": [{"name": "Schwab Joint Brokerage (7701)", "value": 195000, "type": "Joint"}],
        "household_allocation": {"equity": 35, "fixed_income": 50, "alternatives": 15},
    },
    "carlos": {
        "household_name": "Martinez Household",
        "total_household_value": 312500.00,
        "members": [
            {
                "id": "member-005",
                "name": "Carlos Martinez",
                "relationship": "Self",
                "is_self": True,
                "total_value": 312500.00,
                "accounts_count": 3,
                "ytd_return": 6.8,
                "can_view_details": True,
                "accounts": [
                    {"name": "Schwab Rollover IRA (5501)", "value": 180000, "type": "IRA"},
                    {"name": "Schwab Roth IRA (5502)", "value": 67500, "type": "Roth IRA"},
                    {"name": "Schwab Brokerage (5503)", "value": 65000, "type": "Taxable"},
                ],
            },
        ],
        "dependents": [
            {"name": "Sofia Martinez", "relationship": "Daughter", "age": 8, "has_529": True, "plan_value": 22000},
        ],
        "joint_accounts": [],
        "household_allocation": {"equity": 60, "fixed_income": 20, "alternatives": 20},
    },
    "raj": {
        "household_name": "Patel Family",
        "total_household_value": 398750.00,
        "members": [
            {
                "id": "member-006",
                "name": "Raj Patel",
                "relationship": "Self",
                "is_self": True,
                "total_value": 198750.00,
                "accounts_count": 3,
                "ytd_return": 7.2,
                "can_view_details": True,
                "accounts": [
                    {"name": "Vanguard Brokerage (9901)", "value": 85000, "type": "Taxable"},
                    {"name": "Vanguard Trad IRA (9902)", "value": 68750, "type": "IRA"},
                    {"name": "Vanguard Roth IRA (9903)", "value": 45000, "type": "Roth IRA"},
                ],
            },
            {
                "id": "member-007",
                "name": "Priya Patel",
                "relationship": "Spouse",
                "is_self": False,
                "total_value": 200000.00,
                "accounts_count": 2,
                "ytd_return": 6.9,
                "can_view_details": True,
                "accounts": [
                    {"name": "Fidelity 401(k)", "value": 135000, "type": "401(k)"},
                    {"name": "Fidelity Roth IRA", "value": 65000, "type": "Roth IRA"},
                ],
            },
        ],
        "dependents": [
            {"name": "Arjun Patel", "relationship": "Son", "age": 10, "has_529": True, "plan_value": 28000},
            {"name": "Meera Patel", "relationship": "Daughter", "age": 7, "has_529": True, "plan_value": 19500},
        ],
        "joint_accounts": [],
        "household_allocation": {"equity": 55, "fixed_income": 30, "alternatives": 15},
    },
}
_FAMILY_DATA["susan"] = _FAMILY_DATA["mark"]
_FAMILY_DATA["priya"] = _FAMILY_DATA["raj"]


@router.get("/family")
async def get_family(authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    return _FAMILY_DATA.get(prefix, _FAMILY_DATA["nicole"])


@router.get("/family/{member_id}")
async def get_family_member(member_id: str, authorization: str | None = Header(None)):
    hh = _resolve_household(authorization)
    prefix = _prefix_from_email(hh["email"])
    fam = _FAMILY_DATA.get(prefix, _FAMILY_DATA["nicole"])
    for m in fam["members"]:
        if m["id"] == member_id:
            if not m.get("can_view_details"):
                raise HTTPException(status_code=403, detail="Not authorized to view this member's details")
            return m
    raise HTTPException(status_code=404, detail="Family member not found")
