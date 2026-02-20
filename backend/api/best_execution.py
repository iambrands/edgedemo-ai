"""
Best Execution Monitoring API.
Trade execution quality analysis with NBBO comparison and broker benchmarking.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/best-execution", tags=["Best Execution"])


MOCK_SUMMARY = {
    "avg_price_improvement_bps": 2.4,
    "execution_quality_score": 94.7,
    "trades_reviewed": 1247,
    "period": "Q4 2025",
    "nbbo_match_rate": 0.967,
    "avg_fill_latency_ms": 12,
    "compliance_attestation_due": (datetime.utcnow() + timedelta(days=15)).strftime("%Y-%m-%d"),
    "last_attestation": (datetime.utcnow() - timedelta(days=75)).strftime("%Y-%m-%d"),
}

MOCK_TRADES = [
    {"id": "exec-1", "date": "2025-12-18", "ticker": "AAPL", "side": "BUY", "qty": 150, "order_price": 198.50, "fill_price": 198.42, "nbbo_mid": 198.46, "improvement_bps": 2.0, "latency_ms": 8, "broker": "Schwab", "venue": "NYSE"},
    {"id": "exec-2", "date": "2025-12-18", "ticker": "MSFT", "side": "BUY", "qty": 75, "order_price": 415.20, "fill_price": 415.08, "nbbo_mid": 415.14, "improvement_bps": 1.4, "latency_ms": 11, "broker": "Schwab", "venue": "NASDAQ"},
    {"id": "exec-3", "date": "2025-12-17", "ticker": "GOOGL", "side": "SELL", "qty": 200, "order_price": 175.30, "fill_price": 175.38, "nbbo_mid": 175.34, "improvement_bps": 2.3, "latency_ms": 9, "broker": "Fidelity", "venue": "NASDAQ"},
    {"id": "exec-4", "date": "2025-12-17", "ticker": "JNJ", "side": "BUY", "qty": 300, "order_price": 158.40, "fill_price": 158.35, "nbbo_mid": 158.38, "improvement_bps": 1.9, "latency_ms": 14, "broker": "Schwab", "venue": "NYSE"},
    {"id": "exec-5", "date": "2025-12-16", "ticker": "V", "side": "SELL", "qty": 100, "order_price": 285.60, "fill_price": 285.72, "nbbo_mid": 285.65, "improvement_bps": 2.5, "latency_ms": 7, "broker": "Pershing", "venue": "NYSE"},
    {"id": "exec-6", "date": "2025-12-16", "ticker": "UNH", "side": "BUY", "qty": 50, "order_price": 520.30, "fill_price": 520.15, "nbbo_mid": 520.22, "improvement_bps": 1.3, "latency_ms": 18, "broker": "Fidelity", "venue": "NYSE"},
    {"id": "exec-7", "date": "2025-12-15", "ticker": "HD", "side": "SELL", "qty": 80, "order_price": 352.40, "fill_price": 352.58, "nbbo_mid": 352.48, "improvement_bps": 2.8, "latency_ms": 10, "broker": "Schwab", "venue": "NYSE"},
    {"id": "exec-8", "date": "2025-12-15", "ticker": "PG", "side": "BUY", "qty": 200, "order_price": 165.80, "fill_price": 165.72, "nbbo_mid": 165.76, "improvement_bps": 2.4, "latency_ms": 12, "broker": "Pershing", "venue": "NYSE"},
    {"id": "exec-9", "date": "2025-12-14", "ticker": "CVX", "side": "SELL", "qty": 250, "order_price": 152.80, "fill_price": 152.92, "nbbo_mid": 152.85, "improvement_bps": 4.6, "latency_ms": 6, "broker": "Fidelity", "venue": "NYSE"},
    {"id": "exec-10", "date": "2025-12-14", "ticker": "COST", "side": "BUY", "qty": 25, "order_price": 875.20, "fill_price": 874.95, "nbbo_mid": 875.08, "improvement_bps": 1.5, "latency_ms": 15, "broker": "Schwab", "venue": "NASDAQ"},
]

MOCK_BROKER_COMPARISON = [
    {"broker": "Charles Schwab", "trades": 523, "avg_improvement_bps": 2.1, "avg_latency_ms": 11, "nbbo_match_rate": 0.971, "score": 95.2},
    {"broker": "Fidelity", "trades": 389, "avg_improvement_bps": 2.8, "avg_latency_ms": 10, "nbbo_match_rate": 0.978, "score": 96.8},
    {"broker": "Pershing", "trades": 218, "avg_improvement_bps": 2.5, "avg_latency_ms": 13, "nbbo_match_rate": 0.958, "score": 93.5},
    {"broker": "Interactive Brokers", "trades": 117, "avg_improvement_bps": 3.1, "avg_latency_ms": 8, "nbbo_match_rate": 0.982, "score": 97.4},
]


@router.get("/summary")
async def get_execution_summary():
    """Get execution quality summary metrics."""
    return MOCK_SUMMARY


@router.get("/trades")
async def get_execution_trades(limit: int = 50, broker: Optional[str] = None):
    """Get trade-level execution details with NBBO comparison."""
    trades = MOCK_TRADES
    if broker:
        trades = [t for t in trades if t["broker"].lower() == broker.lower()]
    return {"trades": trades[:limit], "total": len(trades)}


@router.get("/broker-comparison")
async def get_broker_comparison():
    """Get broker-level aggregated execution quality stats."""
    return {"brokers": MOCK_BROKER_COMPARISON}
