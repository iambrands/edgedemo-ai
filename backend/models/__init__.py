"""EdgeAI RIA Platform data models."""

import logging
import os
from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .base import Base

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/edgeai"
)
SYNC_DATABASE_URL = DATABASE_URL.replace("+asyncpg", "")


def get_engine(database_url: str | None = None, async_: bool = True):
    """Create database engine. Use sync URL for Alembic."""
    url = database_url or DATABASE_URL
    if async_:
        return create_async_engine(url, echo=False)
    return create_engine(url.replace("+asyncpg", ""), echo=False)


def get_session_factory(database_url: str | None = None):
    """Create async session factory."""
    url = database_url or DATABASE_URL
    engine = get_engine(url)
    return async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI to inject async DB session."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Import all models so they register with Base (needed for Alembic)
from . import enums, mixins  # noqa: E402, F401
from .account import Account  # noqa: E402
from .advisor import Advisor  # noqa: E402
from .client import Client  # noqa: E402
from .compliance_log import ComplianceLog  # noqa: E402
from .fee_structure import FeeStructure  # noqa: E402
from .firm import Firm  # noqa: E402
from .household import Household  # noqa: E402
from .portfolio_models import (  # noqa: E402
    InvestmentPolicyStatement,
    InvestmentObjective,
    ModelPortfolio,
    ModelPortfolioHolding,
    RiskQuestionnaire,
    RiskToleranceLevel,
    TimeHorizon,
)
from .position import Position  # noqa: E402
from .statement import Statement  # noqa: E402
from .transaction import Transaction  # noqa: E402
from .usage_log import UsageLog  # noqa: E402
from .user import User  # noqa: E402
from .portal import (  # noqa: E402
    ClientPortalUser,
    PortalNarrative,
    BehavioralNudge,
    NudgeInteraction,
    ClientGoal,
    PortalDocument,
    FirmWhiteLabel,
    NudgeType,
    NudgeStatus,
    GoalType,
)

__all__ = [
    "Account",
    "Advisor",
    "Base",
    "BehavioralNudge",
    "Client",
    "ClientGoal",
    "ClientPortalUser",
    "ComplianceLog",
    "FeeStructure",
    "Firm",
    "FirmWhiteLabel",
    "GoalType",
    "Household",
    "InvestmentObjective",
    "InvestmentPolicyStatement",
    "ModelPortfolio",
    "ModelPortfolioHolding",
    "NudgeInteraction",
    "NudgeStatus",
    "NudgeType",
    "PortalDocument",
    "PortalNarrative",
    "Position",
    "RiskQuestionnaire",
    "RiskToleranceLevel",
    "Statement",
    "TimeHorizon",
    "Transaction",
    "UsageLog",
    "User",
    "get_db_session",
    "get_engine",
    "get_session_factory",
]
