"""B2C statement confirmation endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_db
from backend.api.ria_statements import PARSED_STATEMENTS
from backend.models.user import User
from backend.services.statement_persistence import StatementPersistenceService

router = APIRouter(prefix="/api/v1/b2c/statements", tags=["b2c-statements"])


@router.post("/{statement_id}/confirm")
async def confirm_statement(
    statement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm parsed statement and persist it for the authenticated B2C user."""
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
