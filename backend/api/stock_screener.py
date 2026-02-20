"""
AI-powered stock screener with fundamental analysis filters.
Allows advisors to screen stocks based on key financial metrics.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

router = APIRouter(prefix="/api/v1/screener", tags=["Stock Screener"])


class MarketCapRange(str, Enum):
    MICRO = "micro"
    SMALL = "small"
    MID = "mid"
    LARGE = "large"
    MEGA = "mega"


class ScreenerCriteria(BaseModel):
    market_cap_min: Optional[float] = Field(None, description="Minimum market cap in billions")
    market_cap_max: Optional[float] = Field(None, description="Maximum market cap in billions")
    market_cap_range: Optional[MarketCapRange] = None
    pe_ratio_min: Optional[float] = Field(None, description="Minimum P/E ratio")
    pe_ratio_max: Optional[float] = Field(None, description="Maximum P/E ratio")
    peg_ratio_min: Optional[float] = Field(None, description="Minimum PEG ratio")
    peg_ratio_max: Optional[float] = Field(None, description="Maximum PEG ratio")
    earnings_growth_min: Optional[float] = Field(None, description="Minimum earnings growth % (YoY)")
    revenue_growth_min: Optional[float] = Field(None, description="Minimum revenue growth % (YoY)")
    debt_to_equity_max: Optional[float] = Field(None, description="Maximum debt-to-equity ratio")
    current_ratio_min: Optional[float] = Field(None, description="Minimum current ratio (liquidity)")
    quick_ratio_min: Optional[float] = Field(None, description="Minimum quick ratio")
    free_cash_flow_positive: Optional[bool] = Field(None, description="Require positive FCF")
    fcf_yield_min: Optional[float] = Field(None, description="Minimum FCF yield %")
    dividend_yield_min: Optional[float] = Field(None, description="Minimum dividend yield %")
    dividend_yield_max: Optional[float] = Field(None, description="Maximum dividend yield %")
    sectors: Optional[List[str]] = Field(None, description="Filter by sectors")
    industries: Optional[List[str]] = Field(None, description="Filter by industries")
    sort_by: Optional[str] = Field("market_cap", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="asc or desc")
    limit: Optional[int] = Field(50, description="Max results")


class ScreenerResult(BaseModel):
    ticker: str
    name: str
    sector: str
    industry: str
    market_cap: float
    pe_ratio: Optional[float]
    peg_ratio: Optional[float]
    earnings_growth: Optional[float]
    revenue_growth: Optional[float]
    debt_to_equity: Optional[float]
    current_ratio: Optional[float]
    free_cash_flow: Optional[float]
    fcf_yield: Optional[float]
    dividend_yield: Optional[float]
    price: float
    change_percent: float


class ScreenerResponse(BaseModel):
    results: List[ScreenerResult]
    total_matches: int
    criteria_summary: str


MOCK_STOCKS = [
    {"ticker": "AAPL", "name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics", "market_cap": 3200, "pe_ratio": 28.5, "peg_ratio": 2.1, "earnings_growth": 12.5, "revenue_growth": 8.2, "debt_to_equity": 1.8, "current_ratio": 1.0, "free_cash_flow": 110.5, "fcf_yield": 3.4, "dividend_yield": 0.5, "price": 198.50, "change_percent": 1.2},
    {"ticker": "MSFT", "name": "Microsoft Corp.", "sector": "Technology", "industry": "Software", "market_cap": 3100, "pe_ratio": 35.2, "peg_ratio": 2.4, "earnings_growth": 15.8, "revenue_growth": 12.1, "debt_to_equity": 0.4, "current_ratio": 1.8, "free_cash_flow": 72.3, "fcf_yield": 2.3, "dividend_yield": 0.8, "price": 415.20, "change_percent": 0.8},
    {"ticker": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology", "industry": "Internet Services", "market_cap": 2100, "pe_ratio": 24.1, "peg_ratio": 1.5, "earnings_growth": 22.3, "revenue_growth": 14.5, "debt_to_equity": 0.1, "current_ratio": 2.9, "free_cash_flow": 78.9, "fcf_yield": 3.8, "dividend_yield": 0.0, "price": 175.30, "change_percent": -0.3},
    {"ticker": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Pharmaceuticals", "market_cap": 380, "pe_ratio": 15.2, "peg_ratio": 2.8, "earnings_growth": 5.2, "revenue_growth": 3.8, "debt_to_equity": 0.5, "current_ratio": 1.2, "free_cash_flow": 18.5, "fcf_yield": 4.9, "dividend_yield": 3.1, "price": 158.40, "change_percent": 0.2},
    {"ticker": "PG", "name": "Procter & Gamble", "sector": "Consumer Staples", "industry": "Household Products", "market_cap": 390, "pe_ratio": 26.8, "peg_ratio": 3.5, "earnings_growth": 7.1, "revenue_growth": 4.2, "debt_to_equity": 0.7, "current_ratio": 0.8, "free_cash_flow": 15.2, "fcf_yield": 3.9, "dividend_yield": 2.4, "price": 165.80, "change_percent": 0.5},
    {"ticker": "V", "name": "Visa Inc.", "sector": "Financials", "industry": "Payment Processing", "market_cap": 580, "pe_ratio": 31.5, "peg_ratio": 1.9, "earnings_growth": 16.2, "revenue_growth": 11.8, "debt_to_equity": 0.6, "current_ratio": 1.5, "free_cash_flow": 19.8, "fcf_yield": 3.4, "dividend_yield": 0.8, "price": 285.60, "change_percent": 1.1},
    {"ticker": "UNH", "name": "UnitedHealth Group", "sector": "Healthcare", "industry": "Health Insurance", "market_cap": 480, "pe_ratio": 21.2, "peg_ratio": 1.4, "earnings_growth": 14.5, "revenue_growth": 12.8, "debt_to_equity": 0.8, "current_ratio": 0.9, "free_cash_flow": 22.1, "fcf_yield": 4.6, "dividend_yield": 1.4, "price": 520.30, "change_percent": -0.6},
    {"ticker": "HD", "name": "Home Depot", "sector": "Consumer Discretionary", "industry": "Home Improvement", "market_cap": 350, "pe_ratio": 22.8, "peg_ratio": 2.2, "earnings_growth": 8.9, "revenue_growth": 5.5, "debt_to_equity": 42.5, "current_ratio": 1.3, "free_cash_flow": 14.2, "fcf_yield": 4.1, "dividend_yield": 2.5, "price": 352.40, "change_percent": 0.9},
    {"ticker": "CVX", "name": "Chevron Corp.", "sector": "Energy", "industry": "Oil & Gas", "market_cap": 280, "pe_ratio": 12.5, "peg_ratio": 1.8, "earnings_growth": -8.2, "revenue_growth": -5.1, "debt_to_equity": 0.2, "current_ratio": 1.4, "free_cash_flow": 21.5, "fcf_yield": 7.7, "dividend_yield": 4.2, "price": 152.80, "change_percent": -1.2},
    {"ticker": "COST", "name": "Costco Wholesale", "sector": "Consumer Staples", "industry": "Retail", "market_cap": 390, "pe_ratio": 52.1, "peg_ratio": 4.2, "earnings_growth": 12.4, "revenue_growth": 9.8, "debt_to_equity": 0.4, "current_ratio": 1.0, "free_cash_flow": 6.8, "fcf_yield": 1.7, "dividend_yield": 0.5, "price": 875.20, "change_percent": 0.4},
]


@router.post("/screen", response_model=ScreenerResponse)
async def screen_stocks(criteria: ScreenerCriteria):
    """Screen stocks based on fundamental criteria."""
    results = []
    for stock in MOCK_STOCKS:
        if criteria.market_cap_min and stock["market_cap"] < criteria.market_cap_min:
            continue
        if criteria.market_cap_max and stock["market_cap"] > criteria.market_cap_max:
            continue
        if criteria.pe_ratio_min and (stock["pe_ratio"] is None or stock["pe_ratio"] < criteria.pe_ratio_min):
            continue
        if criteria.pe_ratio_max and (stock["pe_ratio"] is None or stock["pe_ratio"] > criteria.pe_ratio_max):
            continue
        if criteria.peg_ratio_max and (stock["peg_ratio"] is None or stock["peg_ratio"] > criteria.peg_ratio_max):
            continue
        if criteria.earnings_growth_min and (stock["earnings_growth"] is None or stock["earnings_growth"] < criteria.earnings_growth_min):
            continue
        if criteria.revenue_growth_min and (stock["revenue_growth"] is None or stock["revenue_growth"] < criteria.revenue_growth_min):
            continue
        if criteria.debt_to_equity_max and (stock["debt_to_equity"] is None or stock["debt_to_equity"] > criteria.debt_to_equity_max):
            continue
        if criteria.current_ratio_min and (stock["current_ratio"] is None or stock["current_ratio"] < criteria.current_ratio_min):
            continue
        if criteria.free_cash_flow_positive and (stock["free_cash_flow"] is None or stock["free_cash_flow"] <= 0):
            continue
        if criteria.dividend_yield_min and (stock["dividend_yield"] is None or stock["dividend_yield"] < criteria.dividend_yield_min):
            continue
        if criteria.sectors and stock["sector"] not in criteria.sectors:
            continue
        results.append(ScreenerResult(**stock))

    reverse = criteria.sort_order == "desc"
    results.sort(key=lambda x: getattr(x, criteria.sort_by or "market_cap") or 0, reverse=reverse)
    results = results[: criteria.limit]

    summary_parts = []
    if criteria.pe_ratio_max:
        summary_parts.append(f"P/E < {criteria.pe_ratio_max}")
    if criteria.peg_ratio_max:
        summary_parts.append(f"PEG < {criteria.peg_ratio_max}")
    if criteria.earnings_growth_min:
        summary_parts.append(f"Earnings Growth > {criteria.earnings_growth_min}%")
    if criteria.debt_to_equity_max:
        summary_parts.append(f"D/E < {criteria.debt_to_equity_max}")
    if criteria.dividend_yield_min:
        summary_parts.append(f"Div Yield > {criteria.dividend_yield_min}%")
    criteria_summary = ", ".join(summary_parts) if summary_parts else "No filters applied"

    return ScreenerResponse(
        results=results,
        total_matches=len(results),
        criteria_summary=criteria_summary,
    )


@router.get("/sectors")
async def get_sectors():
    """Get list of available sectors for filtering."""
    return {
        "sectors": [
            "Technology", "Healthcare", "Financials",
            "Consumer Discretionary", "Consumer Staples", "Energy",
            "Industrials", "Materials", "Real Estate",
            "Utilities", "Communication Services",
        ]
    }


@router.get("/presets")
async def get_screener_presets():
    """Get pre-built screener strategies."""
    return {
        "presets": [
            {
                "id": "value", "name": "Value Stocks",
                "description": "Low P/E, low PEG, positive cash flow",
                "criteria": {"pe_ratio_max": 20, "peg_ratio_max": 1.5, "free_cash_flow_positive": True},
            },
            {
                "id": "growth", "name": "Growth Stocks",
                "description": "High earnings and revenue growth",
                "criteria": {"earnings_growth_min": 15, "revenue_growth_min": 10},
            },
            {
                "id": "dividend", "name": "Dividend Income",
                "description": "High yield with sustainable payout",
                "criteria": {"dividend_yield_min": 2.5, "debt_to_equity_max": 2.0, "free_cash_flow_positive": True},
            },
            {
                "id": "quality", "name": "Quality Companies",
                "description": "Strong balance sheet, consistent growth",
                "criteria": {"debt_to_equity_max": 1.0, "current_ratio_min": 1.5, "earnings_growth_min": 5, "free_cash_flow_positive": True},
            },
            {
                "id": "garp", "name": "GARP (Growth at Reasonable Price)",
                "description": "Growth stocks with reasonable valuations",
                "criteria": {"peg_ratio_max": 2.0, "earnings_growth_min": 10, "pe_ratio_max": 30},
            },
        ]
    }
