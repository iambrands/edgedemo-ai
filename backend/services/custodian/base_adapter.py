"""Base adapter interface for custodian integrations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from backend.models.custodian import CustodianType  # noqa: E402


# ============================================================================
# DATA TRANSFER OBJECTS
# ============================================================================

@dataclass
class OAuthTokens:
    """OAuth token set returned by a custodian."""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    scope: Optional[str] = None
    token_type: str = "Bearer"


@dataclass
class RawAccount:
    """Raw account data from a custodian API."""
    external_account_id: str
    external_account_number: Optional[str] = None
    account_name: str = ""
    account_type: str = "individual"
    tax_status: str = "taxable"
    primary_owner_name: Optional[str] = None
    primary_owner_ssn_last4: Optional[str] = None
    joint_owner_name: Optional[str] = None
    market_value: Decimal = Decimal("0")
    cash_balance: Decimal = Decimal("0")
    buying_power: Optional[Decimal] = None
    margin_balance: Optional[Decimal] = None
    account_opened_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    is_active: bool = True
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RawPosition:
    """Raw position data from a custodian API."""
    external_position_id: Optional[str] = None
    symbol: str = ""
    cusip: Optional[str] = None
    isin: Optional[str] = None
    security_name: str = ""
    security_type: str = ""
    quantity: Decimal = Decimal("0")
    price: Decimal = Decimal("0")
    price_as_of: Optional[datetime] = None
    market_value: Decimal = Decimal("0")
    cost_basis: Optional[Decimal] = None
    cost_basis_per_share: Optional[Decimal] = None
    position_type: str = "long"
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RawTransaction:
    """Raw transaction data from a custodian API."""
    external_transaction_id: str
    transaction_type: str
    transaction_date: datetime
    settlement_date: Optional[datetime] = None
    symbol: Optional[str] = None
    cusip: Optional[str] = None
    security_name: Optional[str] = None
    quantity: Optional[Decimal] = None
    price: Optional[Decimal] = None
    gross_amount: Decimal = Decimal("0")
    net_amount: Decimal = Decimal("0")
    commission: Decimal = Decimal("0")
    fees: Decimal = Decimal("0")
    description: Optional[str] = None
    is_pending: bool = False
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SyncResult:
    """Aggregated result of a full sync operation."""
    success: bool
    accounts: List[RawAccount] = field(default_factory=list)
    positions: Dict[str, List[RawPosition]] = field(default_factory=dict)
    transactions: Dict[str, List[RawTransaction]] = field(default_factory=dict)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    api_calls_made: int = 0
    rate_limit_hits: int = 0


# ============================================================================
# ABSTRACT BASE
# ============================================================================

class BaseCustodianAdapter(ABC):
    """Abstract base class for custodian API adapters."""

    custodian_type: CustodianType

    # ── OAuth ──────────────────────────────────────────────────

    @abstractmethod
    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Return the OAuth authorization URL for the custodian."""

    @abstractmethod
    async def exchange_code_for_tokens(
        self, code: str, redirect_uri: str
    ) -> OAuthTokens:
        """Exchange an authorization code for access/refresh tokens."""

    @abstractmethod
    async def refresh_tokens(self, refresh_token: str) -> OAuthTokens:
        """Refresh expired tokens."""

    @abstractmethod
    async def revoke_tokens(self, access_token: str) -> bool:
        """Revoke an access token."""

    # ── Data Fetching ──────────────────────────────────────────

    @abstractmethod
    async def fetch_accounts(self, access_token: str) -> List[RawAccount]:
        """Fetch all accounts for the authenticated advisor."""

    @abstractmethod
    async def fetch_positions(
        self, access_token: str, account_id: str
    ) -> List[RawPosition]:
        """Fetch positions for a single account."""

    @abstractmethod
    async def fetch_transactions(
        self,
        access_token: str,
        account_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[RawTransaction]:
        """Fetch transactions for a single account."""

    @abstractmethod
    async def validate_connection(self, access_token: str) -> bool:
        """Validate that the connection/token is still working."""

    # ── Convenience ────────────────────────────────────────────

    async def full_sync(
        self, access_token: str, transaction_lookback_days: int = 90
    ) -> SyncResult:
        """
        Perform a full sync: accounts -> positions -> transactions.
        Subclasses can override for custodian-specific optimizations.
        """
        result = SyncResult(success=True)

        try:
            result.accounts = await self.fetch_accounts(access_token)
            result.api_calls_made += 1

            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=transaction_lookback_days)

            for account in result.accounts:
                acct_id = account.external_account_id

                positions = await self.fetch_positions(access_token, acct_id)
                result.positions[acct_id] = positions
                result.api_calls_made += 1

                transactions = await self.fetch_transactions(
                    access_token, acct_id, start_date, end_date
                )
                result.transactions[acct_id] = transactions
                result.api_calls_made += 1

        except Exception as exc:
            result.success = False
            result.error_code = type(exc).__name__
            result.error_message = str(exc)

        return result
