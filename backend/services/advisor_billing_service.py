"""
Advisor connect platform fee — logs 0.25% (25 bps) on matched AUM
when an advisor accepts a B2C connection request.

This is a logging/ledger layer only. Actual Stripe transfer is G4 (human)
once the advisor has a connected Stripe account.
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.settings import settings

logger = logging.getLogger(__name__)

_ASSET_RANGE_MIDPOINTS: dict[str, float] = {
    "under_50k": 25_000,
    "50k_250k": 150_000,
    "250k_500k": 375_000,
    "500k_1m": 750_000,
    "1m_5m": 3_000_000,
    "over_5m": 7_500_000,
}


def estimate_aum(investable_assets_range: Optional[str]) -> float:
    """Return midpoint AUM estimate from the self-reported range."""
    if not investable_assets_range:
        return 0.0
    return _ASSET_RANGE_MIDPOINTS.get(investable_assets_range, 0.0)


def compute_platform_fee(aum: float, fee_bps: Optional[int] = None) -> Decimal:
    """Compute one-time platform fee = AUM × fee_bps / 10000."""
    bps = fee_bps if fee_bps is not None else settings.ADVISOR_CONNECT_PLATFORM_FEE_BPS
    return Decimal(str(round(aum * bps / 10_000, 2)))


async def log_match_fee(connection, db: AsyncSession) -> None:
    """
    Called when an advisor accepts a B2C connection request.
    Stores AUM estimate, fee_bps, and computed fee on the connection record.
    Does NOT call Stripe — that requires the advisor to be onboarded via Stripe Connect (G4).
    """
    aum = estimate_aum(getattr(connection, "investable_assets_range", None))
    fee_bps = settings.ADVISOR_CONNECT_PLATFORM_FEE_BPS
    fee = compute_platform_fee(aum, fee_bps)

    try:
        connection.aum_at_match = Decimal(str(aum))
        connection.platform_fee_bps = fee_bps
        connection.platform_fee_amount = fee
        connection.platform_fee_logged_at = datetime.now(timezone.utc)
        await db.flush()
        logger.info(
            "Platform fee logged: connection=%s aum=%.0f fee_bps=%d fee=%.2f",
            connection.id,
            aum,
            fee_bps,
            float(fee),
        )
    except Exception as e:
        # Billing log failure must not block the accept action
        logger.error("Failed to log platform fee for connection %s: %s", connection.id, e)
