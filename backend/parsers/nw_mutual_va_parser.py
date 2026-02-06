"""Northwestern Mutual Variable Annuity statement parser."""

import logging
import re
from datetime import date
from decimal import Decimal
from typing import Optional

from .base_parser import (
    BaseStatementParser,
    ParsedAllocation,
    ParsedFee,
    ParsedPosition,
    ParsedStatement,
)

logger = logging.getLogger(__name__)

DETECTION_KEYWORDS = [
    "Variable Annuity",
    "Northwestern Mutual",
    "NorthwesternMutual",
    "Contract#",
    "Contract #",
    "contract number",
]


class NWMutualVAParser(BaseStatementParser):
    """Parse Northwestern Mutual Variable Annuity statements."""

    def can_handle(self, raw_text: str) -> bool:
        text = raw_text.upper()
        return all(kw.upper() in text for kw in ["VARIABLE ANNUITY", "NORTHWESTERN"])

    def get_custodian_name(self) -> str:
        return "Northwestern Mutual"

    def parse(self, raw_text: str) -> ParsedStatement:
        result = ParsedStatement(
            custodian="Northwestern Mutual",
            account_type="VARIABLE_ANNUITY",
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
            if "contract" in line.lower() and ("#" in line or "number" in line.lower()):
                match = re.search(r"(\d{6,12})", line)
                if match:
                    result.account_number = match.group(1)
                    result.metadata["contract_number"] = match.group(1)
            if "statement date" in line.lower() or "as of" in line.lower():
                match = re.search(
                    r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", line
                )
                if match:
                    m, d, y = match.groups()
                    result.statement_date = self._parse_date(m, d, y)
            if "total" in line.lower() and ("value" in line.lower() or "balance" in line.lower()):
                match = re.search(r"\$?([\d,]+\.?\d*)", line.replace(",", ""))
                if match:
                    try:
                        result.total_value = Decimal(match.group(1).replace(",", ""))
                    except Exception:
                        pass
            if any(
                kw in line for kw in ["Sub-Account", "Subaccount", "Allocation"]
            ):
                parsed = self._parse_va_subaccount_line(line)
                if parsed:
                    result.positions.append(parsed)
            if "m&e" in line.lower() or "m and e" in line.lower() or "mortality" in line.lower():
                parsed = self._parse_me_fee(line)
                if parsed:
                    result.fees_detected.append(parsed)
            if "expense" in line.lower() and "ratio" in line.lower():
                parsed = self._parse_expense_ratio(line)
                if parsed:
                    result.fees_detected.append(parsed)
            if "surrender" in line.lower():
                result.metadata["surrender_mentioned"] = True
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

    def _parse_va_subaccount_line(self, line: str) -> Optional[ParsedPosition]:
        match = re.search(
            r"([A-Z]{2,5})\s+[\d.]+\s+\$?([\d,]+\.?\d*)",
            line,
        )
        if match:
            ticker = match.group(1)
            val_str = match.group(2).replace(",", "")
            try:
                value = Decimal(val_str)
                return ParsedPosition(
                    ticker=ticker,
                    security_name=ticker,
                    market_value=value,
                    quantity=Decimal("0"),
                )
            except Exception:
                pass
        parts = line.split()
        for i, p in enumerate(parts):
            if p.startswith("$") or (p.replace(".", "").replace(",", "").isdigit() and i > 0):
                try:
                    val = Decimal(p.replace("$", "").replace(",", ""))
                    name = " ".join(parts[:i]) if i > 0 else "Unknown"
                    return ParsedPosition(
                        security_name=name,
                        market_value=val,
                        quantity=Decimal("0"),
                    )
                except Exception:
                    break
        return None

    def _parse_me_fee(self, line: str) -> Optional[ParsedFee]:
        match = re.search(r"([\d.]+)%", line)
        if match:
            try:
                rate = Decimal(match.group(1)) / 100
                return ParsedFee(fee_type="M_AND_E", rate=rate, description=line[:100])
            except Exception:
                pass
        return ParsedFee(fee_type="M_AND_E", description=line[:100])

    def _parse_expense_ratio(self, line: str) -> Optional[ParsedFee]:
        match = re.search(r"([\d.]+)%", line)
        if match:
            try:
                rate = Decimal(match.group(1)) / 100
                return ParsedFee(
                    fee_type="EXPENSE_RATIO", rate=rate, description=line[:100]
                )
            except Exception:
                pass
        return None
