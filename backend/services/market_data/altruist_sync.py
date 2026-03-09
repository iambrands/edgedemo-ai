"""
Altruist REST API polling service.
Periodically fetches account holdings and writes to Redis + PostgreSQL.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx

from backend.config.settings import settings
from backend.services.redis_client import get_redis

logger = logging.getLogger(__name__)

SNAPSHOT_INTERVAL_MINUTES = 15
_last_snapshot: dict[str, datetime] = {}


async def poll_altruist_holdings(advisor_id: UUID, db) -> bool:
    """Poll Altruist for an advisor's holdings. Returns True on success."""
    if not settings.altruist_api_key:
        return False

    base = settings.altruist_base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {settings.altruist_api_key}"}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            accounts_resp = await client.get(f"{base}/v1/accounts", headers=headers)
            if accounts_resp.status_code == 429:
                retry_after = int(accounts_resp.headers.get("Retry-After", "60"))
                logger.warning("Altruist rate limited — sleeping %ds", retry_after)
                await asyncio.sleep(retry_after)
                return False
            accounts_resp.raise_for_status()
            accounts = accounts_resp.json()

            redis = await get_redis()

            for acct in accounts:
                acct_id = acct.get("id", "")
                holdings_resp = await client.get(
                    f"{base}/v1/accounts/{acct_id}/holdings", headers=headers
                )
                if holdings_resp.status_code == 429:
                    await asyncio.sleep(60)
                    continue
                holdings_resp.raise_for_status()
                holdings = holdings_resp.json()

                if redis:
                    key = f"holdings:{advisor_id}:{acct_id}"
                    await redis.setex(key, 120, json.dumps(holdings))

                now = datetime.now(timezone.utc)
                snap_key = f"{advisor_id}:{acct_id}"
                last = _last_snapshot.get(snap_key)
                if not last or (now - last).total_seconds() > SNAPSHOT_INTERVAL_MINUTES * 60:
                    await _save_snapshot(advisor_id, acct_id, holdings, db)
                    _last_snapshot[snap_key] = now

            if redis:
                await redis.setex(
                    f"data_freshness:{advisor_id}",
                    300,
                    str(int(datetime.now(timezone.utc).timestamp())),
                )
            return True

    except httpx.HTTPStatusError as e:
        logger.error("Altruist API error: %s", e)
        return False
    except Exception as e:
        logger.error("Altruist polling failed: %s", e)
        return False


async def _save_snapshot(advisor_id: UUID, account_id: str, holdings: dict, db) -> None:
    """Save holdings snapshot to PostgreSQL."""
    try:
        from sqlalchemy import text
        await db.execute(
            text("""
                INSERT INTO accounts_snapshot (advisor_id, account_id, holdings, source)
                VALUES (:advisor_id, :account_id, :holdings, 'altruist')
            """),
            {
                "advisor_id": str(advisor_id),
                "account_id": account_id,
                "holdings": json.dumps(holdings),
            },
        )
        await db.commit()
    except Exception as e:
        logger.error("Snapshot save failed: %s", e)
        await db.rollback()


async def periodic_altruist_poll(db_factory, interval_seconds: int = 60) -> None:
    """Background loop — registered as asyncio.create_task() on app startup."""
    if not settings.altruist_api_key:
        logger.info("ALTRUIST_API_KEY not set — polling disabled")
        return

    while True:
        try:
            async with db_factory() as db:
                from sqlalchemy import text
                result = await db.execute(text("SELECT DISTINCT advisor_id FROM accounts_snapshot LIMIT 50"))
                advisor_ids = [row[0] for row in result.fetchall()]
                if not advisor_ids:
                    advisor_ids = []

                for aid in advisor_ids:
                    await poll_altruist_holdings(aid, db)
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.error("Altruist poll loop error: %s", e)

        await asyncio.sleep(interval_seconds)
