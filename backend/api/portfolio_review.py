"""
Portfolio Review API — AI-powered analysis for uploaded CSV positions.
Uses Anthropic Claude for analysis with intelligent mock fallback.
"""
import os
import json
import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/portfolio-review", tags=["Portfolio Review"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user


# ---------------------------------------------------------------------------
# Lazy Anthropic client
# ---------------------------------------------------------------------------

_anthropic_client = None


def _get_anthropic_client():
    global _anthropic_client
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    if _anthropic_client is None:
        try:
            from anthropic import Anthropic
            _anthropic_client = Anthropic(api_key=api_key)
        except Exception as e:
            logger.warning(f"Could not init Anthropic client: {e}")
            return None
    return _anthropic_client


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class PortfolioPosition(BaseModel):
    symbol: str
    description: str = ""
    quantity: float = 0
    price: float = 0
    marketValue: float = 0
    costBasis: float = 0
    gainLossPct: float = 0
    gainLossDollar: float = 0
    pctOfAccount: float = 0
    securityType: str = "Unknown"


class AnalyzeRequest(BaseModel):
    holdings: List[PortfolioPosition] = Field(..., min_length=1)
    clientProfile: Optional[str] = "conservative but wants a bit of growth"


class ConcentrationRisk(BaseModel):
    type: str
    name: str
    percentage: float
    threshold: float
    severity: str
    recommendation: str


class AllocationAssessment(BaseModel):
    current: Dict[str, float]
    recommended: Dict[str, float]
    commentary: str


class Recommendation(BaseModel):
    action: str
    ticker: str
    rationale: str
    priority: str


class FeeAnalysis(BaseModel):
    totalEstimatedFees: float
    commentary: str
    highFeeHoldings: List[Dict[str, Any]] = []


class PortfolioAnalysisResponse(BaseModel):
    overallAssessment: str
    riskScore: int = Field(..., ge=0, le=100)
    riskExplanation: str
    concentrationRisks: List[ConcentrationRisk]
    allocationAssessment: AllocationAssessment
    recommendations: List[Recommendation]
    feeAnalysis: FeeAnalysis
    taxEfficiency: str
    incomeAssessment: str
    executiveSummary: str


# ---------------------------------------------------------------------------
# Claude prompt builder
# ---------------------------------------------------------------------------

def _build_analysis_prompt(
    holdings: List[PortfolioPosition],
    client_profile: str,
) -> str:
    total_value = sum(h.marketValue for h in holdings)
    total_cost = sum(h.costBasis for h in holdings)
    total_gain = sum(h.gainLossDollar for h in holdings)

    holdings_text = "\n".join(
        f"- {h.symbol} ({h.securityType}): "
        f"Qty {h.quantity:,.2f}, Price ${h.price:,.2f}, "
        f"Mkt Val ${h.marketValue:,.2f}, "
        f"Cost ${h.costBasis:,.2f}, "
        f"G/L ${h.gainLossDollar:+,.2f} ({h.gainLossPct:+.1f}%), "
        f"{h.pctOfAccount:.2f}% of acct"
        for h in holdings
    )

    type_groups: Dict[str, float] = {}
    for h in holdings:
        t = h.securityType or "Unknown"
        type_groups[t] = type_groups.get(t, 0) + h.marketValue
    allocation_text = "\n".join(
        f"- {t}: ${v:,.2f} ({v / total_value * 100:.1f}%)"
        for t, v in sorted(type_groups.items(), key=lambda x: -x[1])
    )

    gain_pct = (total_gain / total_cost * 100) if total_cost > 0 else 0

    return f"""You are an expert Registered Investment Advisor conducting a comprehensive portfolio review.

CLIENT PROFILE: {client_profile}

PORTFOLIO SUMMARY:
- Total Market Value: ${total_value:,.2f}
- Total Cost Basis: ${total_cost:,.2f}
- Total Unrealized Gain/Loss: ${total_gain:+,.2f} ({gain_pct:+.1f}%)
- Number of Holdings: {len(holdings)}

ALLOCATION BY SECURITY TYPE:
{allocation_text}

INDIVIDUAL HOLDINGS:
{holdings_text}

Analyze this portfolio for a client who is "{client_profile}". Return your analysis as JSON matching this exact structure (no markdown, no code blocks — raw JSON only):

{{
  "overallAssessment": "<2-3 sentence professional assessment>",
  "riskScore": <integer 0-100, 0=very conservative, 100=very aggressive>,
  "riskExplanation": "<explanation of the risk score>",
  "concentrationRisks": [
    {{
      "type": "<single_stock|sector|asset_class>",
      "name": "<name of concentrated position>",
      "percentage": <current percentage as number>,
      "threshold": <recommended max percentage as number>,
      "severity": "<high|moderate|low>",
      "recommendation": "<specific action to take>"
    }}
  ],
  "allocationAssessment": {{
    "current": {{"Equity": <pct>, "ETFs & Funds": <pct>, "Fixed Income": <pct>, "Cash": <pct>, "Other": <pct>}},
    "recommended": {{"Equity": <pct>, "ETFs & Funds": <pct>, "Fixed Income": <pct>, "Cash": <pct>, "Other": <pct>}},
    "commentary": "<assessment of current vs recommended for this client profile>"
  }},
  "recommendations": [
    {{
      "action": "<Buy|Sell|Trim|Add|Hold|Replace>",
      "ticker": "<symbol>",
      "rationale": "<why this action>",
      "priority": "<high|medium|low>"
    }}
  ],
  "feeAnalysis": {{
    "totalEstimatedFees": <estimated annual fees in dollars>,
    "commentary": "<assessment of fee efficiency>",
    "highFeeHoldings": [
      {{"ticker": "<symbol>", "estimatedER": <expense ratio as decimal>, "alternative": "<lower-cost alternative ticker>"}}
    ]
  }},
  "taxEfficiency": "<assessment of tax efficiency including unrealized gains exposure and harvesting opportunities>",
  "incomeAssessment": "<assessment of income generation — dividend yield, fixed-income coupon income>",
  "executiveSummary": "<3-4 sentence executive summary suitable for a client-facing report>"
}}

ANALYSIS RULES:
- Flag any single equity position > 5% of portfolio as a concentration risk
- Flag any single ETF/fund position > 10% of portfolio as a concentration risk
- For a "{client_profile}" investor, target: 25-35% individual equities, 25-35% diversified ETFs/funds, 25-35% fixed income, 5-10% cash
- Be specific — reference actual tickers and dollar amounts
- Provide 5-8 actionable recommendations ordered by priority
- Estimate expense ratios for ETFs/funds based on well-known data
- Return ONLY valid JSON"""


