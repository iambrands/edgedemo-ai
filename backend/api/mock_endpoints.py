"""
Mock-only API routers for all DB-dependent features.

Mounted by app.py as fallback when real routers fail to import (e.g. because
the DB models / SQLAlchemy packages are not available in the current
environment).  These serve realistic demo data from mock_data_store.py.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query, Request

logger = logging.getLogger(__name__)

# ── Lazy helper: import mock_data_store at call time so the module doesn't
#    fail if mock_data_store itself has issues at import time.
def _store():
    # Works in both standard and nixpacks layout
    try:
        from backend.services.mock_data_store import (
            prospect_list_response,
            pipeline_summary_response,
            conversion_metrics_response,
            pending_tasks_response,
            available_custodians_response,
            custodian_connections_response,
            custodian_accounts_response,
            custodian_positions_response,
            custodian_allocation_response,
            custodian_transactions_response,
            tax_opportunity_list_response,
            tax_summary_response,
            tax_settings_response,
            tax_wash_sales_response,
            model_list_response,
            marketplace_response,
            model_assignments_response,
            rebalance_signals_response,
            alt_investment_list_response,
            alt_pending_calls_response,
            conversation_analyses_response,
            conversation_metrics_response,
            conversation_flags_response,
            conversation_action_items_response,
            liquidity_withdrawals_response,
            liquidity_profile_response,
            compliance_documents_response,
            compliance_doc_versions_response,
            compliance_adv2b_data_response,
            compliance_form_crs_data_response,
        )
    except ImportError:
        from services.mock_data_store import (
            prospect_list_response,
            pipeline_summary_response,
            conversion_metrics_response,
            pending_tasks_response,
            available_custodians_response,
            custodian_connections_response,
            custodian_accounts_response,
            custodian_positions_response,
            custodian_allocation_response,
            custodian_transactions_response,
            tax_opportunity_list_response,
            tax_summary_response,
            tax_settings_response,
            tax_wash_sales_response,
            model_list_response,
            marketplace_response,
            model_assignments_response,
            rebalance_signals_response,
            alt_investment_list_response,
            alt_pending_calls_response,
            conversation_analyses_response,
            conversation_metrics_response,
            conversation_flags_response,
            conversation_action_items_response,
            liquidity_withdrawals_response,
            liquidity_profile_response,
            compliance_documents_response,
            compliance_doc_versions_response,
            compliance_adv2b_data_response,
            compliance_form_crs_data_response,
        )

    class _S:
        """Namespace for all mock response functions."""
        pass

    s = _S()
    for name, fn in list(locals().items()):
        if callable(fn) and name.endswith("_response"):
            setattr(s, name, fn)
    return s


# ════════════════════════════════════════════════════════════════════════════
# PROSPECT PIPELINE  /api/v1/prospects
# ════════════════════════════════════════════════════════════════════════════

prospects_router = APIRouter(prefix="/api/v1/prospects", tags=["prospects-mock"])

_created_prospects: list = []


@prospects_router.get("")
async def list_prospects(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    data = _store().prospect_list_response(status=status, page=page, page_size=page_size)
    if _created_prospects:
        all_prospects = _created_prospects[:] + data.get("prospects", [])
        if status:
            all_prospects = [p for p in all_prospects if p.get("status") == status]
        data["prospects"] = all_prospects
        data["total"] = len(all_prospects)
    return data


@prospects_router.get("/pipeline/summary")
async def pipeline_summary():
    return _store().pipeline_summary_response()


@prospects_router.get("/pipeline/metrics")
async def conversion_metrics(days: int = Query(90, ge=7, le=365)):
    return _store().conversion_metrics_response(days)


@prospects_router.get("/tasks/pending")
async def pending_tasks():
    return _store().pending_tasks_response()


@prospects_router.get("/{prospect_id}")
async def get_prospect(prospect_id: str):
    for p in _created_prospects:
        if p["id"] == prospect_id:
            return p
    data = _store().prospect_list_response()
    for p in data["prospects"]:
        if p["id"] == prospect_id:
            return p
    return {"detail": "Prospect not found"}, 404


@prospects_router.post("")
async def create_prospect(request: Request):
    """Create a new prospect (mock — returns a realistic fake record)."""
    body: Dict[str, Any] = {}
    try:
        body = await request.json()
    except Exception:
        pass
    now = datetime.now(timezone.utc).isoformat()
    prospect = {
        "id": str(uuid.uuid4()),
        "advisor_id": "demo-advisor-001",
        "first_name": body.get("first_name", "New"),
        "last_name": body.get("last_name", "Prospect"),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "company": body.get("company", ""),
        "title": body.get("title", ""),
        "industry": body.get("industry", ""),
        "linkedin_url": body.get("linkedin_url", ""),
        "city": body.get("city", ""),
        "state": body.get("state", ""),
        "zip_code": body.get("zip_code", ""),
        "status": body.get("status", "new"),
        "stage": "discovery",
        "lead_source": body.get("lead_source", "website"),
        "source_detail": body.get("source_detail", ""),
        "estimated_aum": body.get("estimated_aum"),
        "estimated_assets": body.get("estimated_aum"),
        "annual_income": body.get("annual_income"),
        "net_worth": body.get("net_worth"),
        "risk_tolerance": body.get("risk_tolerance", "moderate"),
        "investment_goals": body.get("investment_goals", []),
        "time_horizon": body.get("time_horizon", ""),
        "interested_services": body.get("interested_services", []),
        "lead_score": body.get("lead_score", 50),
        "fit_score": body.get("fit_score", 50),
        "intent_score": body.get("intent_score", 40),
        "engagement_score": body.get("engagement_score", 30),
        "score": body.get("lead_score", 50),
        "next_action": "Initial outreach",
        "next_action_date": now,
        "next_action_type": body.get("next_action_type", "call"),
        "next_action_notes": body.get("next_action_notes", ""),
        "days_in_stage": 0,
        "total_days_in_pipeline": 0,
        "tags": body.get("tags", []),
        "notes": body.get("notes", ""),
        "ai_summary": "",
        "custom_fields": body.get("custom_fields", {}),
        "created_at": now,
        "updated_at": now,
    }
    _created_prospects.insert(0, prospect)
    logger.info("Mock prospect created: %s %s (id=%s)", prospect["first_name"], prospect["last_name"], prospect["id"])
    return prospect


@prospects_router.patch("/{prospect_id}")
async def update_prospect(prospect_id: str, request: Request):
    """Update a prospect (mock — returns the prospect with updated fields)."""
    body: Dict[str, Any] = {}
    try:
        body = await request.json()
    except Exception:
        pass
    data = _store().prospect_list_response()
    for p in data["prospects"]:
        if p["id"] == prospect_id:
            p.update(body)
            return p
    # Return a synthetic updated prospect if not found in mock data
    now = datetime.now(timezone.utc).isoformat()
    return {"id": prospect_id, "updated_at": now, **body}


@prospects_router.post("/{prospect_id}/activities")
async def log_prospect_activity(prospect_id: str, request: Request):
    """Log an activity for a prospect (mock)."""
    body: Dict[str, Any] = {}
    try:
        body = await request.json()
    except Exception:
        pass
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "prospect_id": prospect_id,
        "type": body.get("type", "note"),
        "subject": body.get("subject", "Activity logged"),
        "description": body.get("description", ""),
        "outcome": body.get("outcome", ""),
        "duration_minutes": body.get("duration_minutes", 0),
        "created_at": now,
        "created_by": "demo-advisor-001",
    }


@prospects_router.get("/{prospect_id}/activities")
async def get_prospect_activities(prospect_id: str):
    """Get activities for a prospect (mock — returns empty list)."""
    return {"activities": [], "total": 0}


@prospects_router.get("/{prospect_id}/proposals")
async def get_prospect_proposals(prospect_id: str):
    """Get proposals for a prospect (mock — returns empty list)."""
    return {"proposals": [], "total": 0}


@prospects_router.post("/{prospect_id}/proposals/generate")
async def generate_proposal(prospect_id: str):
    """Generate a proposal for a prospect (mock)."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "prospect_id": prospect_id,
        "title": "Investment Management Proposal",
        "status": "draft",
        "content": "Mock proposal content — customize this for the prospect.",
        "created_at": now,
    }


