"""B2C statement list and confirmation endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.api.ria_statements import PARSED_STATEMENTS
from backend.models.account import Account
from backend.models.client import Client
from backend.models.statement import Statement
from backend.models.user import User
from backend.services.statement_persistence import StatementPersistenceService

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


@router.post("/{statement_id}/confirm")
async def confirm_statement(
    statement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm parsed statement and persist it for the authenticated B2C user."""
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
