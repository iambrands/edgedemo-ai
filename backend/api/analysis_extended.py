"""
Extended analysis endpoints for tax optimization and risk (dashboard-friendly format).
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])


class FeeImpactReport(BaseModel):
    account_id: str
    total_annual_fees: float
    projected_10yr: float
    projected_30yr: float
    opportunity_cost_30yr: float
    recommendations: list[str]


@router.get("/fees/{account_id}", response_model=FeeImpactReport)
async def get_fee_impact(account_id: str):
    """Mock fee impact for dashboard (works with any account ID including acc_001)."""
    return FeeImpactReport(
        account_id=account_id,
        total_annual_fees=2847.00,
        projected_10yr=28470.00,
        projected_30yr=85410.00,
        opportunity_cost_30yr=42100.00,
        recommendations=[
            "Consider low-cost index ETFs (e.g., VTI, BND) to reduce expense ratios.",
            "Advisory fee of 0.60% is competitive; review if assets grow significantly.",
            "Move high-fee mutual funds to lower-cost alternatives — estimated savings $1,200/yr.",
        ],
    )


class TaxHarvestingOpportunity(BaseModel):
    symbol: str
    position_name: str
    shares: float
    unrealized_loss: float
    replacement_symbol: str
    replacement_name: str
    wash_sale_warning: str | None = None


class AssetLocationSuggestion(BaseModel):
    action: str
    description: str
    estimated_savings: float


class TaxOptimizationReport(BaseModel):
    household_id: str
    estimated_annual_savings_low: float
    estimated_annual_savings_high: float
    harvesting_opportunities: list[TaxHarvestingOpportunity]
    wash_sale_warnings: list[str]
    asset_location_suggestions: list[AssetLocationSuggestion]


@router.get("/tax/{household_id}", response_model=TaxOptimizationReport)
async def get_tax_optimization(household_id: str):
    """Get tax optimization analysis for a household."""
    return TaxOptimizationReport(
        household_id=household_id,
        estimated_annual_savings_low=3200.00,
        estimated_annual_savings_high=5500.00,
        harvesting_opportunities=[
            TaxHarvestingOpportunity(
                symbol="VXART",
                position_name="Vaxart Inc.",
                shares=500,
                unrealized_loss=-4230.00,
                replacement_symbol="VTI",
                replacement_name="Vanguard Total Stock Market ETF",
            ),
            TaxHarvestingOpportunity(
                symbol="AMRN",
                position_name="Amarin Corp.",
                shares=200,
                unrealized_loss=-1850.00,
                replacement_symbol="XBI",
                replacement_name="SPDR S&P Biotech ETF",
            ),
            TaxHarvestingOpportunity(
                symbol="BYND",
                position_name="Beyond Meat Inc.",
                shares=150,
                unrealized_loss=-2100.00,
                replacement_symbol="XLY",
                replacement_name="Consumer Discretionary Select Sector SPDR",
                wash_sale_warning="Purchased in Robinhood 12 days ago - wait 18 more days",
            ),
        ],
        wash_sale_warnings=[
            "VXART purchased in Robinhood 12 days ago - wait 18 more days before harvesting",
        ],
        asset_location_suggestions=[
            AssetLocationSuggestion(
                action="Move",
                description="Move high-yield bonds to IRA (currently in taxable account)",
                estimated_savings=180.00,
            ),
            AssetLocationSuggestion(
                action="Move",
                description="Move index ETFs to taxable account (currently in IRA)",
                estimated_savings=140.00,
            ),
        ],
    )


class ConcentrationRisk(BaseModel):
    type: str
    name: str
    current_pct: float
    threshold_pct: float
    severity: str
    recommendation: str


class RiskMetrics(BaseModel):
    concentration_score: float
    volatility_beta: float
    correlation_to_spy: float
    max_drawdown_12m: float


class RiskAnalysisReport(BaseModel):
    household_id: str
    overall_risk_score: int
    risk_level: str
    metrics: RiskMetrics
    concentration_risks: list[ConcentrationRisk]
    recommendations: list[str]


@router.get("/risk-report/{household_id}", response_model=RiskAnalysisReport)
async def get_risk_analysis_report(household_id: str):
    """Get extended risk analysis for dashboard display."""
    return RiskAnalysisReport(
        household_id=household_id,
        overall_risk_score=72,
        risk_level="moderate-high",
        metrics=RiskMetrics(
            concentration_score=72.0,
            volatility_beta=1.42,
            correlation_to_spy=0.89,
            max_drawdown_12m=-18.5,
        ),
        concentration_risks=[
            ConcentrationRisk(
                type="position",
                name="VXART",
                current_pct=72.0,
                threshold_pct=10.0,
                severity="critical",
                recommendation="Reduce VXART position by 80% ($51,000) and diversify",
            ),
            ConcentrationRisk(
                type="sector",
                name="Technology",
                current_pct=65.0,
                threshold_pct=25.0,
                severity="high",
                recommendation="Reduce technology exposure",
            ),
        ],
        recommendations=[
            "Reduce VXART position by 80% ($51,000) → diversify",
            "Add fixed income allocation (currently 0%) → target 30%",
            "Add international exposure (currently 0%) → target 20%",
        ],
    )
