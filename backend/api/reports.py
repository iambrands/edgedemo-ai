"""
Reports generation endpoints.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from enum import Enum

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


class ReportType(str, Enum):
    QUARTERLY_PERFORMANCE = "quarterly_performance"
    ANNUAL_SUMMARY = "annual_summary"
    PORTFOLIO_SNAPSHOT = "portfolio_snapshot"
    TAX_REPORT = "tax_report"
    COMPLIANCE_REPORT = "compliance_report"
    BILLING_REPORT = "billing_report"
    PROPOSAL_REPORT = "proposal_report"


class ReportRequest(BaseModel):
    household_id: str
    report_type: ReportType
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    include_benchmark: bool = True
    include_commentary: bool = True
    format: str = "json"


class FeeImpactReport(BaseModel):
    account_id: str
    total_annual_fees: float
    projected_10yr: float
    projected_30yr: float
    opportunity_cost_30yr: float
    recommendations: list[str]


@router.post("/generate")
async def generate_report(request: ReportRequest):
    """Generate a report based on type and parameters."""
    if request.report_type == ReportType.QUARTERLY_PERFORMANCE:
        return await _generate_quarterly_report(request)
    elif request.report_type == ReportType.ANNUAL_SUMMARY:
        return await _generate_annual_report(request)
    elif request.report_type == ReportType.PORTFOLIO_SNAPSHOT:
        return await _generate_snapshot(request)
    elif request.report_type == ReportType.TAX_REPORT:
        return await _generate_tax_report(request)
    elif request.report_type == ReportType.COMPLIANCE_REPORT:
        return await _generate_compliance_report(request)
    elif request.report_type == ReportType.BILLING_REPORT:
        return await _generate_billing_report(request)
    elif request.report_type == ReportType.PROPOSAL_REPORT:
        return await _generate_proposal_report(request)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {request.report_type}")


@router.get("/types")
async def get_report_types():
    """Get available report types with descriptions."""
    return [
        {"type": "quarterly_performance", "name": "Quarterly Performance Report", "description": "Time-weighted returns, holdings, allocation drift, fees, and AI commentary", "requires_period": True},
        {"type": "annual_summary", "name": "Annual Summary Report", "description": "Full-year performance, tax summary, IPS compliance check, year-over-year comparison", "requires_period": True},
        {"type": "portfolio_snapshot", "name": "Portfolio Snapshot", "description": "Current holdings, allocation, and risk metrics — one-page client meeting summary", "requires_period": False},
        {"type": "tax_report", "name": "Tax Report", "description": "Realized gains/losses, tax-loss harvesting activity, wash sale log, cost basis summary", "requires_period": True},
        {"type": "compliance_report", "name": "Compliance Report", "description": "All compliance checks, fiduciary documentation trail, exception log", "requires_period": True},
        {"type": "billing_report", "name": "Billing Report", "description": "Fees charged by account, AUM fee calculation, fee schedule breakdown", "requires_period": True},
        {"type": "proposal_report", "name": "Proposal Report", "description": "Current vs recommended portfolio comparison with projected outcomes", "requires_period": False},
    ]


@router.get("/history")
async def get_report_history(
    household_id: Optional[str] = None,
    report_type: Optional[str] = None,
    limit: int = 20,
):
    """Get previously generated reports."""
    now = datetime.now()
    return [
        {"id": "rpt_001", "household_name": "Wilson Family", "report_type": "quarterly_performance", "period": "Q4 2025", "generated_at": now.isoformat(), "generated_by": "Leslie Wilson", "status": "completed"},
        {"id": "rpt_002", "household_name": "Johnson Household", "report_type": "annual_summary", "period": "2025", "generated_at": now.isoformat(), "generated_by": "Leslie Wilson", "status": "completed"},
        {"id": "rpt_003", "household_name": "Chen Family Trust", "report_type": "portfolio_snapshot", "period": "Current", "generated_at": now.isoformat(), "generated_by": "Leslie Wilson", "status": "completed"},
    ]


@router.get("/scheduled")
async def get_scheduled_reports():
    """Get reports scheduled for auto-generation."""
    return [
        {"id": "sched_001", "household_name": "All Households", "report_type": "quarterly_performance", "frequency": "quarterly", "next_run": "2026-04-01", "delivery": "email", "enabled": True},
        {"id": "sched_002", "household_name": "All Households", "report_type": "annual_summary", "frequency": "annual", "next_run": "2027-01-15", "delivery": "email + portal", "enabled": True},
    ]


async def _generate_quarterly_report(request: ReportRequest):
    period_start = request.period_start or date(2025, 10, 1)
    period_end = request.period_end or date(2025, 12, 31)
    return {
        "household_id": request.household_id,
        "household_name": "Wilson Family",
        "report_type": "quarterly_performance",
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "generated_at": datetime.now().isoformat(),
        "performance": {
            "total_return": 4.23,
            "benchmark_return": 3.87,
            "alpha": 0.36,
            "sharpe_ratio": 0.65,
            "monthly_data": [{"month": "Oct 2025", "portfolio": 1.8, "benchmark": 1.5}, {"month": "Nov 2025", "portfolio": 1.2, "benchmark": 1.4}, {"month": "Dec 2025", "portfolio": 1.1, "benchmark": 0.9}],
        },
        "holdings": [
            {"symbol": "VXART", "name": "Vaxart Inc.", "value": 32919.84, "weight": 60.0, "gain_loss": -8200.00, "gain_loss_pct": -19.9},
            {"symbol": "AFFIRM", "name": "Affirm Holdings", "value": 5848.00, "weight": 10.6, "gain_loss": 1200.00, "gain_loss_pct": 25.8},
            {"symbol": "ALIBABA", "name": "Alibaba Group", "value": 3512.80, "weight": 6.4, "gain_loss": -450.00, "gain_loss_pct": -11.4},
        ],
        "allocation": {
            "current": {"equity": 100, "fixed_income": 0, "alternatives": 0, "cash": 0},
            "target": {"equity": 60, "fixed_income": 30, "alternatives": 5, "cash": 5},
            "drift": {"equity": 40, "fixed_income": -30, "alternatives": -5, "cash": -5},
        },
        "fees": {"total": 284.70, "breakdown": {"advisory_fee": 137.26, "expense_ratios": 89.44, "m_and_e_charges": 58.00}},
        "ai_commentary": (
            "The Wilson Family portfolio returned 4.23% this quarter, outperforming the blended benchmark by 36 basis points. "
            "However, significant concentration risk remains with VXART representing 60% of the portfolio."
        ) if request.include_commentary else None,
        "fiduciary_disclosure": "IAB Advisors is a registered investment adviser acting in a fiduciary capacity. All recommendations are made in the client's best interest.",
    }


async def _generate_annual_report(request: ReportRequest):
    return {
        "household_id": request.household_id,
        "household_name": "Wilson Family",
        "report_type": "annual_summary",
        "year": 2025,
        "generated_at": datetime.now().isoformat(),
        "annual_performance": {"total_return": 8.45, "benchmark_return": 10.12, "alpha": -1.67, "quarterly_returns": [{"quarter": "Q1", "return": 3.2}, {"quarter": "Q2", "return": -1.5}, {"quarter": "Q3", "return": 2.5}, {"quarter": "Q4", "return": 4.23}]},
        "tax_summary": {"realized_gains_short_term": 1250.00, "realized_gains_long_term": 3400.00, "realized_losses": -6180.00, "net_realized": -1530.00, "unrealized_gains": 2100.00, "unrealized_losses": -12380.00, "tax_loss_harvested": 4200.00},
        "ips_compliance": {"in_compliance": False, "deviations": ["Equity allocation (100%) exceeds target range (50-70%)", "No fixed income allocation (target: 25-35%)", "Single position concentration (VXART at 60%) exceeds 10% limit"], "review_scheduled": "2026-02-15"},
        "total_fees_paid": 1138.80,
        "distributions_and_contributions": {"total_contributions": 6000.00, "total_distributions": 0.00, "dividends_received": 342.50},
        "fiduciary_disclosure": "IAB Advisors is a registered investment adviser acting in a fiduciary capacity.",
    }


async def _generate_snapshot(request: ReportRequest):
    return {
        "household_id": request.household_id,
        "household_name": "Wilson Family",
        "report_type": "portfolio_snapshot",
        "as_of_date": date.today().isoformat(),
        "generated_at": datetime.now().isoformat(),
        "summary": {"total_value": 54905.58, "total_accounts": 3, "risk_profile": "Moderate", "ytd_return": 2.15},
        "accounts": [{"name": "NW Mutual VA IRA (***4532)", "value": 42105.00, "pct": 76.7}, {"name": "Robinhood (***8821)", "value": 8012.00, "pct": 14.6}, {"name": "E*TRADE (***3390)", "value": 4788.58, "pct": 8.7}],
        "top_holdings": [{"symbol": "VXART", "value": 32919.84, "weight": 60.0}, {"symbol": "AFFIRM", "value": 5848.00, "weight": 10.6}, {"symbol": "SPIRE", "value": 5201.80, "weight": 9.5}],
        "allocation": {"equity": 100, "fixed_income": 0, "alternatives": 0, "cash": 0},
        "risk_metrics": {"portfolio_beta": 1.42, "sharpe_ratio": 0.65, "concentration_risk": 72.0, "health_score": 62, "health_grade": "C+"},
        "key_observations": ["Portfolio heavily concentrated in speculative tech stocks", "No fixed income or alternative asset allocation", "Tax-loss harvesting opportunities identified ($3,200 - $5,500)", "Rebalancing recommended to align with moderate risk profile"],
    }


async def _generate_tax_report(request: ReportRequest):
    return {
        "household_id": request.household_id,
        "report_type": "tax_report",
        "tax_year": 2025,
        "generated_at": datetime.now().isoformat(),
        "realized_gains_losses": [{"symbol": "AAPL", "shares": 10, "proceeds": 1850.00, "cost_basis": 1500.00, "gain_loss": 350.00, "term": "long_term", "date_sold": "2025-06-15"}, {"symbol": "TSLA", "shares": 5, "proceeds": 900.00, "cost_basis": 1200.00, "gain_loss": -300.00, "term": "short_term", "date_sold": "2025-09-20"}],
        "unrealized_positions": [{"symbol": "VXART", "shares": 500, "current_value": 32919.84, "cost_basis": 41119.84, "unrealized": -8200.00, "term": "long_term"}, {"symbol": "AFFIRM", "shares": 100, "current_value": 5848.00, "cost_basis": 4648.00, "unrealized": 1200.00, "term": "short_term"}],
        "harvesting_activity": [{"date": "2025-11-15", "symbol": "AMRN", "loss_harvested": 1850.00, "replacement": "XBI", "wash_sale": False}],
        "wash_sale_log": [],
        "estimated_tax_liability": {"short_term_gains": 950.00, "long_term_gains": 350.00, "losses_applied": -300.00, "net_taxable": 1000.00, "estimated_federal_tax": 220.00, "estimated_state_tax": 65.00},
    }


async def _generate_compliance_report(request: ReportRequest):
    return {
        "household_id": request.household_id,
        "report_type": "compliance_report",
        "period": "Q4 2025",
        "generated_at": datetime.now().isoformat(),
        "summary": {"total_checks": 47, "passed": 42, "warnings": 3, "failed": 2},
        "checks": [{"rule": "FINRA 2111", "description": "Suitability Assessment", "result": "pass", "date": "2025-10-15"}, {"rule": "FINRA 2330", "description": "VA Suitability", "result": "warning", "date": "2025-10-15", "detail": "VA fees exceed 2% threshold"}, {"rule": "Reg BI", "description": "Best Interest Obligation", "result": "warning", "date": "2025-11-01", "detail": "Lower-cost alternatives available"}, {"rule": "Concentration", "description": "Single Position Limit", "result": "fail", "date": "2025-12-01", "detail": "VXART at 60% exceeds 10% limit"}, {"rule": "Fiduciary", "description": "Best Interest Documentation", "result": "pass", "date": "2025-12-15"}],
        "exceptions": [{"rule": "Concentration", "detail": "VXART position at 60% — client informed, rebalancing recommended", "resolution": "Client acknowledged risk, deferred rebalancing to Q1 2026", "advisor_sign_off": True, "date": "2025-12-01"}],
        "fiduciary_attestation": "I attest that all investment recommendations during this period were made in the client's best interest.",
    }


async def _generate_billing_report(request: ReportRequest):
    return {
        "household_id": request.household_id,
        "report_type": "billing_report",
        "period": "Q4 2025",
        "generated_at": datetime.now().isoformat(),
        "summary": {"total_fees": 284.70, "aum_basis": 54905.58, "effective_rate_bps": 207, "prior_period_fees": 271.30, "change_pct": 4.9},
        "by_account": [
            {"account": "NW Mutual VA IRA (***4532)", "aum": 42105.00, "advisory_fee": 105.26, "expense_ratios": 86.31, "m_and_e_charges": 58.00, "total": 249.57, "effective_rate_bps": 237},
            {"account": "Robinhood (***8821)", "aum": 8012.00, "advisory_fee": 20.03, "expense_ratios": 0.00, "m_and_e_charges": 0.00, "total": 20.03, "effective_rate_bps": 100},
            {"account": "E*TRADE (***3390)", "aum": 4788.58, "advisory_fee": 11.97, "expense_ratios": 3.13, "m_and_e_charges": 0.00, "total": 15.10, "effective_rate_bps": 126},
        ],
        "fee_schedule": {"advisory_rate": "1.00% annually (0.25% quarterly)", "billing_method": "Advance, based on quarter-start AUM", "fee_type": "Fee-only (no commissions)"},
    }


async def _generate_proposal_report(request: ReportRequest):
    return {
        "household_id": request.household_id,
        "report_type": "proposal_report",
        "generated_at": datetime.now().isoformat(),
        "current_portfolio": {"total_value": 54905.58, "allocation": {"equity": 100, "fixed_income": 0, "alternatives": 0, "cash": 0}, "weighted_expense_ratio": 0.0082, "all_in_cost_pct": 2.07, "risk_score": 72, "concentration_risk": "Critical — 60% single position", "top_holdings": [{"symbol": "VXART", "weight": 60.0}, {"symbol": "AFFIRM", "weight": 10.6}, {"symbol": "SPIRE", "weight": 9.5}]},
        "recommended_portfolio": {"name": "Moderate Growth ETF Portfolio", "allocation": {"equity": 60, "fixed_income": 32, "alternatives": 6, "cash": 2}, "weighted_expense_ratio": 0.0006, "all_in_cost_pct": 1.06, "risk_score": 45, "concentration_risk": "Low — diversified across 9 ETFs", "top_holdings": [{"symbol": "VTI", "weight": 36.0}, {"symbol": "BND", "weight": 22.0}, {"symbol": "VEA", "weight": 15.0}]},
        "comparison": {"fee_savings_annual": 554.00, "fee_savings_10yr": 8200.00, "fee_savings_20yr": 24500.00, "risk_reduction": "27 points (72 → 45)", "diversification_improvement": "3 positions → 9 ETFs across 5 asset classes"},
        "projected_outcomes": {"scenario_current": {"10yr_projected": 78000, "20yr_projected": 112000, "30yr_projected": 165000}, "scenario_recommended": {"10yr_projected": 95000, "20yr_projected": 168000, "30yr_projected": 298000}, "assumptions": "7% avg annual return for balanced, 9% for all-equity, 2% inflation, fees deducted"},
    }
