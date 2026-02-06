"""API endpoints for ETF Portfolio Builder."""

from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.data.etf_universe import ETF_UNIVERSE, PRESET_PORTFOLIOS
from backend.services.portfolio_builder_service import PortfolioBuilderService

router = APIRouter(prefix="/api/v1/portfolio-builder", tags=["Portfolio Builder"])

service = PortfolioBuilderService()


class QuestionnaireInput(BaseModel):
    """Risk questionnaire input from client."""

    client_id: UUID
    q1_investment_experience: int = Field(..., ge=1, le=5, description="1=None, 5=Expert")
    q2_risk_comfort: int = Field(..., ge=1, le=5, description="1=Very uncomfortable, 5=Very comfortable")
    q3_loss_reaction: int = Field(..., ge=1, le=5, description="1=Sell immediately, 5=Buy more")
    q4_income_stability: int = Field(..., ge=1, le=5, description="1=Unstable, 5=Very stable")
    q5_emergency_fund: int = Field(..., ge=1, le=5, description="1=None, 5=12+ months")
    q6_investment_goal: int = Field(..., ge=1, le=5, description="1=Preserve capital, 5=Maximum growth")
    q7_time_horizon_years: int = Field(..., ge=1, le=50, description="Investment time horizon in years")
    q8_withdrawal_needs: int = Field(..., ge=1, le=5, description="1=Need soon, 5=None for 10+ years")
    q9_portfolio_volatility: int = Field(..., ge=1, le=5, description="1=Minimal, 5=High acceptable")
    q10_financial_knowledge: int = Field(..., ge=1, le=5, description="1=Novice, 5=Expert")
    annual_income: Optional[Decimal] = None
    liquid_net_worth: Optional[Decimal] = None
    total_net_worth: Optional[Decimal] = None
    special_considerations: Optional[str] = None


class RiskScoreResponse(BaseModel):
    """Risk score calculation result."""

    total_score: int
    risk_tolerance: str
    recommended_equity_pct: int
    description: str


class PortfolioHoldingResponse(BaseModel):
    """Individual ETF holding in portfolio."""

    symbol: str
    name: str
    asset_class: str
    sub_class: str
    target_weight: float
    expense_ratio: float
    selection_rationale: str


class PortfolioResponse(BaseModel):
    """Complete portfolio recommendation."""

    name: str
    description: str
    risk_level: str
    equity_allocation: float
    fixed_income_allocation: float
    alternatives_allocation: float
    cash_allocation: float
    holdings: List[PortfolioHoldingResponse]
    metrics: dict


@router.get("/etf-universe")
async def get_etf_universe():
    """Get the full ETF universe available for portfolio construction."""
    return {
        "etfs": ETF_UNIVERSE,
        "count": len(ETF_UNIVERSE),
        "asset_classes": list(set(e["asset_class"] for e in ETF_UNIVERSE.values())),
    }


@router.get("/presets")
async def get_preset_portfolios():
    """Get all preset portfolio templates."""
    return {
        "presets": {
            level: {
                "name": p["name"],
                "description": p["description"],
                "equity_allocation": p["equity_allocation"],
                "fixed_income_allocation": p["fixed_income_allocation"],
                "num_holdings": len(p["holdings"]),
            }
            for level, p in PRESET_PORTFOLIOS.items()
        }
    }


@router.get("/presets/{risk_level}")
async def get_preset_portfolio(risk_level: str):
    """Get a specific preset portfolio with full holdings."""
    if risk_level not in PRESET_PORTFOLIOS:
        raise HTTPException(status_code=404, detail=f"Unknown risk level: {risk_level}")

    preset = PRESET_PORTFOLIOS[risk_level]

    enriched_holdings = []
    for h in preset["holdings"]:
        etf_info = ETF_UNIVERSE.get(h["symbol"], {})
        enriched_holdings.append({
            **h,
            "name": etf_info.get("name", h["symbol"]),
            "expense_ratio": etf_info.get("expense_ratio", 0),
            "asset_class": etf_info.get("asset_class", "unknown"),
        })

    return {
        **preset,
        "holdings": enriched_holdings,
    }