@prospects_router.post("/{prospect_id}/score")
async def rescore_prospect(prospect_id: str):
    """Re-score a prospect (mock)."""
    return {"id": prospect_id, "lead_score": 65, "fit_score": 70, "intent_score": 55, "engagement_score": 45}


# ════════════════════════════════════════════════════════════════════════════
# CUSTODIANS  /api/v1/custodians
# ════════════════════════════════════════════════════════════════════════════

custodians_router = APIRouter(prefix="/api/v1/custodians", tags=["custodians-mock"])


@custodians_router.get("/available")
async def available_custodians():
    return _store().available_custodians_response()


@custodians_router.get("/connections")
async def custodian_connections():
    return _store().custodian_connections_response()


@custodians_router.get("/accounts")
async def custodian_accounts():
    return _store().custodian_accounts_response()


@custodians_router.get("/positions")
async def custodian_positions():
    return _store().custodian_positions_response()


@custodians_router.get("/asset-allocation")
async def custodian_allocation():
    return _store().custodian_allocation_response()


@custodians_router.get("/transactions")
async def custodian_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    return _store().custodian_transactions_response(page=page, page_size=page_size)


# ════════════════════════════════════════════════════════════════════════════
# TAX-LOSS HARVESTING  /api/v1/tax-harvest
# ════════════════════════════════════════════════════════════════════════════

