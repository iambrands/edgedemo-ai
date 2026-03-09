"""
Async Redis client singleton.

Key schema:
  quote:{symbol}                    -> JSON {bid, ask, last, volume, timestamp}, TTL=60s
  positions:{advisor_id}            -> JSON list [{symbol, quantity, account_id}], TTL=120s
  holdings:{advisor_id}:{acct_id}   -> JSON holdings, TTL=120s
  data_freshness:{advisor_id}       -> Unix timestamp of last successful sync, TTL=300s
  tax_job:{job_id}                  -> JSON {status, result, error}, TTL=3600s
"""

import logging
from typing import Optional

import redis.asyncio as aioredis

from backend.config.settings import settings

logger = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None
_redis_available: bool = False


async def get_redis() -> Optional[aioredis.Redis]:
    """Return the shared async Redis connection, or None if unavailable."""
    global _redis, _redis_available
    if _redis is not None:
        return _redis
    if not settings.redis_url:
        logger.info("REDIS_URL not set — Redis features disabled")
        return None
    try:
        _redis = aioredis.from_url(
            settings.redis_url, decode_responses=True, socket_timeout=5
        )
        await _redis.ping()
        _redis_available = True
        logger.info("Redis connected: %s", settings.redis_url[:30])
        return _redis
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — features degraded", exc)
        _redis = None
        _redis_available = False
        return None


def is_redis_available() -> bool:
    return _redis_available


async def close_redis() -> None:
    global _redis, _redis_available
    if _redis is not None:
        await _redis.close()
        _redis = None
        _redis_available = False
