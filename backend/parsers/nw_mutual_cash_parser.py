"""Northwestern Mutual Cash Management statement parser."""

import logging
import re
from datetime import date
from decimal import Decimal
from typing import Optional

from .base_parser import (
    BaseStatementParser,
    ParsedFee,
    ParsedPosition,
    ParsedStatement,
)

logger = logging.getLogger(__name__)

DETECTION_KEYWORDS = [
    "CASH MANAGEMENT",
    "Pershing",
    "TE1-",
    "Northwestern Mutual",
]


class NWMutualCashParser(BaseStatementParser):
    """Parse Northwestern Mutual Cash Management statements."""

    def can_handle(self, raw_text: str) -> bool:
        text = raw_text.upper()
        return (
            "CASH MANAGEMENT" in text
            and ("NORTHWESTERN" in text or "PERSHING" in text or "TE1-" in text)
        )

    def get_custodian_name(self) -> str:
        return "Northwestern Mutual"

    def parse(self, raw_text: str) -> ParsedStatement:
        result = ParsedStatement(
            custodian="Northwestern Mutual",
            account_type="CASH_MANAGEMENT",
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
            if "TE1-" in line or "account" in line.lower():
                match = re.search(r"(TE1-[\d]+|[\d-]{10,})", line)
                if match:
                    result.account_number = match.group(1)
            if "statement date" in line.lower() or "as of" in line.lower():
                match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", line)
                if match:
                    m, d, y = match.groups()
                    result.statement_date = self._parse_date(m, d, y)
            if "total" in line.lower() or "balance" in line.lower():
                match = re.search(r"\$?([\d,]+\.?\d*)", line.replace(",", ""))
                if match:
                    try:
                        result.total_value = Decimal(
                            match.group(1).replace(",", "")
                        )
                    except Exception:
                        pass
            if re.search(r"^[A-Z]{2,5}\s+", line) or "CUSIP" in line.upper():
                parsed = self._parse_position_line(line, lines[i + 1 : i + 3])
                if parsed:
                    result.positions.append(parsed)
            if "fdic" in line.lower() or "sweep" in line.lower():
                result.metadata["fdic_sweep"] = True
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

    def _parse_position_line(
        self, line: str, next_lines: list
    ) -> Optional[ParsedPosition]:
        parts = line.split()
        ticker = None
        cusip = None
        value = Decimal("0")
        qty = Decimal("0")
        for p in parts:
            if re.match(r"^[A-Z]{2,5}$", p) and not p.isdigit():
                ticker = p
            elif re.match(r"^\d{9}$", p.replace("-", "")):
                cusip = p
            elif p.replace(".", "").replace(",", "").replace("-", "").isdigit():
                try:
                    v = Decimal(p.replace(",", ""))
                    if v > 100:
                        value = v
                    elif v > 0 and qty == 0:
                        qty = v
                except Exception:
                    pass
        if line.startswith("$"):
            match = re.search(r"\$?([\d,]+\.?\d*)", line.replace(",", ""))
            if match:
                try:
                    value = Decimal(match.group(1).replace(",", ""))
                except Exception:
                    pass
        if ticker or value > 0:
            return ParsedPosition(
                ticker=ticker or "CASH",
                cusip=cusip,
                security_name=ticker or "Cash",
                quantity=qty,
                market_value=value,
            )
        return None
