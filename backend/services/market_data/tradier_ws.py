"""
Tradier WebSocket streaming service.
Connects to wss://stream.tradier.com/v1/markets/events and publishes
quote events to Redis. Auto-reconnects with exponential backoff.
"""

import asyncio
import json
import logging
from typing import List, Optional

from backend.config.settings import settings
from backend.services.redis_client import get_redis

logger = logging.getLogger(__name__)

TRADIER_WS_URL = "wss://stream.tradier.com/v1/markets/events"
MAX_RETRIES = 5
MAX_BACKOFF = 60


async def tradier_ws_listener(symbols: List[str]) -> None:
    """Long-lived WebSocket listener. Register as asyncio.create_task() on app startup."""
    if not settings.tradier_api_key:
        logger.info("TRADIER_API_KEY not set — WebSocket stream disabled")
        return

    backoff = 1
    retries = 0

    while retries < MAX_RETRIES:
        try:
            import websockets
            headers = {"Authorization": f"Bearer {settings.tradier_api_key}"}
            async with websockets.connect(TRADIER_WS_URL, extra_headers=headers) as ws:
                logger.info("Tradier WS connected (symbols: %d)", len(symbols))
                backoff = 1
                retries = 0

                subscribe_msg = json.dumps({
                    "symbols": symbols,
                    "sessionid": "edge-stream",
                    "linebreak": True,
                })
                await ws.send(subscribe_msg)

                async for raw_msg in ws:
                    try:
                        data = json.loads(raw_msg)
                        if data.get("type") == "quote":
                            redis = await get_redis()
                            if redis:
                                payload = json.dumps({
                                    "bid": data.get("bid"),
                                    "ask": data.get("ask"),
                                    "last": data.get("last"),
                                    "volume": data.get("volume"),
                                    "timestamp": data.get("date"),
                                })
                                await redis.setex(
                                    f"quote:{data['symbol']}", 60, payload
                                )
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.debug("Skipping malformed WS message: %s", e)
        except asyncio.CancelledError:
            logger.info("Tradier WS listener cancelled")
            return
        except Exception as e:
            retries += 1
            logger.warning(
                "Tradier WS disconnect (retry %d/%d): %s", retries, MAX_RETRIES, e
            )
            await asyncio.sleep(min(backoff, MAX_BACKOFF))
            backoff *= 2

    logger.error("Tradier WS exhausted %d retries — giving up", MAX_RETRIES)
