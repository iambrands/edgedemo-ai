"""LLM-powered fallback parser for unknown statement formats."""

import logging
import os
from datetime import date
from decimal import Decimal
from typing import Any, Optional

from .base_parser import (
    BaseStatementParser,
    ParsedAllocation,
    ParsedFee,
    ParsedPosition,
    ParsedStatement,
)

logger = logging.getLogger(__name__)


class UniversalFallbackParser(BaseStatementParser):
    """Uses LLM to extract positions from unrecognized formats. Logs confidence."""

    def can_handle(self, raw_text: str) -> bool:
        return True

    def get_custodian_name(self) -> str:
        return "Unknown (LLM Fallback)"

    def parse(self, raw_text: str) -> ParsedStatement:
        try:
            return self._parse_with_llm(raw_text)
        except Exception as e:
            logger.warning("LLM fallback parse failed: %s", e)
            return self._extract_heuristic(raw_text)

    def _parse_with_llm(self, raw_text: str) -> ParsedStatement:
        """Call OpenAI/Anthropic for structured extraction. Mock if no key."""
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            return self._extract_heuristic(raw_text)
        try:
            from anthropic import Anthropic

            client = Anthropic(api_key=api_key)
            prompt = f"""Extract portfolio positions from this statement. Return JSON only.
Format: {{"positions": [{{"ticker": "X", "security_name": "Y", "quantity": n, "market_value": m}}], "total_value": n, "account_number": "x", "custodian": "x"}}

Statement:
{raw_text[:8000]}
"""
            resp = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            text = resp.content[0].text
            import json

            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(text[start:end])
                positions = []
                for p in data.get("positions", []):
                    positions.append(
                        ParsedPosition(
                            ticker=p.get("ticker"),
                            security_name=p.get("security_name", p.get("ticker", "")),
                            quantity=Decimal(str(p.get("quantity", 0))),
                            market_value=Decimal(str(p.get("market_value", 0))),
                        )
                    )
                total = Decimal(str(data.get("total_value", 0)))
                return ParsedStatement(
                    custodian=data.get("custodian", "Unknown"),
                    account_number=data.get("account_number", ""),
                    account_type=data.get("account_type", "BROKERAGE"),
                    total_value=total,
                    positions=positions,
                    metadata={"confidence": 0.85, "parser": "llm_fallback"},
                )
        except Exception as e:
            logger.warning("LLM parse failed: %s", e)
        return self._extract_heuristic(raw_text)

    def _extract_heuristic(self, raw_text: str) -> ParsedStatement:
        """Simple regex-based extraction when LLM unavailable."""
        import re

        positions = []
        total = Decimal("0")
        lines = raw_text.split("\n")
        for line in lines:
            m = re.search(
                r"([A-Z]{2,5})\s+[\d.]+\s+\$?([\d,]+\.?\d*)",
                line,
            )
            if m:
                try:
                    ticker = m.group(1)
                    val = Decimal(m.group(2).replace(",", ""))
                    positions.append(
                        ParsedPosition(
                            ticker=ticker,
                            security_name=ticker,
                            quantity=Decimal("0"),
                            market_value=val,
                        )
                    )
                    total += val
                except Exception:
                    pass
        return ParsedStatement(
            custodian="Unknown",
            account_type="BROKERAGE",
            total_value=total,
            positions=positions,
            metadata={"confidence": 0.5, "parser": "heuristic_fallback"},
        )