tax_router = APIRouter(prefix="/api/v1/tax-harvest", tags=["tax-harvest-mock"])


@tax_router.get("/opportunities")
async def tax_opportunities():
    return _store().tax_opportunity_list_response()


@tax_router.get("/opportunities/summary")
async def tax_summary():
    return _store().tax_summary_response()


@tax_router.get("/settings")
async def tax_settings():
    return _store().tax_settings_response()


@tax_router.get("/wash-sales")
async def tax_wash_sales():
    return _store().tax_wash_sales_response()


@tax_router.get("/opportunities/{opportunity_id}")
async def get_opportunity(opportunity_id: str):
    data = _store().tax_opportunity_list_response()
    for o in data["opportunities"]:
        if o["id"] == opportunity_id:
            return o
    return {"detail": "Opportunity not found"}, 404


# ════════════════════════════════════════════════════════════════════════════
# MODEL PORTFOLIO MARKETPLACE  /api/v1/model-portfolios
# ════════════════════════════════════════════════════════════════════════════

model_router = APIRouter(prefix="/api/v1/model-portfolios", tags=["model-portfolios-mock"])


@model_router.get("/marketplace/browse")
async def marketplace_browse():
    return _store().marketplace_response()


@model_router.get("/assignments")
async def model_assignments():
    return _store().model_assignments_response()


@model_router.get("/rebalance/signals")
async def rebalance_signals():
    return _store().rebalance_signals_response()


@model_router.get("")
async def list_models():
    return _store().model_list_response()


@model_router.get("/{model_id}/assignments")
async def model_assignments_for_model(model_id: str):
    return _store().model_assignments_response()


@model_router.get("/{model_id}/validate-holdings")
async def validate_holdings(model_id: str):
    return {
        "model_id": model_id,
        "total_weight": 100.0,
        "is_valid": True,
        "difference": 0.0,
        "errors": [],
    }


@model_router.get("/{model_id}")
async def get_model(model_id: str):
    data = _store().marketplace_response()
    for m in data["models"]:
        if m["id"] == model_id:
            return m
    return {"detail": "Model not found"}, 404


# ════════════════════════════════════════════════════════════════════════════
# ALTERNATIVE ASSETS  /api/v1/alternative-assets
# ════════════════════════════════════════════════════════════════════════════

alt_router = APIRouter(prefix="/api/v1/alternative-assets", tags=["alternatives-mock"])