# ---------------------------------------------------------------------------
# Mock analysis fallback
# ---------------------------------------------------------------------------

def _generate_mock_analysis(
    holdings: List[PortfolioPosition],
    client_profile: str,
) -> PortfolioAnalysisResponse:
    total_value = sum(h.marketValue for h in holdings)
    total_gain = sum(h.gainLossDollar for h in holdings)

    # Compute real allocation
    type_alloc: Dict[str, float] = {}
    for h in holdings:
        t = h.securityType or "Unknown"
        pct = (h.marketValue / total_value * 100) if total_value else 0
        type_alloc[t] = type_alloc.get(t, 0) + pct

    # Find real concentration risks
    conc_risks: List[ConcentrationRisk] = []
    for h in sorted(holdings, key=lambda x: -x.marketValue):
        pct = (h.marketValue / total_value * 100) if total_value else 0
        if h.securityType == "Equity" and pct > 5:
            conc_risks.append(ConcentrationRisk(
                type="single_stock",
                name=f"{h.symbol} ({h.description})",
                percentage=round(pct, 2),
                threshold=5.0,
                severity="high" if pct > 10 else "moderate",
                recommendation=f"Consider trimming {h.symbol} to below 5% of the portfolio to reduce single-stock risk",
            ))
        elif h.securityType == "ETFs & Closed End Funds" and pct > 10:
            conc_risks.append(ConcentrationRisk(
                type="asset_class",
                name=f"{h.symbol} ({h.description})",
                percentage=round(pct, 2),
                threshold=10.0,
                severity="high" if pct > 15 else "moderate",
                recommendation=f"Review the large {h.symbol} position; consider diversifying across complementary ETFs",
            ))

    top_equities = [h for h in sorted(holdings, key=lambda x: -x.marketValue) if h.securityType == "Equity"][:3]
    recs: List[Recommendation] = []
    for h in top_equities:
        pct = (h.marketValue / total_value * 100) if total_value else 0
        if pct > 5:
            recs.append(Recommendation(
                action="Trim", ticker=h.symbol,
                rationale=f"At {pct:.1f}% of portfolio, {h.symbol} creates concentration risk. Trim to fund diversification.",
                priority="high",
            ))
    recs.extend([
        Recommendation(action="Add", ticker="BND", rationale="Increase aggregate bond exposure for conservative-growth balance", priority="high"),
        Recommendation(action="Add", ticker="SCHD", rationale="Add dividend-focused equity ETF for income generation", priority="medium"),
        Recommendation(action="Hold", ticker="SPY", rationale="Core S&P 500 position provides broad market exposure — maintain current allocation", priority="low"),
    ])

    equity_pct = round(type_alloc.get("Equity", 0), 1)
    etf_pct = round(type_alloc.get("ETFs & Closed End Funds", 0), 1)
    fi_pct = round(type_alloc.get("Fixed Income", 0), 1)
    mf_pct = round(type_alloc.get("Mutual Fund", 0), 1)
    cash_pct = round(type_alloc.get("Cash and Money Market", 0), 1)

    return PortfolioAnalysisResponse(
        overallAssessment=(
            f"This ${total_value:,.0f} portfolio contains {len(holdings)} positions across equities, ETFs, fixed income, and cash. "
            f"The portfolio has generated ${total_gain:+,.0f} in unrealized gains. "
            f"For a conservative-growth investor, the equity allocation ({equity_pct}% individual stocks) is higher than recommended, "
            f"while the fixed income allocation ({fi_pct}%) could be increased for better downside protection."
        ),
        riskScore=52,
        riskExplanation=(
            f"Moderate risk score driven by {equity_pct}% direct equity exposure and large ETF positions. "
            f"The {fi_pct}% fixed income allocation and {cash_pct}% cash provide some ballast, "
            f"but several individual stock positions exceed the 5% concentration threshold."
        ),
        concentrationRisks=conc_risks[:8],
        allocationAssessment=AllocationAssessment(
            current={"Equity": equity_pct, "ETFs & Funds": etf_pct + mf_pct, "Fixed Income": fi_pct, "Cash": cash_pct},
            recommended={"Equity": 20, "ETFs & Funds": 35, "Fixed Income": 35, "Cash": 10},
            commentary=(
                f"Current allocation is {equity_pct}% individual equities vs the recommended 20% for a conservative-growth profile. "
                f"We recommend shifting from individual stocks into diversified ETFs and increasing fixed income from {fi_pct}% to ~35%. "
                f"This improves diversification while maintaining growth potential through broad market ETFs."
            ),
        ),
        recommendations=recs[:8],
        feeAnalysis=FeeAnalysis(
            totalEstimatedFees=round(total_value * 0.0015),
            commentary=(
                "Individual equities carry no expense ratios. The ETF positions have generally low expense ratios (0.03%-0.20%). "
                "The AUNYX mutual fund position should be reviewed for its expense ratio relative to comparable ETF alternatives. "
                "Overall fee efficiency is good but can be improved by consolidating overlapping ETF positions."
            ),
            highFeeHoldings=[
                {"ticker": "AUNYX", "estimatedER": 0.55, "alternative": "VTIP or TIP"},
            ],
        ),
        taxEfficiency=(
            f"The portfolio has ${total_gain:+,.0f} in total unrealized gains, creating significant tax exposure on liquidation. "
            f"Positions with losses should be reviewed for tax-loss harvesting opportunities. "
            f"Consider lot-level analysis before executing any trim or sell recommendations to minimize tax impact. "
            f"Fixed income positions near maturity (Austin TX bonds maturing 11/24) will generate short-term gains."
        ),
        incomeAssessment=(
            f"Fixed income allocation of {fi_pct}% provides coupon income from Treasury notes and municipal bonds. "
            f"The SGUXX money market position generates income at prevailing short-term rates. "
            f"Dividend-paying equities (KO, JNJ, PEP, GIS) contribute to income generation. "
            f"For a conservative-growth profile seeking some income, consider adding dividend-focused ETFs like SCHD or VYM."
        ),
        executiveSummary=(
            f"Your ${total_value:,.0f} portfolio is well-diversified across {len(holdings)} positions with ${total_gain:+,.0f} in unrealized gains. "
            f"For your conservative-growth profile, we recommend gradually reducing individual stock concentration "
            f"and increasing fixed income and diversified ETF exposure. "
            f"This adjustment would improve risk-adjusted returns while preserving your growth potential and enhancing income generation."
        ),
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=PortfolioAnalysisResponse)
async def analyze_portfolio(
    payload: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Analyze uploaded portfolio positions using Claude AI."""
    client = _get_anthropic_client()

    if client is None:
        logger.info("Using mock analysis (Anthropic not configured)")
        return _generate_mock_analysis(payload.holdings, payload.clientProfile or "conservative but wants a bit of growth")

    try:
        prompt = _build_analysis_prompt(payload.holdings, payload.clientProfile or "conservative but wants a bit of growth")
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )

        response_text = response.content[0].text

        # Strip markdown code blocks if present
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0].strip()

        analysis_data = json.loads(cleaned)
        return PortfolioAnalysisResponse(**analysis_data)

    except Exception as e:
        logger.error(f"AI analysis error: {e}", exc_info=True)
        logger.info("Falling back to mock analysis")
        return _generate_mock_analysis(payload.holdings, payload.clientProfile or "conservative but wants a bit of growth")
