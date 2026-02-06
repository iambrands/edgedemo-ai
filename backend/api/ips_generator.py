"""API endpoints for IPS Generator."""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.data.etf_universe import PRESET_PORTFOLIOS
from backend.services.ips_generator_service import IPSGeneratorService
from backend.services.portfolio_builder_service import PortfolioBuilderService

router = APIRouter(prefix="/api/v1/ips", tags=["IPS Generator"])

ips_service = IPSGeneratorService()
portfolio_service = PortfolioBuilderService()


class IPSGenerationRequest(BaseModel):
    """Request to generate an IPS."""

    client_id: UUID
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    annual_income: Optional[float] = None
    liquid_net_worth: Optional[float] = None
    total_net_worth: Optional[float] = None
    q1_investment_experience: int
    q2_risk_comfort: int
    q3_loss_reaction: int
    q4_income_stability: int
    q5_emergency_fund: int
    q6_investment_goal: int
    q7_time_horizon_years: int
    q8_withdrawal_needs: int
    q9_portfolio_volatility: int
    q10_financial_knowledge: int
    special_considerations: Optional[str] = None
    advisor_name: Optional[str] = None
    firm_name: str = "IAB Advisors"
    esg_only: bool = False


class IPSResponse(BaseModel):
    """Generated IPS content."""

    client_id: UUID
    effective_date: date
    review_date: date
    risk_level: str
    executive_summary: str
    client_profile: dict
    investment_objectives: dict
    risk_tolerance: dict
    time_horizon: dict
    asset_allocation: dict
    investment_guidelines: dict
    rebalancing_policy: dict
    monitoring: dict
    fiduciary_acknowledgment: dict


@router.post("/generate", response_model=IPSResponse)
async def generate_ips(request: IPSGenerationRequest):
    """Generate a complete Investment Policy Statement."""
    from backend.models.portfolio_models import RiskQuestionnaire

    class MockClient:
        def __init__(self, req: IPSGenerationRequest):
            self.id = req.client_id
            self.first_name = req.first_name
            self.last_name = req.last_name
            self.date_of_birth = req.date_of_birth
            self.annual_income = Decimal(str(req.annual_income)) if req.annual_income else None
            self.liquid_net_worth = Decimal(str(req.liquid_net_worth)) if req.liquid_net_worth else None
            self.total_net_worth = Decimal(str(req.total_net_worth)) if req.total_net_worth else None

    client = MockClient(request)

    questionnaire = RiskQuestionnaire(
        client_id=request.client_id,
        q1_investment_experience=request.q1_investment_experience,
        q2_risk_comfort=request.q2_risk_comfort,
        q3_loss_reaction=request.q3_loss_reaction,
        q4_income_stability=request.q4_income_stability,
        q5_emergency_fund=request.q5_emergency_fund,
        q6_investment_goal=request.q6_investment_goal,
        q7_time_horizon_years=request.q7_time_horizon_years,
        q8_withdrawal_needs=request.q8_withdrawal_needs,
        q9_portfolio_volatility=request.q9_portfolio_volatility,
        q10_financial_knowledge=request.q10_financial_knowledge,
        special_considerations=request.special_considerations,
    )

    scores = portfolio_service.score_questionnaire(questionnaire)
    questionnaire.total_score = scores["total_score"]
    questionnaire.risk_tolerance = scores["risk_tolerance"]
    questionnaire.recommended_equity_pct = scores["recommended_equity_pct"]

    customize = {"esg_only": True} if request.esg_only else None
    portfolio = portfolio_service.build_portfolio_from_questionnaire(
        questionnaire, customize=customize
    )

    ips = ips_service.generate_ips(
        client=client,
        questionnaire=questionnaire,
        portfolio=portfolio,
        advisor_name=request.advisor_name,
        firm_name=request.firm_name,
    )

    return IPSResponse(
        client_id=request.client_id,
        effective_date=ips.effective_date,
        review_date=ips.review_date,
        risk_level=portfolio.risk_level,
        executive_summary=ips.executive_summary,
        client_profile=ips.client_profile_section,
        investment_objectives=ips.investment_objectives_section,
        risk_tolerance=ips.risk_tolerance_section,
        time_horizon=ips.time_horizon_section,
        asset_allocation=ips.asset_allocation_section,
        investment_guidelines=ips.investment_guidelines_section,
        rebalancing_policy=ips.rebalancing_policy_section,
        monitoring=ips.monitoring_section,
        fiduciary_acknowledgment=ips.fiduciary_acknowledgment_section,
    )


@router.get("/template/{risk_level}")
async def get_ips_template(risk_level: str):
    """Get an IPS template for a given risk level."""
    if risk_level not in PRESET_PORTFOLIOS:
        raise HTTPException(status_code=404, detail=f"Unknown risk level: {risk_level}")

    preset = PRESET_PORTFOLIOS[risk_level]

    return {
        "risk_level": risk_level,
        "portfolio_name": preset["name"],
        "description": preset["description"],
        "target_allocation": {
            "equity": preset["equity_allocation"],
            "fixed_income": preset["fixed_income_allocation"],
            "alternatives": preset.get("alternatives_allocation", 0),
            "cash": preset.get("cash_allocation", 0),
        },
        "template_sections": [
            "Executive Summary",
            "Client Profile",
            "Investment Objectives",
            "Risk Tolerance Assessment",
            "Time Horizon Analysis",
            "Asset Allocation Strategy",
            "Investment Guidelines",
            "Rebalancing Policy",
            "Monitoring & Reporting",
            "Fiduciary Acknowledgment",
        ],
    }