@alt_router.get("/capital-calls/pending")
async def pending_capital_calls():
    return _store().alt_pending_calls_response()


@alt_router.get("")
async def list_investments():
    return _store().alt_investment_list_response()


@alt_router.get("/{investment_id}")
async def get_investment(investment_id: str):
    data = _store().alt_investment_list_response()
    for i in data["investments"]:
        if i["id"] == investment_id:
            return i
    return {"detail": "Investment not found"}, 404


# ════════════════════════════════════════════════════════════════════════════
# CONVERSATION INTELLIGENCE  /api/v1/conversations
# ════════════════════════════════════════════════════════════════════════════

conv_router = APIRouter(prefix="/api/v1/conversations", tags=["conversations-mock"])


@conv_router.get("/analyses")
async def list_analyses(days: int = Query(30, ge=1, le=365)):
    return _store().conversation_analyses_response()


@conv_router.get("/metrics")
async def conv_metrics(days: int = Query(30, ge=1, le=365)):
    return _store().conversation_metrics_response(days)


@conv_router.get("/compliance/flags")
async def compliance_flags():
    return _store().conversation_flags_response()


@conv_router.get("/compliance/flags/pending")
async def pending_flags():
    resp = _store().conversation_flags_response()
    pending = [f for f in resp["flags"] if f["status"] == "pending"]
    return {"flags": pending, "total": len(pending)}


@conv_router.get("/action-items")
async def action_items():
    return _store().conversation_action_items_response()


@conv_router.get("/action-items/pending")
async def pending_action_items():
    resp = _store().conversation_action_items_response()
    pending = [i for i in resp["items"] if i["status"] == "pending"]
    return {"items": pending, "total": len(pending), "overdue": resp["overdue"]}


@conv_router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str):
    data = _store().conversation_analyses_response()
    for a in data["analyses"]:
        if a["id"] == analysis_id:
            return a
    return {"detail": "Analysis not found"}, 404


# ════════════════════════════════════════════════════════════════════════════
# LIQUIDITY OPTIMIZATION  /api/v1/liquidity
# ════════════════════════════════════════════════════════════════════════════

liquidity_router = APIRouter(prefix="/api/v1/liquidity", tags=["liquidity-mock"])


@liquidity_router.get("/withdrawals")
async def list_withdrawals():
    return _store().liquidity_withdrawals_response()


@liquidity_router.get("/profile/{client_id}")
async def liquidity_profile(client_id: str):
    return _store().liquidity_profile_response(client_id)


@liquidity_router.get("/withdrawals/{request_id}")
async def get_withdrawal(request_id: str):
    for wr in _store().liquidity_withdrawals_response():
        if wr["id"] == request_id:
            return wr
    return {"detail": "Withdrawal request not found"}, 404


# ════════════════════════════════════════════════════════════════════════════
# COMPLIANCE DOCUMENTS  /api/v1/compliance/documents
# ════════════════════════════════════════════════════════════════════════════

compliance_docs_router = APIRouter(
    prefix="/api/v1/compliance/documents", tags=["compliance-docs-mock"]
)


@compliance_docs_router.get("/adv-2b-data/{advisor_id}")
async def adv_2b_data(advisor_id: str):
    return _store().compliance_adv2b_data_response(advisor_id)


@compliance_docs_router.get("/form-crs-data")
async def form_crs_data():
    return _store().compliance_form_crs_data_response()


@compliance_docs_router.get("")
async def list_documents():
    return _store().compliance_documents_response()


@compliance_docs_router.get("/{document_id}")
async def get_document(document_id: str):
    for doc in _store().compliance_documents_response():
        if doc["id"] == document_id:
            return doc
    return {"detail": "Document not found"}, 404


@compliance_docs_router.get("/{document_id}/versions")
async def document_versions(document_id: str):
    return _store().compliance_doc_versions_response(document_id)


# ════════════════════════════════════════════════════════════════════════════
# COMPLIANCE CO-PILOT  /api/v1/compliance  (alerts, tasks, audit-trail)
# ════════════════════════════════════════════════════════════════════════════

