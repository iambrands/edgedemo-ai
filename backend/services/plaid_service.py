"""
Plaid account aggregation service for B2C users.
Handles Link token creation, public token exchange, and balance sync.
Falls back gracefully to mock mode when PLAID_CLIENT_ID is not configured.
"""

import base64
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.settings import settings

logger = logging.getLogger(__name__)

_MOCK_MODE = not (settings.PLAID_CLIENT_ID and settings.PLAID_SECRET)

if not _MOCK_MODE:
    try:
        import plaid
        from plaid.api import plaid_api
        from plaid.model.country_code import CountryCode
        from plaid.model.item_remove_request import ItemRemoveRequest
        from plaid.model.link_token_create_request import LinkTokenCreateRequest
        from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
        from plaid.model.products import Products

        _ENV_MAP = {
            "sandbox": plaid.Environment.Sandbox,
            "development": plaid.Environment.Development,
            "production": plaid.Environment.Production,
        }
        _plaid_config = plaid.Configuration(
            host=_ENV_MAP.get(settings.PLAID_ENV, plaid.Environment.Sandbox),
            api_key={
                "clientId": settings.PLAID_CLIENT_ID,
                "secret": settings.PLAID_SECRET,
            },
        )
        _plaid_client = plaid_api.PlaidApi(plaid.ApiClient(_plaid_config))
        logger.info("Plaid client initialized (env=%s)", settings.PLAID_ENV)
    except ImportError:
        _MOCK_MODE = True
        logger.warning("plaid-python not installed — running in mock mode")
else:
    logger.info("PLAID_CLIENT_ID not set — Plaid running in mock mode")


# ---------------------------------------------------------------------------
# Token encryption (Fernet, falls back to base64 if key not set)
# ---------------------------------------------------------------------------

def _encrypt_token(token: str) -> str:
    if not settings.ENCRYPTION_KEY:
        logger.warning("ENCRYPTION_KEY not set — storing Plaid token as base64 only")
        return base64.b64encode(token.encode()).decode()
    try:
        from cryptography.fernet import Fernet
        key = settings.ENCRYPTION_KEY.encode()
        if len(key) != 44:
            key = base64.urlsafe_b64encode(key[:32].ljust(32, b"0"))
        f = Fernet(key)
        return f.encrypt(token.encode()).decode()
    except Exception as e:
        logger.error("Token encryption failed: %s — falling back to base64", e)
        return base64.b64encode(token.encode()).decode()


