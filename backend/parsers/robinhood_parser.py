"""Robinhood brokerage statement parser."""

import logging
import re
from datetime import date
from decimal import Decimal
from typing import Optional

from .base_parser import BaseStatementParser, ParsedPosition, ParsedStatement

logger = logging.getLogger(__name__)


class RobinhoodParser(BaseStatementParser):
    """Parse Robinhood brokerage statements."""

    def can_handle(self, raw_text: str) -> bool:
        return "Robinhood" in raw_text and "Menlo Park" in raw_text

    def get_custodian_name(self) -> str:
        return "Robinhood"

    def parse(self, raw_text: str) -> ParsedStatement:
        result = ParsedStatement(
            custodian="Robinhood",
            account_type="BROKERAGE",
            positions=[],
            fees_detected=[],
            allocations=[],
            metadata={},
        )
        lines = raw_text.split("\n")
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            if "account" in line.lower() and "number" in line.lower():
                match = re.search(r"[\d]{6,12}", line)
                if match:
                    result.account_number = match.group(0)
            if "statement" in line.lower() and "date" in line.lower():
                match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", line)
                if match:
                    m, d, y = match.groups()
                    result.statement_date = self._parse_date(m, d, y)
            if re.match(r"^[A-Z]{1,5}\s+", line) or re.match(
                r"^[A-Z]{1,5}\t", line
            ):
                parsed = self._parse_position(line)
                if parsed:
                    result.positions.append(parsed)
            if "total" in line.lower() and "value" in line.lower():
                match = re.search(r"\$?([\d,]+\.?\d*)", line.replace(",", ""))
                if match:
                    try:
                        result.total_value = Decimal(
                            match.group(1).replace(",", "")
                        )
                    except Exception:
                        pass
            if "crypto" in line.lower():
                result.metadata["has_crypto"] = True
            if "stock lending" in line.lower():
                result.metadata["stock_lending"] = True
        if result.total_value == 0 and result.positions:
            result.total_value = sum(p.market_value for p in result.positions)
        return result

    def _parse_date(self, m: str, d: str, y: str) -> Optional[date]:
        try:
            yr = int(y)
            if yr < 100:
                yr += 2000
            return date(yr, int(m), int(d))
        except Exception:
            return None

    def _parse_position(self, line: str) -> Optional[ParsedPosition]:
        parts = re.split(r"\s+", line, maxsplit=5)
        if len(parts) < 2:
            return None
        ticker = parts[0] if re.match(r"^[A-Z]{1,5}$", parts[0]) else None
        value = Decimal("0")
        qty = Decimal("0")
        for p in parts[1:]:
            p_clean = p.replace("$", "").replace(",", "")
            if p_clean.replace(".", "").replace("-", "").isdigit():
                try:
                    v = Decimal(p_clean)
                    if v > 1000:
                        value = v
                    elif v > 0:
                        qty = v
                except Exception:
                    pass
        if ticker and (value > 0 or qty > 0):
            return ParsedPosition(
                ticker=ticker,
                security_name=ticker,
                quantity=qty,
                market_value=value if value > 0 else qty,
            )
        return None