compliance_copilot_router = APIRouter(
    prefix="/api/v1/compliance", tags=["compliance-copilot-mock"]
)


@compliance_copilot_router.get("/alerts")
async def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
):
    return _store().compliance_alerts_response(status=status, severity=severity)


@compliance_copilot_router.get("/alerts/{alert_id}")
async def get_alert(alert_id: str):
    detail = _store().compliance_alert_detail_response(alert_id)
    if detail is None:
        return {"detail": "Alert not found"}
    return detail


@compliance_copilot_router.patch("/alerts/{alert_id}/status")
async def update_alert_status(alert_id: str):
    detail = _store().compliance_alert_detail_response(alert_id)
    if detail is None:
        return {"detail": "Alert not found"}
    return detail


@compliance_copilot_router.post("/alerts/{alert_id}/comments")
async def add_alert_comment(alert_id: str):
    return {
        "id": "cm-new-001",
        "user_name": "Demo Advisor",
        "content": "Comment added.",
        "created_at": _store()._now().isoformat() if hasattr(_store(), '_now') else "2025-01-01T00:00:00",
    }


@compliance_copilot_router.get("/tasks")
async def list_tasks(
    status: Optional[str] = None,
    include_completed: bool = False,
):
    return _store().compliance_tasks_response(status=status, include_completed=include_completed)


@compliance_copilot_router.post("/tasks")
async def create_task():
    return _store().compliance_tasks_response()[0]


@compliance_copilot_router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str):
    tasks = _store()._compliance_tasks()
    for t in tasks:
        if t["id"] == task_id:
            t["status"] = "completed"
            return t
    return {"detail": "Task not found"}


@compliance_copilot_router.get("/audit-trail")
async def audit_trail():
    return _store().compliance_audit_log_response()


# ════════════════════════════════════════════════════════════════════════════
# ANALYSIS MOCK ROUTER — serves demo results for all 6 analysis tool types
# ════════════════════════════════════════════════════════════════════════════

analysis_mock_router = APIRouter(prefix="/api/v1/analysis", tags=["analysis-mock"])