def _decrypt_token(enc: str) -> str:
    if not settings.ENCRYPTION_KEY:
        return base64.b64decode(enc.encode()).decode()
    try:
        from cryptography.fernet import Fernet
        key = settings.ENCRYPTION_KEY.encode()
        if len(key) != 44:
            key = base64.urlsafe_b64encode(key[:32].ljust(32, b"0"))
        f = Fernet(key)
        return f.decrypt(enc.encode()).decode()
    except Exception:
        return base64.b64decode(enc.encode()).decode()


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class PlaidService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_link_token(self, user_id: UUID) -> dict[str, Any]:
        """Create a Plaid Link token for the given user."""
        if _MOCK_MODE:
            return {
                "link_token": f"link-sandbox-mock-{str(user_id)[:8]}",
                "expiration": "2099-01-01T00:00:00Z",
                "mock": True,
            }

        try:
            from plaid.model.link_token_create_request import LinkTokenCreateRequest
            from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
            from plaid.model.products import Products
            from plaid.model.country_code import CountryCode

            request = LinkTokenCreateRequest(
                user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
                client_name="Firmum",
                products=[Products("investments"), Products("assets")],
                country_codes=[CountryCode("US")],
                language="en",
                webhook=f"{settings.DOMAIN}/api/v1/b2c/plaid/webhook",
            )
            response = _plaid_client.link_token_create(request)
            return {
                "link_token": response["link_token"],
                "expiration": response["expiration"].isoformat(),
                "mock": False,
            }
        except Exception as e:
            logger.error("Plaid link_token_create failed: %s", e)
            raise ValueError(f"Could not create Link token: {e}") from e

    async def exchange_public_token(
        self,
        user_id: UUID,
        public_token: str,
        institution_id: Optional[str] = None,
        institution_name: Optional[str] = None,
    ) -> dict[str, Any]:
        """Exchange a public token for an access token and persist the item."""
        if _MOCK_MODE or public_token.startswith("link-sandbox-mock-"):
            return await self._store_mock_item(user_id, institution_name or "Demo Bank")

        try:
            from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
            request = ItemPublicTokenExchangeRequest(public_token=public_token)
            response = _plaid_client.item_public_token_exchange(request)
            access_token = response["access_token"]
            plaid_item_id = response["item_id"]
        except Exception as e:
            logger.error("Plaid public token exchange failed: %s", e)
            raise ValueError(f"Token exchange failed: {e}") from e

        return await self._store_item(
            user_id=user_id,
            plaid_item_id=plaid_item_id,
            access_token=access_token,
            institution_id=institution_id,
            institution_name=institution_name,
        )

    async def _store_mock_item(self, user_id: UUID, institution_name: str) -> dict[str, Any]:
        """Store a demo item so the dashboard shows linked accounts in mock mode."""
        try:
            from backend.models.plaid_item import PlaidItem
        except ImportError:
            from models.plaid_item import PlaidItem

        fake_item_id = f"mock-item-{str(uuid4())[:8]}"
        fake_token = f"access-sandbox-mock-{str(uuid4())[:8]}"
        item = PlaidItem(
            user_id=user_id,
            plaid_item_id=fake_item_id,
            access_token_enc=_encrypt_token(fake_token),
            institution_id="ins_mock",
            institution_name=institution_name,
            status="active",
            last_synced_at=datetime.now(timezone.utc),
        )
        self.db.add(item)
        await self.db.flush()
        logger.info("Mock Plaid item stored for user %s", user_id)
        return {
            "item_id": str(item.id),
            "plaid_item_id": fake_item_id,
            "institution_name": institution_name,
            "accounts": [
                {
                    "account_id": f"acc-mock-{str(uuid4())[:6]}",
                    "name": "Demo Brokerage",
                    "type": "investment",
                    "balance": 125000.0,
                }
            ],
            "mock": True,
        }

    async def _store_item(
        self,
        user_id: UUID,
        plaid_item_id: str,
        access_token: str,
        institution_id: Optional[str],
        institution_name: Optional[str],
    ) -> dict[str, Any]:
        try:
            from backend.models.plaid_item import PlaidItem
        except ImportError:
            from models.plaid_item import PlaidItem

        existing = await self.db.execute(
            select(PlaidItem).where(PlaidItem.plaid_item_id == plaid_item_id)
        )
        item = existing.scalar_one_or_none()
        if item:
            item.access_token_enc = _encrypt_token(access_token)
            item.institution_name = institution_name or item.institution_name
            item.status = "active"
            item.error_code = None
        else:
            item = PlaidItem(
                user_id=user_id,
                plaid_item_id=plaid_item_id,
                access_token_enc=_encrypt_token(access_token),
                institution_id=institution_id,
                institution_name=institution_name,
                status="active",
            )
            self.db.add(item)
        await self.db.flush()

        accounts = await self._fetch_accounts(access_token)
        item.last_synced_at = datetime.now(timezone.utc)
        return {
            "item_id": str(item.id),
            "plaid_item_id": plaid_item_id,
            "institution_name": institution_name,
            "accounts": accounts,
            "mock": False,
        }

    async def _fetch_accounts(self, access_token: str) -> list[dict]:
        """Fetch investment accounts and balances for an access token."""
        try:
            from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
            request = InvestmentsHoldingsGetRequest(access_token=access_token)
            resp = _plaid_client.investments_holdings_get(request)
            out = []
            for acc in resp.get("accounts", []):
                out.append({
                    "account_id": acc.get("account_id"),
                    "name": acc.get("name"),
                    "type": str(acc.get("type", "investment")),
                    "balance": float(acc.get("balances", {}).get("current") or 0),
                })
            return out
        except Exception as e:
            logger.warning("Could not fetch Plaid accounts: %s", e)
            return []

    async def list_items(self, user_id: UUID) -> list[dict]:
        """Return all linked institutions for a user."""
        try:
            from backend.models.plaid_item import PlaidItem
        except ImportError:
            from models.plaid_item import PlaidItem

        result = await self.db.execute(
            select(PlaidItem)
            .where(PlaidItem.user_id == user_id, PlaidItem.status == "active")
            .order_by(PlaidItem.created_at.asc())
        )
        items = result.scalars().all()
        return [
            {
                "item_id": str(item.id),
                "institution_name": item.institution_name or "Unknown",
                "institution_id": item.institution_id,
                "status": item.status,
                "last_synced_at": item.last_synced_at.isoformat() if item.last_synced_at else None,
            }
            for item in items
        ]

    async def remove_item(self, user_id: UUID, item_db_id: UUID) -> None:
        """Unlink a Plaid item. Returns 404 if not owned by this user."""
        try:
            from backend.models.plaid_item import PlaidItem
        except ImportError:
            from models.plaid_item import PlaidItem

        result = await self.db.execute(
            select(PlaidItem).where(
                PlaidItem.id == item_db_id,
                PlaidItem.user_id == user_id,
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            raise LookupError("Item not found")

        if not _MOCK_MODE and not item.plaid_item_id.startswith("mock-item-"):
            try:
                from plaid.model.item_remove_request import ItemRemoveRequest
                access_token = _decrypt_token(item.access_token_enc)
                _plaid_client.item_remove(ItemRemoveRequest(access_token=access_token))
            except Exception as e:
                logger.warning("Plaid item_remove call failed (continuing): %s", e)

        item.status = "removed"
        await self.db.flush()
        logger.info("Plaid item %s removed for user %s", item_db_id, user_id)
