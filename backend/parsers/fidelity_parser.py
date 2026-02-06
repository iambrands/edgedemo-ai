"""Fidelity statement parser."""

import logging
import re
from datetime import date
from decimal import Decimal
from typing import Optional

from .base_parser import BaseStatementParser, ParsedPosition, ParsedStatement

logger = logging.getLogger(__name__)


class FidelityParser(BaseStatementParser):
    """Parse Fidelity and NetBenefits statements."""

    def can_handle(self, raw_text: str) -> bool:
        text = raw_text.upper()
        return "FIDELITY" in text or "NETBENEFITS" in text

    def get_custodian_name(self) -> str:
        return "Fidelity"

    def parse(self, raw_text: str) -> ParsedStatement:
        result = ParsedStatement(
            custodian="Fidelity",
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
                match = re.search(r"[\d-]{8,}", line)
                if match:
                    result.account_number = match.group(0)
            if "statement date" in line.lower() or "as of" in line.lower():
                match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", line)
                if match:
                    m, d, y = match.groups()
                    result.statement_date = self._parse_date(m, d, y)
            if re.match(r"^[A-Z]{2,5}\s+", line) or "CUSIP" in line.upper():
                parsed = self._parse_position(line)
                if parsed:
                    result.positions.append(parsed)
            if "total" in line.lower() or "account value" in line.lower():
                match = re.search(r"\$?([\d,]+\.?\d*)", line.replace(",", ""))
                if match:
                    try:
                        result.total_value = Decimal(
                            match.group(1).replace(",", "")
                        )
                    except Exception:
                        pass
            if "401" in line or "netbenefits" in line.lower():
                result.metadata["retirement_plan"] = True
            if "brokeragelink" in line.lower() or "brokerage link" in line.lower():
                result.metadata["brokerage_link"] = True
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
        parts = re.split(r"\s+", line, maxsplit=6)
        if len(parts) < 2:
            return None
        ticker = parts[0] if re.match(r"^[A-Z]{2,5}$", parts[0]) else None
        value = Decimal("0")
        qty = Decimal("0")
        for p in parts[1:]:
            p_clean = p.replace("$", "").replace(",", "")
            if p_clean.replace(".", "").replace("-", "").isdigit():
                try:
                    v = Decimal(p_clean)
                    if v > 100:
                        value = v
                    elif v > 0:
                        qty = v
                except Exception:
                    pass
        if (ticker or "fund" in line.lower()) and (value > 0 or qty > 0):
            return ParsedPosition(
                ticker=ticker or "FUND",
                security_name=ticker or "Fund",
                quantity=qty,
                market_value=value if value > 0 else qty,
            )
        return None
