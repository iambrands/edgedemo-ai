"""
Direct Indexing Module — Personalized index construction with continuous
tax-loss harvesting at the individual security level.
"""
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/direct-indexing", tags=["Direct Indexing"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Mock Data
# ---------------------------------------------------------------------------

SP500_SECTORS = {
    "Technology": ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AVGO", "CRM", "ADBE", "AMD", "INTC"],
    "Healthcare": ["UNH", "JNJ", "LLY", "ABBV", "MRK", "PFE", "TMO", "ABT", "DHR", "AMGN"],
    "Financials": ["BRK.B", "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "SCHW", "AXP"],
    "Consumer Disc.": ["AMZN", "TSLA", "HD", "MCD", "NKE", "LOW", "SBUX", "TJX", "BKNG", "CMG"],
    "Consumer Staples": ["PG", "KO", "PEP", "COST", "WMT", "PM", "CL", "MDLZ", "MO", "KHC"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "HAL"],
    "Industrials": ["GE", "CAT", "UNP", "HON", "RTX", "DE", "BA", "LMT", "MMM", "UPS"],
    "Real Estate": ["PLD", "AMT", "CCI", "EQIX", "SPG", "PSA", "O", "WELL", "DLR", "AVB"],
    "Utilities": ["NEE", "DUK", "SO", "D", "AEP", "SRE", "EXC", "XEL", "WEC", "ED"],
}

MOCK_INDICES = [
    {
        "id": "dix-001", "name": "S&P 500 ESG Custom",
        "benchmark": "S&P 500", "household_id": "hh-001",
        "client_name": "Williams Family",
        "status": "active", "holdings_count": 485,
        "total_value": 2450000,
        "tracking_error_bps": 12,
        "ytd_return": 11.8, "benchmark_ytd": 11.5,
        "tax_alpha_ytd": 1.2,
        "exclusions": ["Tobacco", "Firearms", "Fossil Fuel Extraction"],
        "tilts": {"Technology": 5, "Healthcare": 3},
        "harvested_losses_ytd": 34500,
        "harvest_opportunities": 8,
        "last_rebalanced": (_now - timedelta(days=3)).strftime("%Y-%m-%d"),
        "created_at": (_now - timedelta(days=365)).isoformat(),
    },
    {
        "id": "dix-002", "name": "Total Market Faith-Based",
        "benchmark": "Russell 3000", "household_id": "hh-003",
        "client_name": "Martinez Family",
        "status": "active", "holdings_count": 520,
        "total_value": 1800000,
        "tracking_error_bps": 18,
        "ytd_return": 10.4, "benchmark_ytd": 10.9,
        "tax_alpha_ytd": 0.8,
        "exclusions": ["Alcohol", "Gaming", "Adult Entertainment"],
        "tilts": {},
        "harvested_losses_ytd": 22100,
        "harvest_opportunities": 5,
        "last_rebalanced": (_now - timedelta(days=7)).strftime("%Y-%m-%d"),
        "created_at": (_now - timedelta(days=200)).isoformat(),
    },
    {
        "id": "dix-003", "name": "Large Cap Low Carbon",
        "benchmark": "S&P 500", "household_id": "hh-002",
        "client_name": "Anderson Family",
        "status": "active", "holdings_count": 450,
        "total_value": 1200000,
        "tracking_error_bps": 22,
        "ytd_return": 12.1, "benchmark_ytd": 11.5,
        "tax_alpha_ytd": 1.5,
        "exclusions": ["Coal", "Oil Sands", "Arctic Drilling"],
        "tilts": {"Technology": 8, "Utilities": -5},
        "harvested_losses_ytd": 18700,
        "harvest_opportunities": 12,
        "last_rebalanced": (_now - timedelta(days=1)).strftime("%Y-%m-%d"),
        "created_at": (_now - timedelta(days=90)).isoformat(),
    },
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/indices")
async def list_indices(current_user: dict = Depends(get_current_user)):
    total_value = sum(ix["total_value"] for ix in MOCK_INDICES)
    total_harvested = sum(ix["harvested_losses_ytd"] for ix in MOCK_INDICES)
    return {
        "indices": MOCK_INDICES,
        "total": len(MOCK_INDICES),
        "total_value": total_value,
        "total_harvested_losses_ytd": total_harvested,
        "total_harvest_opportunities": sum(ix["harvest_opportunities"] for ix in MOCK_INDICES),
    }


@router.get("/indices/{index_id}")
async def get_index(index_id: str, current_user: dict = Depends(get_current_user)):
    for ix in MOCK_INDICES:
        if ix["id"] == index_id:
            holdings = []
            for sector, symbols in SP500_SECTORS.items():
                if any(excl.lower() in sector.lower() for excl in ix.get("exclusions", [])):
                    continue
                for sym in symbols:
                    weight = round(random.uniform(0.05, 3.5), 2)
                    cost = round(random.uniform(50, 500), 2)
                    current = round(cost * random.uniform(0.8, 1.4), 2)
                    qty = round(ix["total_value"] * weight / 100 / max(current, 1), 2)
                    gl = round((current - cost) * qty, 2)
                    holdings.append({
                        "symbol": sym, "sector": sector,
                        "weight_pct": weight, "quantity": qty,
                        "cost_basis": cost, "current_price": current,
                        "gain_loss": gl,
                        "harvestable": gl < -500,
                    })
            holdings.sort(key=lambda h: h["weight_pct"], reverse=True)
            return {
                **ix,
                "holdings": holdings[:50],
                "sector_weights": {s: round(sum(h["weight_pct"] for h in holdings if h["sector"] == s), 1)
                                   for s in SP500_SECTORS},
            }
    return {"error": "Index not found"}


@router.post("/indices")
async def create_index(request: dict, current_user: dict = Depends(get_current_user)):
    ix = {
        "id": f"dix-{uuid.uuid4().hex[:6]}",
        "name": request.get("name", "Custom Index"),
        "benchmark": request.get("benchmark", "S&P 500"),
        "household_id": request.get("household_id"),
        "client_name": request.get("client_name", "—"),
        "status": "building",
        "holdings_count": 0,
        "total_value": request.get("initial_investment", 0),
        "tracking_error_bps": 0,
        "ytd_return": 0, "benchmark_ytd": 0, "tax_alpha_ytd": 0,
        "exclusions": request.get("exclusions", []),
        "tilts": request.get("tilts", {}),
        "harvested_losses_ytd": 0, "harvest_opportunities": 0,
        "last_rebalanced": None,
        "created_at": _now.isoformat(),
    }
    return ix


@router.post("/harvest/{index_id}")
async def run_harvest(index_id: str, current_user: dict = Depends(get_current_user)):
    trades = []
    for _ in range(random.randint(3, 10)):
        sell_sym = random.choice(["INTC", "BA", "MMM", "VLO", "KHC", "MO", "HAL"])
        buy_sym = random.choice(["AMD", "LMT", "UPS", "PSX", "MDLZ", "PM", "SLB"])
        loss = round(random.uniform(500, 5000), 2)
        trades.append({
            "sell_symbol": sell_sym, "buy_symbol": buy_sym,
            "loss_harvested": loss,
            "shares_sold": round(random.uniform(5, 50), 2),
            "shares_bought": round(random.uniform(5, 50), 2),
            "wash_sale_check": "clear",
        })
    total = round(sum(t["loss_harvested"] for t in trades), 2)
    return {
        "index_id": index_id,
        "trades": trades,
        "total_losses_harvested": total,
        "estimated_tax_savings": round(total * 0.35, 2),
        "status": "pending_review",
    }


@router.get("/exclusions")
async def list_exclusion_categories(current_user: dict = Depends(get_current_user)):
    return {
        "categories": [
            {"id": "tobacco", "name": "Tobacco", "companies_excluded": 5},
            {"id": "firearms", "name": "Firearms & Weapons", "companies_excluded": 8},
            {"id": "fossil_fuel", "name": "Fossil Fuel Extraction", "companies_excluded": 22},
            {"id": "coal", "name": "Coal Mining", "companies_excluded": 4},
            {"id": "oil_sands", "name": "Oil Sands", "companies_excluded": 6},
            {"id": "arctic", "name": "Arctic Drilling", "companies_excluded": 3},
            {"id": "alcohol", "name": "Alcohol", "companies_excluded": 7},
            {"id": "gaming", "name": "Gaming & Casinos", "companies_excluded": 9},
            {"id": "adult", "name": "Adult Entertainment", "companies_excluded": 2},
            {"id": "nuclear", "name": "Nuclear Power", "companies_excluded": 4},
            {"id": "private_prisons", "name": "Private Prisons", "companies_excluded": 3},
            {"id": "animal_testing", "name": "Animal Testing", "companies_excluded": 12},
        ]
    }
