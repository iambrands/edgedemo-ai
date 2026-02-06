"""CIM audit trail — every compliance decision logged. Never soft-delete."""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, event, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base

logger = logging.getLogger(__name__)


class ComplianceLog(Base):
    """Regulatory audit trail. Every CIM decision is logged. No soft-delete."""

    __tablename__ = "compliance_logs"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    recommendation_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    rule_checked: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # e.g. FINRA_2111, REG_BI, FINRA_2330
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    client_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    advisor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    prompt_version: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )


@event.listens_for(ComplianceLog, "before_update")
def _block_compliance_update(mapper, connection, target):
    raise ValueError("ComplianceLog records are immutable. Updates are not permitted.")


@event.listens_for(ComplianceLog, "before_delete")
def _block_compliance_delete(mapper, connection, target):
    raise ValueError("ComplianceLog records are immutable. Deletes are not permitted.")
