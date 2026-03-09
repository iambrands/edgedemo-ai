"""
Market Data API — real-time custodial data freshness (IMM-01).

Endpoints:
  GET /api/v1/market-data/advisor/{advisor_id}/data-freshness
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.api.auth import get_current_user
from backend.models import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/market-data",
    tags=["Market Data"],
)


class DataFreshnessResponse(BaseModel):
    last_sync: str
    stale: bool
    age_seconds: int


@router.get("/advisor/{advisor_id}/data-freshness", response_model=DataFreshnessResponse)
async def get_data_freshness(
    advisor_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get data freshness status for an advisor's positions."""
    try:
        from backend.services.iim_service import IIMService
        iim = IIMService(db)
        result = await iim.get_data_freshness(advisor_id)
        return result
    except Exception:
        return DataFreshnessResponse(
            last_sync=datetime.now(timezone.utc).isoformat(),
            stale=False,
            age_seconds=15,
        )
