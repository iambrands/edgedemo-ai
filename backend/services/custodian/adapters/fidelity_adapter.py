"""
Fidelity API adapter - placeholder for Fidelity WealthCentral integration.

Requires Fidelity Institutional partnership agreement.
"""

import logging
import os
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlencode

import httpx

from backend.models.custodian import CustodianType
from backend.services.custodian.base_adapter import (
    BaseCustodianAdapter,
    OAuthTokens,
    RawAccount,
    RawPosition,
    RawTransaction,
)

logger = logging.getLogger(__name__)


class FidelityAdapter(BaseCustodianAdapter):
    """
    Fidelity Institutional API adapter.

    This is a placeholder implementation - full integration requires
    Fidelity WealthCentral API partnership credentials.
    """

    custodian_type = CustodianType.FIDELITY
    BASE_URL = "https://api.fidelity.com/v1"
    AUTH_URL = "https://api.fidelity.com/oauth/authorize"
    TOKEN_URL = "https://api.fidelity.com/oauth/token"

    def __init__(self) -> None:
        self.client_id: str = os.getenv("FIDELITY_CLIENT_ID", "")
        self.client_secret: str = os.getenv("FIDELITY_CLIENT_SECRET", "")
        self._http_client: Optional[httpx.AsyncClient] = None

    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client

    # ── OAuth ──────────────────────────────────────────────────

    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "accounts positions transactions",
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(
        self, code: str, redirect_uri: str
    ) -> OAuthTokens:
        # Implementation follows Schwab pattern — requires Fidelity API docs
        raise NotImplementedError(
            "Fidelity token exchange not yet implemented. "
            "Requires Fidelity WealthCentral API credentials."
        )

    async def refresh_tokens(self, refresh_token: str) -> OAuthTokens:
        raise NotImplementedError(
            "Fidelity token refresh not yet implemented."
        )

    async def revoke_tokens(self, access_token: str) -> bool:
        logger.warning("Fidelity token revocation not yet implemented")
        return False

    async def validate_connection(self, access_token: str) -> bool:
        logger.warning("Fidelity connection validation not yet implemented")
        return False

    # ── Data Fetching ──────────────────────────────────────────

    async def fetch_accounts(self, access_token: str) -> List[RawAccount]:
        raise NotImplementedError(
            "Fidelity account fetching not yet implemented."
        )

    async def fetch_positions(
        self, access_token: str, account_id: str
    ) -> List[RawPosition]:
        raise NotImplementedError(
            "Fidelity position fetching not yet implemented."
        )

    async def fetch_transactions(
        self,
        access_token: str,
        account_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[RawTransaction]:
        raise NotImplementedError(
            "Fidelity transaction fetching not yet implemented."
        )
