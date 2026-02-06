"""
Track monthly usage for rate-limited features (AI chat, statement uploads).
"""

import logging
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.usage_log import UsageLog

logger = logging.getLogger(__name__)


class UsageTracker:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_usage(self, user_id, feature: str) -> None:
        """Record a single usage event."""
        log = UsageLog(user_id=user_id, feature=feature)
        self.db.add(log)
        await self.db.flush()

    async def get_monthly_count(self, user_id, feature: str) -> int:
        """Get usage count for current month."""
        first_of_month = date.today().replace(day=1)
        result = await self.db.execute(
            select(func.count(UsageLog.id))
            .where(UsageLog.user_id == user_id)
            .where(UsageLog.feature == feature)
            .where(UsageLog.timestamp >= first_of_month)
        )
        return result.scalar() or 0
