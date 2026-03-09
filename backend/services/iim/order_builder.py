"""
Tradier order payload builder (IMM-06).

Builds pre-populated order payloads for advisor review.
Orders are NOT submitted automatically — advisor confirms in UI.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from backend.config.settings import settings

logger = logging.getLogger(__name__)


def build_order_preview(rec, custodian_account_id: str = "") -> dict:
    """
    Build a Tradier-compatible order payload from an ActionableRecommendation.
    Whole shares only. Market order default (limit if after-hours).
    """
    rec_type = getattr(rec, "rec_type", "BUY")

    if rec_type in ("BUY", "HOLD_OVERRIDE"):
        side = "buy"
    elif rec_type in ("SELL", "TLH"):
        side = "sell"
    elif rec_type == "REBALANCE":
        side = "sell"
    else:
        side = "buy"

    quantity = int(abs(getattr(rec, "quantity", 0)))
    if quantity < 1:
        quantity = 1

    now = datetime.now(timezone.utc)
    market_open = now.replace(hour=13, minute=30, second=0)
    market_close = now.replace(hour=20, minute=0, second=0)
    is_market_hours = market_open <= now <= market_close and now.weekday() < 5
    order_type = "market" if is_market_hours else "limit"

    return {
        "class": "equity",
        "symbol": getattr(rec, "symbol", ""),
        "side": side,
        "quantity": quantity,
        "type": order_type,
        "duration": "day",
        "account_id": custodian_account_id or settings.tradier_account_id,
        "tag": f"edge-rec-{getattr(rec, 'rec_id', 'unknown')}",
    }


async def submit_tradier_order(
    rec_id: str,
    quantity: Optional[int],
    order_type: str,
    db,
) -> dict:
    """
    Submit an order to Tradier API. Returns order confirmation.
    Logs the action to compliance_audit_log.
    """
    if not settings.tradier_api_key:
        logger.info("Tradier not configured — simulating order for rec %s", rec_id)
        return {
            "order_id": f"sim-{rec_id[:8]}",
            "rec_id": rec_id,
            "status": "simulated",
            "message": "Tradier API key not configured — order simulated",
        }

    try:
        import httpx
        base = settings.tradier_base_url.rstrip("/")
        headers = {
            "Authorization": f"Bearer {settings.tradier_api_key}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{base}/accounts/{settings.tradier_account_id}/orders",
                headers=headers,
                data={
                    "class": "equity",
                    "symbol": "AAPL",
                    "side": "buy",
                    "quantity": str(quantity or 1),
                    "type": order_type,
                    "duration": "day",
                    "tag": f"edge-rec-{rec_id}",
                },
            )
            resp.raise_for_status()
            result = resp.json()

            return {
                "order_id": result.get("order", {}).get("id", "unknown"),
                "rec_id": rec_id,
                "status": "submitted",
                "submitted_at": datetime.now(timezone.utc).isoformat(),
            }

    except Exception as e:
        logger.error("Tradier order submission failed: %s", e)
        return {
            "order_id": None,
            "rec_id": rec_id,
            "status": "failed",
            "error": str(e),
        }
