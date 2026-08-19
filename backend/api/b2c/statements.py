"""B2C statement list, upload, and confirmation endpoints."""

import logging
import uuid
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.api.ria_statements import PARSED_STATEMENTS, parse_statement_background
from backend.models.account import Account
from backend.models.client import Client
from backend.models.statement import Statement
from backend.models.user import User
from backend.services.b2c_demo import is_demo_user
from backend.services.b2c_demo_persona import DEMO_STATEMENTS, get_demo_holdings
from backend.services.portfolio_csv_parser import parse_portfolio_file
from backend.services.statement_persistence import StatementPersistenceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c/statements", tags=["b2c-statements"])


class StatementSummary(BaseModel):
    id: str
    account_id: str | None
    custodian: str | None
    statement_date: str | None
    ending_value: float | None
    status: str
    filename: str


@router.get("")
async def list_statements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all confirmed statements for the authenticated B2C user."""
    if is_demo_user(current_user):
        return {"statements": DEMO_STATEMENTS}

    if not current_user.household_id:
        return {"statements": []}

    # Resolve client_ids for this household
    client_result = await db.execute(
        select(Client).where(Client.household_id == current_user.household_id)
    )
    client_ids = [c.id for c in client_result.scalars().all()]
    if not client_ids:
        return {"statements": []}

    # Get all accounts for these clients
    acc_result = await db.execute(
        select(Account).where(Account.client_id.in_(client_ids))
    )
    account_ids = [a.id for a in acc_result.scalars().all()]
    if not account_ids:
        return {"statements": []}

    # Fetch statements linked to those accounts, most recent first
    stmt_result = await db.execute(
        select(Statement)
        .where(Statement.account_id.in_(account_ids))
        .order_by(Statement.statement_date.desc().nulls_last())
        .limit(50)
    )
    rows = stmt_result.scalars().all()

    return {
        "statements": [
            StatementSummary(
                id=str(s.id),
                account_id=str(s.account_id) if s.account_id else None,
                custodian=s.custodian_detected,
                statement_date=s.statement_date.isoformat() if s.statement_date else None,
                ending_value=float(s.ending_value) if s.ending_value is not None else None,
                status=s.parsing_status,
                filename=s.filename,
            )
            for s in rows
        ]
    }


@router.post("/upload")
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a PDF or CSV/XLSX positions export for parsing. 20 MB max."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    filename_lower = (file.filename or "").lower()
    allowed = filename_lower.endswith((".pdf", ".csv", ".xlsx", ".xls"))
    if not allowed:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PDF, CSV, or Excel (.xlsx/.xls)",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (20 MB max)")
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty")

    stmt_id = f"stmt-{str(uuid.uuid4())[:8]}"

    if filename_lower.endswith((".csv", ".xlsx", ".xls")):
        try:
            parsed = parse_portfolio_file(file_bytes, file.filename)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        positions = [
            {
                "ticker": h.get("symbol", "UNKNOWN"),
                "name": h.get("description", ""),
                "quantity": h.get("quantity") or 0,
                "value": h.get("market_value", 0),
                "confidence": 0.98,
            }
            for h in parsed["holdings"]
        ]
        PARSED_STATEMENTS[stmt_id] = {
            "id": stmt_id,
            "filename": file.filename,
            "custodian": parsed["custodian"],
            "parsed": f"{parsed['position_count']} positions imported from spreadsheet",
            "confidence": "98%",
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "status": "parsed",
            "householdId": str(current_user.household_id) if current_user.household_id else None,
            "uploadedByUserId": str(current_user.id),
            "uploadedByRole": "b2c",
            "positions": positions,
            "totalValue": parsed["total_value"],
        }
        logger.info("B2C CSV upload parsed: %s (%d positions)", stmt_id, len(positions))
        return {
            "id": stmt_id,
            "filename": file.filename,
            "status": "parsed",
            "message": "Spreadsheet parsed successfully.",
            "estimated_seconds": 0,
        }

    PARSED_STATEMENTS[stmt_id] = {
        "id": stmt_id,
        "filename": file.filename,
        "custodian": "Detecting...",
        "parsed": "Processing...",
        "confidence": "0%",
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "parsing",
        "householdId": str(current_user.household_id) if current_user.household_id else None,
        "uploadedByUserId": str(current_user.id),
        "uploadedByRole": "b2c",
        "positions": [],
    }

    background_tasks.add_task(parse_statement_background, stmt_id, file_bytes, file.filename)

    logger.info("B2C statement upload: %s by user %s", stmt_id, current_user.id)
    return {
        "id": stmt_id,
        "filename": file.filename,
        "status": "parsing",
        "message": "Statement uploaded. Parsing in progress…",
        "estimated_seconds": 10,
    }


@router.get("/{statement_id}/status")
async def get_statement_status(
    statement_id: str,
    current_user: User = Depends(get_current_user),
):
    """Poll parse status for a just-uploaded statement."""
    stmt = PARSED_STATEMENTS.get(statement_id)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    uploaded_by = stmt.get("uploadedByUserId")
    if uploaded_by and uploaded_by != str(current_user.id):
        raise HTTPException(status_code=404, detail="Statement not found")

    return {
        "id": stmt["id"],
        "filename": stmt["filename"],
        "status": stmt.get("status", "parsing"),
        "custodian": stmt.get("custodian", "Detecting..."),
        "parsed": stmt.get("parsed", "Processing..."),
        "confidence": stmt.get("confidence", "0%"),
        "position_count": len(stmt.get("positions", [])),
        "total_value": stmt.get("totalValue"),
        "error": stmt.get("error"),
    }


@router.post("/{statement_id}/confirm")
async def confirm_statement(
    statement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm parsed statement and persist it for the authenticated B2C user."""
    if is_demo_user(current_user):
        holdings = get_demo_holdings()
        return {
            "status": "confirmed",
            "statementId": statement_id,
            "positionsCreated": len(holdings),
            "persistedStatementId": None,
            "persistedAccountId": "acc-demo-schwab-001",
            "message": f"{len(holdings)} positions confirmed and saved (demo mode)",
        }

    user_type = str(getattr(current_user, "user_type", "") or "")
    if user_type and not user_type.startswith("b2c_"):
        # Scope guard: hide endpoint behavior from non-B2C identities.
        raise HTTPException(status_code=404, detail="Statement not found")

    stmt = PARSED_STATEMENTS.get(statement_id)
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    if stmt.get("status") not in {"parsed", "confirmed"}:
        raise HTTPException(status_code=400, detail="Statement not ready for confirmation")

    if not current_user.household_id:
        raise HTTPException(status_code=404, detail="Statement not found")

    stmt_household = stmt.get("householdId")
    if stmt_household:
        try:
            if UUID(str(stmt_household)) != current_user.household_id:
                # IDOR protection: don't reveal statement existence across households.
                raise HTTPException(status_code=404, detail="Statement not found")
        except ValueError:
            raise HTTPException(status_code=404, detail="Statement not found") from None
    else:
        stmt["householdId"] = str(current_user.household_id)

    service = StatementPersistenceService(db)
    persisted = await service.persist_confirmed_statement(
        statement_id,
        stmt,
        household_id=current_user.household_id,
        client_id=current_user.client_id,
        management_mode="self_directed",
        source="statement_upload",
    )
    stmt["status"] = "confirmed"
    stmt["persistedStatementId"] = persisted["statement_db_id"]
    stmt["persistedAccountId"] = persisted["account_id"]

    return {
        "status": "confirmed",
        "statementId": statement_id,
        "positionsCreated": persisted["positions_created"],
        "persistedStatementId": persisted["statement_db_id"],
        "persistedAccountId": persisted["account_id"],
        "message": f"{persisted['positions_created']} positions confirmed and saved",
    }