_ANALYSIS_RESULTS = {
    "portfolio": {
        "allocation": [
            {"category": "US Equity", "percentage": 48, "color": "#3B82F6"},
            {"category": "Int'l Equity", "percentage": 15, "color": "#10B981"},
            {"category": "Fixed Income", "percentage": 22, "color": "#F59E0B"},
            {"category": "Alternatives", "percentage": 8, "color": "#8B5CF6"},
            {"category": "Cash", "percentage": 7, "color": "#94A3B8"},
        ],
        "metrics": [
            {"label": "Diversification Score", "value": "78/100"},
            {"label": "Sharpe Ratio", "value": "1.42"},
            {"label": "Risk-Adj Return", "value": "12.8%"},
        ],
        "recommendations": [
            "Consider reducing US large-cap tech concentration from 35% to below 25%",
            "Increase international emerging market exposure by 5% for diversification",
            "Add TIPS allocation (3-5%) to hedge against inflation risk",
            "Move excess cash to short-duration treasuries for better yield",
        ],
    },
    "fee": {
        "totalFees": 3840,
        "feePercentage": 0.72,
        "potentialSavings": 1620,
        "breakdown": [
            {"account": "NW Mutual VA IRA (4532)", "feePercent": 1.35, "annualCost": 2275, "status": "high"},
            {"account": "Robinhood Individual (8821)", "feePercent": 0.12, "annualCost": 324, "status": "low"},
            {"account": "E*TRADE 401(k) (3390)", "feePercent": 0.45, "annualCost": 498, "status": "moderate"},
            {"account": "NW Mutual 529 Plan (6617)", "feePercent": 0.95, "annualCost": 743, "status": "high"},
        ],
    },
    "tax": {
        "unrealizedGains": 6406,
        "unrealizedLosses": 1855,
        "taxEfficiencyScore": 74,
        "harvestingOpportunities": [
            {"ticker": "TSLA", "description": "Short-term loss — replace with broad EV/auto ETF", "loss": 464},
            {"ticker": "NWMRE", "description": "Real estate fund loss — swap to SCHH for similar exposure", "loss": 180},
            {"ticker": "BND", "description": "Bond fund loss — switch to AGG to maintain duration", "loss": 85},
        ],
    },
    "risk": {
        "riskScore": 58,
        "riskFactors": [
            {"name": "Single Stock Concentration", "description": "NVDA is 15.6% of portfolio — above 10% threshold", "level": "high"},
            {"name": "Sector Concentration", "description": "Technology sector at 38% — above 30% guideline", "level": "high"},
            {"name": "Account Diversification", "description": "Assets spread across 4 custodians with varied strategies", "level": "low"},
            {"name": "Interest Rate Sensitivity", "description": "Bond duration of 5.2 years — moderate rate risk", "level": "moderate"},
            {"name": "Liquidity Risk", "description": "92% of portfolio in liquid securities", "level": "low"},
        ],
    },
    "etf": {
        "recommendations": [
            {"ticker": "VTI", "name": "Vanguard Total Stock Market", "category": "US Broad Market", "allocation": 40, "expenseRatio": 0.03},
            {"ticker": "VXUS", "name": "Vanguard Total Int'l Stock", "category": "International Equity", "allocation": 20, "expenseRatio": 0.07},
            {"ticker": "BND", "name": "Vanguard Total Bond Market", "category": "Fixed Income", "allocation": 25, "expenseRatio": 0.03},
            {"ticker": "VNQ", "name": "Vanguard Real Estate ETF", "category": "Alternatives (REITs)", "allocation": 5, "expenseRatio": 0.12},
            {"ticker": "VTIP", "name": "Vanguard Short-Term TIPS", "category": "Inflation Protection", "allocation": 5, "expenseRatio": 0.04},
            {"ticker": "SGOV", "name": "iShares 0-3 Month Treasury", "category": "Cash / Ultra Short", "allocation": 5, "expenseRatio": 0.05},
        ],
        "totalExpenseRatio": 0.05,
    },
    "ips": {
        "clientProfile": "Nicole Wilson, age 42. Married with two children (Emma, 15; James, 12). Employed as a marketing director with household income of $185,000. Moderate risk tolerance with a 20+ year investment horizon for retirement assets.",
        "objectives": "Primary: Accumulate retirement assets targeting $1.2M by age 65. Secondary: Fund college education for two children ($150K combined target by 2028/2031). Tertiary: Maintain 6-month emergency reserve.",
        "riskTolerance": "Moderate — willing to accept short-term volatility of up to 20% drawdown for higher long-term returns. Risk capacity is above average given dual income, stable employment, and long time horizon. Risk questionnaire score: 62/100.",
        "allocationGuidelines": "Target: 55-65% equities (split domestic/international 70/30), 20-30% fixed income, 5-10% alternatives, 3-7% cash equivalents. Maximum single-stock position: 10%. Maximum sector concentration: 25%.",
        "rebalancingPolicy": "Calendar rebalancing quarterly with 5% threshold bands. Tax-aware rebalancing preferred — harvest losses when available, defer short-term gains. Annual comprehensive review with advisor in Q4.",
    },
}


@analysis_mock_router.post("/{tool_type}/{household_id}")
async def run_mock_analysis(tool_type: str, household_id: str):
    """Return mock analysis results for any tool type."""
    import asyncio
    await asyncio.sleep(1.2)  # simulate processing
    data = _ANALYSIS_RESULTS.get(tool_type)
    if data is None:
        return {"error": f"Unknown analysis type: {tool_type}"}
    return data


# ════════════════════════════════════════════════════════════════════════════
# All mock routers in a single list for easy mounting
# ════════════════════════════════════════════════════════════════════════════

# ════════════════════════════════════════════════════════════════════════════
# MARKET DATA (IMM-01)  /api/v1/market-data
# ════════════════════════════════════════════════════════════════════════════

market_data_router = APIRouter(prefix="/api/v1/market-data", tags=["market-data-mock"])


