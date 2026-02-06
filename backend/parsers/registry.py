"""Parser registry with auto-detection and fallback."""

import logging
from typing import List

from .base_parser import BaseStatementParser, ParsedStatement
from .etrade_parser import ETradeParser
from .fidelity_parser import FidelityParser
from .nw_mutual_cash_parser import NWMutualCashParser
from .nw_mutual_va_parser import NWMutualVAParser
from .robinhood_parser import RobinhoodParser
from .schwab_parser import SchwabParser
from .universal_fallback import UniversalFallbackParser

logger = logging.getLogger(__name__)


class ParserRegistry:
    """Registry of statement parsers. Detects custodian and routes to parser."""

    def __init__(self) -> None:
        self._parsers: List[BaseStatementParser] = []
        self._fallback_parser = UniversalFallbackParser()

    def register(self, parser: BaseStatementParser) -> None:
        """Register a parser. Order matters for detection."""
        self._parsers.append(parser)
        logger.info("Registered parser: %s", parser.get_custodian_name())

    def detect_and_parse(self, raw_text: str) -> ParsedStatement:
        """Detect custodian from raw text and parse. Falls back to LLM if unknown."""
        for parser in self._parsers:
            if parser.can_handle(raw_text):
                logger.info("Using parser: %s", parser.get_custodian_name())
                return parser.parse(raw_text)
        logger.info("No parser matched, using universal fallback")
        return self._fallback_parser.parse(raw_text)


def get_default_registry() -> ParserRegistry:
    """Return registry with all parsers registered in priority order."""
    registry = ParserRegistry()
    registry.register(NWMutualVAParser())
    registry.register(NWMutualCashParser())
    registry.register(RobinhoodParser())
    registry.register(ETradeParser())
    registry.register(SchwabParser())
    registry.register(FidelityParser())
    return registry
