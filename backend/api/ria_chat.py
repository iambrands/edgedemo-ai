"""
RIA AI Chat endpoint with IIM/CIM/BIM pipeline.
Uses OpenAI when available, falls back to mock responses.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from backend.api.auth import get_current_user
from backend.api.ria_households import HOUSEHOLDS, ACCOUNTS
from backend.services.ai_chat_service import ai_chat_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ria/chat", tags=["RIA Chat"])


# --- Request/Response Models ---

class ChatRequest(BaseModel):
    message: str
    householdId: Optional[str] = None


class PipelineMetadata(BaseModel):
    iim: str
    cim: str
    bim: str
    latency_ms: int


class ChatResponse(BaseModel):
    response: str
    pipeline: PipelineMetadata


# --- Endpoints ---

@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Send a message to Edge assistant.
    Runs through IIM/CIM/BIM pipeline for compliant responses.
    Uses real AI when OpenAI API key is configured, otherwise falls back to mock responses.
    """
    # Build household context if provided
    household_data = None
    if request.householdId:
        hh = next((h for h in HOUSEHOLDS if h["id"] == request.householdId), None)
        if hh:
            hh_accounts = [a for a in ACCOUNTS if a["householdId"] == request.householdId]
            household_data = {
                **hh,
                "accounts": hh_accounts,
                "totalValue": sum(a["balance"] for a in hh_accounts),
            }
    
    # Call AI service (will use mock if no API key)
    result = await ai_chat_service.chat(request.message, household_data)
    
    return ChatResponse(
        response=result.get("response", "I apologize, but I encountered an error processing your request."),
        pipeline=PipelineMetadata(**result.get("pipeline", {"iim": "error", "cim": "error", "bim": "error", "latency_ms": 0})),
    )
