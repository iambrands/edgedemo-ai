"""
Charles Schwab API adapter.

OAuth 2.0 + REST API integration.
Rate Limits: 120 req/min per user.
"""

import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal
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


class SchwabAdapter(BaseCustodianAdapter):
    """
    Schwab Trader API adapter.
    Rate Limits: 120 req/min per user.
    """

    custodian_type = CustodianType.SCHWAB
    BASE_URL = "https://api.schwab.com/v1"
    AUTH_URL = "https://api.schwab.com/oauth/authorize"
    TOKEN_URL = "https://api.schwab.com/oauth/token"

    def __init__(self) -> None:
        self.client_id: str = os.getenv("SCHWAB_CLIENT_ID", "")
        self.client_secret: str = os.getenv("SCHWAB_CLIENT_SECRET", "")
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
            "scope": "AccountAccess Trading",
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(
        self, code: str, redirect_uri: str
    ) -> OAuthTokens:
        response = await self.http_client.post(
            self.TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        response.raise_for_status()
        data = response.json()

        return OAuthTokens(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            expires_at=datetime.utcnow()
            + timedelta(seconds=data.get("expires_in", 1800)),
            scope=data.get("scope"),
        )

    async def refresh_tokens(self, refresh_token: str) -> OAuthTokens:
        response = await self.http_client.post(
            self.TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        response.raise_for_status()
        data = response.json()

        return OAuthTokens(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", refresh_token),
            expires_at=datetime.utcnow()
            + timedelta(seconds=data.get("expires_in", 1800)),
        )

    async def revoke_tokens(self, access_token: str) -> bool:
        try:
            response = await self.http_client.post(
                f"{self.BASE_URL}/oauth/revoke",
                data={"token": access_token},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            return response.status_code == 200
        except Exception:
            logger.exception("Failed to revoke Schwab tokens")
            return False

    async def validate_connection(self, access_token: str) -> bool:
        try:
            response = await self.http_client.get(
                f"{self.BASE_URL}/accounts",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            return response.status_code == 200
        except Exception:
            return False

    # ── Data Fetching ──────────────────────────────────────────

    async def fetch_accounts(self, access_token: str) -> List[RawAccount]:
        response = await self.http_client.get(
            f"{self.BASE_URL}/accounts",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()

        accounts: List[RawAccount] = []
        for acct in data.get("securitiesAccount", []):
            balances = acct.get("currentBalances", {})
            accounts.append(
                RawAccount(
                    external_account_id=acct["accountId"],
                    external_account_number=acct.get("accountNumber"),
                    account_name=acct.get(
                        "displayName", f"Account {acct['accountId'][-4:]}"
                    ),
                    account_type=self._map_account_type(acct.get("type", "")),
                    market_value=Decimal(
                        str(balances.get("liquidationValue", 0))
                    ),
                    cash_balance=Decimal(str(balances.get("cashBalance", 0))),
                    buying_power=Decimal(str(balances.get("buyingPower", 0))),
                    is_active=True,
                    raw_metadata=acct,
                )
            )
        return accounts

    async def fetch_positions(
        self, access_token: str, account_id: str
    ) -> List[RawPosition]:
        response = await self.http_client.get(
            f"{self.BASE_URL}/accounts/{account_id}",
            params={"fields": "positions"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()

        positions: List[RawPosition] = []
        for pos in data.get("securitiesAccount", {}).get("positions", []):
            instrument = pos.get("instrument", {})
            long_qty = pos.get("longQuantity", 0)
            short_qty = pos.get("shortQuantity", 0)
            positions.append(
                RawPosition(
                    external_position_id=f"{account_id}_{instrument.get('symbol', '')}",
                    symbol=instrument.get("symbol", ""),
                    cusip=instrument.get("cusip"),
                    security_name=instrument.get("description", ""),
                    security_type=instrument.get("assetType", ""),
                    quantity=Decimal(str(long_qty - short_qty)),
                    price=Decimal(str(pos.get("averagePrice", 0))),
                    market_value=Decimal(str(pos.get("marketValue", 0))),
                    cost_basis=Decimal(str(pos.get("currentDayCost", 0))),
                    position_type="long" if long_qty > 0 else "short",
                    raw_metadata=pos,
                )
            )
        return positions

    async def fetch_transactions(
        self,
        access_token: str,
        account_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[RawTransaction]:
        response = await self.http_client.get(
            f"{self.BASE_URL}/accounts/{account_id}/transactions",
            params={
                "startDate": start_date.strftime("%Y-%m-%d"),
                "endDate": end_date.strftime("%Y-%m-%d"),
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()

        transactions: List[RawTransaction] = []
        for txn in data:
            item = txn.get("transactionItem", {})
            instrument = item.get("instrument", {})
            settlement_raw = txn.get("settlementDate")
            transactions.append(
                RawTransaction(
                    external_transaction_id=txn["transactionId"],
                    transaction_type=txn.get("type", "OTHER"),
                    transaction_date=datetime.fromisoformat(
                        txn["transactionDate"].replace("Z", "+00:00")
                    ),
                    settlement_date=(
                        datetime.fromisoformat(
                            settlement_raw.replace("Z", "+00:00")
                        )
                        if settlement_raw
                        else None
                    ),
                    symbol=instrument.get("symbol"),
                    cusip=instrument.get("cusip"),
                    security_name=instrument.get("description"),
                    quantity=Decimal(str(item.get("amount", 0))),
                    price=Decimal(str(item.get("price", 0))),
                    gross_amount=Decimal(str(txn.get("netAmount", 0))),
                    net_amount=Decimal(str(txn.get("netAmount", 0))),
                    commission=Decimal(
                        str(txn.get("fees", {}).get("commission", 0))
                    ),
                    fees=Decimal(
                        str(txn.get("fees", {}).get("additionalFee", 0))
                    ),
                    description=txn.get("description"),
                    raw_metadata=txn,
                )
            )
        return transactions

    # ── Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _map_account_type(schwab_type: str) -> str:
        mapping = {
            "MARGIN": "individual",
            "CASH": "individual",
            "IRA": "ira_traditional",
            "ROTH_IRA": "ira_roth",
        }
        return mapping.get(schwab_type.upper(), "individual")
