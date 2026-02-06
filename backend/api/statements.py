"""Statement upload and parse endpoints."""

import hashlib
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from backend.parsers import get_default_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/statements", tags=["statements"])
_parser_registry = get_default_registry()


class ParsedResponse(BaseModel):
    custodian: str
    account_number: str
    account_type: str
    total_value: float
    positions_count: int
    positions: list


@router.post("/upload")
async def upload_statement(file: UploadFile) -> dict:
    """Upload statement file, auto-detect custodian, parse. Returns parsed data."""
    if not file.filename:
        raise HTTPException(400, "No filename")
    content = await file.read()
    try:
        raw_text = content.decode("utf-8", errors="replace")
    except Exception:
        raw_text = content.decode("latin-1", errors="replace")
    parsed = _parser_registry.detect_and_parse(raw_text)
    return {
        "id": str(uuid4()),
        "filename": file.filename,
        "custodian": parsed.custodian,
        "account_number": parsed.account_number,
        "account_type": parsed.account_type,
        "statement_date": (
            parsed.statement_date.isoformat() if parsed.statement_date else None
        ),
        "total_value": float(parsed.total_value),
        "positions": [
            {
                "ticker": p.ticker,
                "security_name": p.security_name,
                "quantity": float(p.quantity),
                "market_value": float(p.market_value),
            }
            for p in parsed.positions
        ],
        "parser_used": parsed.custodian,
    }


@router.get("/{statement_id}/parsed")
async def get_parsed(statement_id: str) -> dict:
    """Return parsed data for statement. Mock for now (no DB)."""
    return {"id": statement_id, "status": "PENDING", "message": "Use POST /upload"}


@router.post("/{statement_id}/confirm")
async def confirm_parsed(statement_id: str) -> dict:
    """Confirm parsed data and create positions. Mock for now."""
    return {"id": statement_id, "status": "CONFIRMED"}