@market_data_router.get("/advisor/{advisor_id}/data-freshness")
async def mock_data_freshness(advisor_id: str):
    return {
        "last_sync": datetime.now(timezone.utc).isoformat(),
        "stale": False,
        "age_seconds": 15,
    }


# ════════════════════════════════════════════════════════════════════════════
# COMPLIANCE EXCEPTIONS (IMM-03)  /api/v1/compliance/exceptions
# ════════════════════════════════════════════════════════════════════════════

compliance_exceptions_router = APIRouter(
    prefix="/api/v1/compliance", tags=["compliance-exceptions-mock"]
)


@compliance_exceptions_router.get("/exceptions")
async def mock_compliance_exceptions(resolved: bool = False):
    if resolved:
        return []
    return [
        {
            "id": "exc-001",
            "rule_code": "IA206_FIDUCIARY",
            "category": "FIDUCIARY_DUTY",
            "severity": "WARNING",
            "message": "Portfolio drift 11.2% from IPS target allocation for client Henderson",
            "client_name": "Mark Henderson",
            "triggered_at": datetime.now(timezone.utc).isoformat(),
            "resolved": False,
        },
        {
            "id": "exc-002",
            "rule_code": "SERIES65_SUITABILITY",
            "category": "SUITABILITY",
            "severity": "BLOCKING",
            "message": "Options strategy recommended for conservative profile (Wilson household)",
            "client_name": "Nicole Wilson",
            "triggered_at": datetime.now(timezone.utc).isoformat(),
            "resolved": False,
        },
        {
            "id": "exc-003",
            "rule_code": "ADV_CURRENCY",
            "category": "DISCLOSURE_OBLIGATIONS",
            "severity": "INFO",
            "message": "ADV Part 2B update recommended — last updated 310 days ago",
            "client_name": None,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
            "resolved": False,
        },
    ]


@compliance_exceptions_router.patch("/exceptions/{exception_id}/resolve")
async def mock_resolve_exception(exception_id: str, request: Request):
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    return {
        "id": exception_id,
        "resolved": True,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "resolution_note": body.get("note", "Resolved"),
    }


# ════════════════════════════════════════════════════════════════════════════
# TAX ANALYSIS (IMM-02)  /api/v1/tax
# ════════════════════════════════════════════════════════════════════════════

tax_analysis_router = APIRouter(prefix="/api/v1/tax", tags=["tax-analysis-mock"])


@tax_analysis_router.post("/ingest")
async def mock_tax_ingest(request: Request):
    return {"job_id": str(uuid.uuid4()), "status": "processing"}


@tax_analysis_router.get("/status/{job_id}")
async def mock_tax_status(job_id: str):
    return {"job_id": job_id, "status": "complete", "confidence": 0.92}


@tax_analysis_router.get("/profile/{client_id}")
async def mock_tax_profile(client_id: str):
    return {
        "client_id": client_id,
        "tax_year": 2025,
        "filing_status": "mfj",
        "agi": 285000.0,
        "taxable_income": 228000.0,
        "effective_rate": 0.226,
        "marginal_rate": 0.32,
        "capital_gains": {"short_term": 4200.0, "long_term": 18500.0},
        "qualified_dividends": 3200.0,
        "retirement_contributions": {"traditional_ira": 6500.0, "roth_ira": 0.0, "401k": 22500.0},
        "confidence": 0.92,
        "tax_aversion_score": 0.78,
        "tlh_opportunity_score": 0.72,
    }


# ════════════════════════════════════════════════════════════════════════════
# RECOMMENDATIONS (IMM-06)  /api/v1/clients/{client_id}/recommendations
# ════════════════════════════════════════════════════════════════════════════

recommendations_router = APIRouter(prefix="/api/v1", tags=["recommendations-mock"])


