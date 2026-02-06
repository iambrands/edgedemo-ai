"""B2C dashboard endpoints — aggregated portfolio view."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.b2c.schemas import DashboardResponse
from backend.api.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.services.b2c_dashboard import B2CDashboardService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/dashboard", tags=["b2c-dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated portfolio view for B2C user."""
    svc = B2CDashboardService(db)
    return await svc.get_dashboard(current_user)
