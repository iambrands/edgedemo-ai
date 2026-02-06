"""Decimal and monetary field serialization — preserve precision in JSON."""

import json
import logging
from decimal import Decimal
from typing import Any

logger = logging.getLogger(__name__)


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that preserves Decimal precision as string."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


def decimal_serializer(v: Decimal) -> str:
    """Pydantic serializer for Decimal fields."""
    return str(v)
