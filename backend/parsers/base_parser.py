"""Base statement parser interface and ParsedStatement Pydantic model."""

import logging
from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ParsedPosition(BaseModel):
    """Single position extracted from a statement."""

    ticker: Optional[str] = None
    cusip: Optional[str] = None
    security_name: str = ""
    quantity: Decimal = Decimal("0")
    market_value: Decimal = Decimal("0")
    cost_basis: Optional[Decimal] = None
    asset_class: Optional[str] = None
    sector: Optional[str] = None
    expense_ratio: Optional[Decimal] = None
    m_and_e_fee: Optional[Decimal] = None
    target_allocation_pct: Optional[Decimal] = None
    actual_allocation_pct: Optional[Decimal] = None
    fund_name: Optional[str] = None


class ParsedFee(BaseModel):
    """Fee extracted from a statement."""

    fee_type: str = ""
    rate: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None


class ParsedAllocation(BaseModel):
    """Target vs actual allocation."""

    category: str = ""
    target_pct: Optional[Decimal] = None
    actual_pct: Optional[Decimal] = None
    drift: Optional[Decimal] = None


class ParsedStatement(BaseModel):
    """Structured output from parsing a statement."""

    custodian: str = ""
    account_number: str = ""
    account_type: str = ""
    statement_date: Optional[date] = None
    total_value: Decimal = Decimal("0")
    positions: list[ParsedPosition] = Field(default_factory=list)
    fees_detected: list[ParsedFee] = Field(default_factory=list)
    allocations: list[ParsedAllocation] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class BaseStatementParser(ABC):
    """Abstract base for statement parsers."""

    @abstractmethod
    def can_handle(self, raw_text: str) -> bool:
        """Return True if this parser recognizes the statement format."""

    @abstractmethod
    def parse(self, raw_text: str) -> ParsedStatement:
        """Extract structured data from raw statement text."""

    @abstractmethod
    def get_custodian_name(self) -> str:
        """Return canonical custodian name."""
