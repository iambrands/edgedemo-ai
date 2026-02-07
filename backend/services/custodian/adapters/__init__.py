"""Custodian adapter registry."""

from typing import Dict, Type

from backend.models.custodian import CustodianType
from backend.services.custodian.base_adapter import BaseCustodianAdapter
from .schwab_adapter import SchwabAdapter
from .fidelity_adapter import FidelityAdapter


ADAPTER_REGISTRY: Dict[CustodianType, Type[BaseCustodianAdapter]] = {
    CustodianType.SCHWAB: SchwabAdapter,
    CustodianType.FIDELITY: FidelityAdapter,
}


def get_adapter(custodian_type: CustodianType) -> BaseCustodianAdapter:
    """Instantiate and return the adapter for the given custodian type."""
    adapter_class = ADAPTER_REGISTRY.get(custodian_type)
    if not adapter_class:
        raise ValueError(f"No adapter registered for custodian type: {custodian_type}")
    return adapter_class()
