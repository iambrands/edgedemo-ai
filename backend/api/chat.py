"""Conversational AI endpoint — full IIM→CIM→BIM pipeline."""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.api.dependencies import get_db
from backend.services.ai_orchestrator import AIOrchestrator
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    client_id: str
    query: str
    behavioral_profile: str = "balanced"


class ChatResponse(BaseModel):
    success: bool
    message: str
    latency_ms: int
    error: str | None = None


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    session: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """Run full IIM→CIM→BIM pipeline. Returns client-facing message."""
    try:
        orchestrator = AIOrchestrator(session)
        result = await orchestrator.process_query(
            client_id=req.client_id,
            query=req.query,
            behavioral_profile=req.behavioral_profile,
        )
        return ChatResponse(
            success=result.success,
            message=result.message,
            latency_ms=result.latency_ms,
            error=result.error,
        )
    except Exception as e:
        logger.exception("Chat error: %s", e)
        return ChatResponse(
            success=False,
            message="An error occurred. Please try again.",
            latency_ms=0,
            error=str(e),
        )
