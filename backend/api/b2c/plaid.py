"""B2C Plaid account aggregation endpoints."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.services.plaid_service import PlaidService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/plaid", tags=["b2c-plaid"])


class ExchangeRequest(BaseModel):
    public_token: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None


@router.post("/link-token")
async def create_link_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Plaid Link token for the authenticated B2C user."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    svc = PlaidService(db)
    try:
        return await svc.create_link_token(current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.post("/exchange")
async def exchange_public_token(
    body: ExchangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exchange a Plaid Link public token for an access token and sync accounts."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    svc = PlaidService(db)
    try:
        result = await svc.exchange_public_token(
            user_id=current_user.id,
            public_token=body.public_token,
            institution_id=body.institution_id,
            institution_name=body.institution_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return result


@router.get("/accounts")
async def list_linked_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all Plaid-linked institutions for the authenticated B2C user."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    svc = PlaidService(db)
    items = await svc.list_items(current_user.id)
    return {"items": items}


@router.delete("/items/{item_id}", status_code=204)
async def remove_linked_account(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a linked Plaid institution. Returns 404 if not owned by user."""
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    svc = PlaidService(db)
    try:
        await svc.remove_item(current_user.id, item_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Item not found")


@router.get("/transactions")
async def get_transactions(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch recent transactions for all linked Plaid items.

    Returns realistic mock data when no live Plaid credentials are configured.
    """
    user_type = str(getattr(current_user, "user_type", "") or "")
    if not user_type.startswith("b2c_"):
        raise HTTPException(status_code=404, detail="Not found")

    svc = PlaidService(db)
    try:
        txns = await svc.get_transactions(current_user.id, days=min(days, 90))
        return {"transactions": txns}
    except Exception as e:
        logger.error("get_transactions failed: %s", e)
        raise HTTPException(status_code=503, detail="Could not fetch transactions") from e


@router.post("/webhook")
async def plaid_webhook(request: Request):
    """Receive Plaid webhooks (item errors, re-consent needed, etc.)."""
    payload = await request.json()
    webhook_type = payload.get("webhook_type", "")
    webhook_code = payload.get("webhook_code", "")
    logger.info("Plaid webhook: %s/%s", webhook_type, webhook_code)
    return {"status": "received"}
