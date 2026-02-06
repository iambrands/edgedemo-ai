"""B2C conversational AI endpoint."""

import logging
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.api.b2c.middleware import require_usage_quota
from backend.models.user import User
from backend.services.ai_orchestrator import AIOrchestrator
from backend.services.entitlements import TIER_FEATURES
from backend.services.usage_tracker import UsageTracker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c", tags=["b2c-chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    alerts: list = []
    educational_content: dict | None = None
    usage_remaining: int = 0


@router.post("/chat", response_model=ChatResponse)
async def b2c_chat(
    req: ChatRequest,
    current_user: User = Depends(require_usage_quota("ai_chat_messages")),
    db: AsyncSession = Depends(get_db),
):
    """B2C conversational AI — full IIM→CIM→BIM pipeline with B2C persona."""
    orchestrator = AIOrchestrator(db)

    household_id = str(current_user.household_id) if current_user.household_id else None
    client_id = str(current_user.client_id) if current_user.client_id else str(current_user.id)

    result = await orchestrator.process_query(
        client_id=client_id,
        query=req.message,
        behavioral_profile="balanced",
        household_id=household_id,
    )

    tracker = UsageTracker(db)
    await tracker.record_usage(current_user.id, "ai_chat_messages")

    used = await tracker.get_monthly_count(current_user.id, "ai_chat_messages")
    tier = current_user.subscription_tier or "free"
    limit = TIER_FEATURES.get(tier, {}).get("ai_chat_messages_per_month", 10)
    remaining = max(0, limit - used) if limit != -1 else 999

    return ChatResponse(
        message=result.message,
        conversation_id=req.conversation_id or str(uuid.uuid4()),
        alerts=[],
        educational_content=None,
        usage_remaining=remaining,
    )