@router.post("/score-questionnaire", response_model=RiskScoreResponse)
async def score_questionnaire(input: QuestionnaireInput):
    """Score a risk questionnaire and get recommended risk level."""
    from backend.models.portfolio_models import RiskQuestionnaire

    questionnaire = RiskQuestionnaire(
        client_id=input.client_id,
        q1_investment_experience=input.q1_investment_experience,
        q2_risk_comfort=input.q2_risk_comfort,
        q3_loss_reaction=input.q3_loss_reaction,
        q4_income_stability=input.q4_income_stability,
        q5_emergency_fund=input.q5_emergency_fund,
        q6_investment_goal=input.q6_investment_goal,
        q7_time_horizon_years=input.q7_time_horizon_years,
        q8_withdrawal_needs=input.q8_withdrawal_needs,
        q9_portfolio_volatility=input.q9_portfolio_volatility,
        q10_financial_knowledge=input.q10_financial_knowledge,
    )

    scores = service.score_questionnaire(questionnaire)
    preset = PRESET_PORTFOLIOS.get(scores["risk_tolerance"], {})

    return RiskScoreResponse(
        total_score=scores["total_score"],
        risk_tolerance=scores["risk_tolerance"],
        recommended_equity_pct=scores["recommended_equity_pct"],
        description=preset.get("description", ""),
    )


@router.post("/build-portfolio", response_model=PortfolioResponse)
async def build_portfolio(
    input: QuestionnaireInput,
    esg_only: bool = False,
    exclude_sectors: Optional[str] = None,
):
    """Build a complete ETF portfolio from questionnaire responses."""
    from backend.models.portfolio_models import RiskQuestionnaire

    questionnaire = RiskQuestionnaire(
        client_id=input.client_id,
        q1_investment_experience=input.q1_investment_experience,
        q2_risk_comfort=input.q2_risk_comfort,
        q3_loss_reaction=input.q3_loss_reaction,
        q4_income_stability=input.q4_income_stability,
        q5_emergency_fund=input.q5_emergency_fund,
        q6_investment_goal=input.q6_investment_goal,
        q7_time_horizon_years=input.q7_time_horizon_years,
        q8_withdrawal_needs=input.q8_withdrawal_needs,
        q9_portfolio_volatility=input.q9_portfolio_volatility,
        q10_financial_knowledge=input.q10_financial_knowledge,
        annual_income=input.annual_income,
        liquid_net_worth=input.liquid_net_worth,
        total_net_worth=input.total_net_worth,
        special_considerations=input.special_considerations,
    )

    customize = {}
    if esg_only:
        customize["esg_only"] = True
    if exclude_sectors:
        customize["exclude_sectors"] = exclude_sectors.split(",")

    portfolio = service.build_portfolio_from_questionnaire(
        questionnaire,
        customize=customize if customize else None,
    )

    metrics = service.calculate_portfolio_metrics(portfolio)

    holdings_response = [
        PortfolioHoldingResponse(
            symbol=h.symbol,
            name=h.name,
            asset_class=h.asset_class,
            sub_class=h.sub_class or "",
            target_weight=float(h.target_weight),
            expense_ratio=float(h.expense_ratio or 0),
            selection_rationale=h.selection_rationale or "",
        )
        for h in portfolio.holdings
    ]

    return PortfolioResponse(
        name=portfolio.name,
        description=portfolio.description or "",
        risk_level=portfolio.risk_level,
        equity_allocation=float(portfolio.equity_allocation),
        fixed_income_allocation=float(portfolio.fixed_income_allocation),
        alternatives_allocation=float(portfolio.alternatives_allocation or 0),
        cash_allocation=float(portfolio.cash_allocation or 0),
        holdings=holdings_response,
        metrics=metrics,
    )
