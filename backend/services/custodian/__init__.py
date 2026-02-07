"""Multi-Custodian Aggregation service package."""

from .custodian_service import CustodianService
from .encryption_service import EncryptionService
from .normalizer import normalizer, DataNormalizer
from .base_adapter import (
    BaseCustodianAdapter,
    OAuthTokens,
    RawAccount,
    RawPosition,
    RawTransaction,
    SyncResult,
)
from .adapters import get_adapter, ADAPTER_REGISTRY

__all__ = [
    "CustodianService",
    "EncryptionService",
    "normalizer",
    "DataNormalizer",
    "BaseCustodianAdapter",
    "OAuthTokens",
    "RawAccount",
    "RawPosition",
    "RawTransaction",
    "SyncResult",
    "get_adapter",
    "ADAPTER_REGISTRY",
]