@recommendations_router.get("/clients/{client_id}/recommendations")
async def mock_recommendations(client_id: str):
    return [
        {
            "rec_id": "mock-rec-001",
            "advisor_id": "demo-advisor-001",
            "client_id": client_id,
            "rec_type": "TLH",
            "symbol": "AAPL",
            "quantity": 10,
            "target_weight": 0.0,
            "rationale": "Harvest $1,200 short-term loss to offset Q1 gains.",
            "confidence": 0.82,
            "tax_impact": {
                "estimated_gain_loss": -1200.0,
                "tax_consequence": "loss_harvest",
                "estimated_tax_dollars": -336.0,
            },
            "compliance_status": "APPROVED",
            "compliance_flags": [],
            "expires_at": datetime.now(timezone.utc).isoformat(),
            "order_preview": {
                "class": "equity",
                "symbol": "AAPL",
                "side": "sell",
                "quantity": 10,
                "type": "market",
                "duration": "day",
            },
        },
        {
            "rec_id": "mock-rec-002",
            "advisor_id": "demo-advisor-001",
            "client_id": client_id,
            "rec_type": "BUY",
            "symbol": "MSFT",
            "quantity": 5,
            "target_weight": 0.08,
            "rationale": "Add MSFT to reduce tech concentration risk vs SPY benchmark.",
            "confidence": 0.61,
            "tax_impact": {
                "estimated_gain_loss": 0,
                "tax_consequence": "neutral",
                "estimated_tax_dollars": 0,
            },
            "compliance_status": "WARNING",
            "compliance_flags": [
                "Portfolio drift 10.3% from IPS target — review before executing"
            ],
            "expires_at": datetime.now(timezone.utc).isoformat(),
            "order_preview": {
                "class": "equity",
                "symbol": "MSFT",
                "side": "buy",
                "quantity": 5,
                "type": "market",
                "duration": "day",
            },
        },
    ]


@recommendations_router.post("/recommendations/{rec_id}/submit-order")
async def mock_submit_order(rec_id: str, request: Request):
    return {
        "order_id": f"tradier-{uuid.uuid4().hex[:8]}",
        "rec_id": rec_id,
        "status": "filled",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }


@recommendations_router.post("/recommendations/{rec_id}/snooze")
async def mock_snooze(rec_id: str):
    return {"rec_id": rec_id, "snoozed": True}


@recommendations_router.post("/recommendations/{rec_id}/dismiss")
async def mock_dismiss(rec_id: str, request: Request):
    return {"rec_id": rec_id, "dismissed": True}


# ════════════════════════════════════════════════════════════════════════════
# SEED MILESTONE (IMM-04) — added to existing prospects router above
# ════════════════════════════════════════════════════════════════════════════


@prospects_router.get("/analytics/seed-milestone")
async def mock_seed_milestone():
    return {
        "active_clients": 12,
        "target": 100,
        "progress_pct": 12.0,
        "projected_date": "2026-09-15",
    }


@prospects_router.patch("/{prospect_id}/stage")
async def mock_advance_stage(prospect_id: str, request: Request):
    body: Dict[str, Any] = {}
    try:
        body = await request.json()
    except Exception:
        pass
    return {
        "id": prospect_id,
        "status": body.get("target_stage", "contacted"),
        "last_activity_at": datetime.now(timezone.utc).isoformat(),
        "first_name": "Demo",
        "last_name": "Prospect",
        "email": "demo@example.com",
        "lead_source": "website",
        "lead_score": 65,
        "fit_score": 70,
        "intent_score": 55,
        "engagement_score": 45,
        "days_in_stage": 0,
        "total_days_in_pipeline": 5,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@prospects_router.get("/{prospect_id}/communications")
async def mock_prospect_communications(prospect_id: str):
    return {"communications": [], "total": 0}


ALL_MOCK_ROUTERS = [
    ("prospects", prospects_router),
    ("custodians", custodians_router),
    ("tax_harvest", tax_router),
    ("model_portfolios", model_router),
    ("alternative_assets", alt_router),
    ("conversations", conv_router),
    ("liquidity", liquidity_router),
    ("compliance_docs", compliance_docs_router),
    ("compliance_copilot", compliance_copilot_router),
    ("analysis", analysis_mock_router),
    ("market_data", market_data_router),
    ("compliance_exceptions", compliance_exceptions_router),
    ("tax", tax_analysis_router),
    ("recommendations", recommendations_router),
]
