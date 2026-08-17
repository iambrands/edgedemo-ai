"""Unit tests for statement persistence and statement-access guardrails."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.api.b2c.statements import confirm_statement
from backend.api.ria_statements import _can_access_statement, PARSED_STATEMENTS
from backend.services.statement_persistence import StatementPersistenceService


class TestStatementPersistenceService:
    def test_account_type_normalization(self):
        svc = StatementPersistenceService(db=None)  # type: ignore[arg-type]
        assert svc._normalize_account_type("roth ira") == "ROTH_IRA"
        assert svc._normalize_account_type("unknown_type") == "BROKERAGE"

    def test_tax_type_inference(self):
        svc = StatementPersistenceService(db=None)  # type: ignore[arg-type]
        assert svc._infer_tax_type("ROTH_IRA") == "TAX_FREE"
        assert svc._infer_tax_type("TRADITIONAL_IRA") == "TAX_DEFERRED"
        assert svc._infer_tax_type("BROKERAGE") == "TAXABLE"

    def test_total_value_falls_back_to_positions(self):
        svc = StatementPersistenceService(db=None)  # type: ignore[arg-type]
        payload = {"positions": [{"value": "101.25"}, {"market_value": "98.75"}]}
        assert str(svc._statement_total_value(payload)) == "200.00"


class TestStatementAccessGuards:
    def test_cross_household_hidden_with_404_semantics(self):
        stmt = {"householdId": str(uuid4())}
        user = {"household_id": str(uuid4()), "role": "ria", "id": "u1"}
        assert _can_access_statement(stmt, user) is False

    def test_b2c_upload_visible_only_to_owner(self):
        hid = str(uuid4())
        stmt = {
            "householdId": hid,
            "uploadedByUserId": "owner-1",
            "uploadedByRole": "b2c",
        }
        owner = {"household_id": hid, "role": "b2c", "id": "owner-1"}
        other = {"household_id": hid, "role": "b2c", "id": "owner-2"}
        assert _can_access_statement(stmt, owner) is True
        assert _can_access_statement(stmt, other) is False

    @pytest.mark.asyncio
    async def test_b2c_confirm_404_for_household_mismatch(self):
        statement_id = "stmt-idor-test"
        PARSED_STATEMENTS[statement_id] = {
            "id": statement_id,
            "status": "parsed",
            "householdId": str(uuid4()),
            "positions": [],
            "filename": "test.pdf",
            "custodian": "Mock",
        }

        user = SimpleNamespace(household_id=uuid4(), client_id=None)
        with pytest.raises(HTTPException) as exc:
            await confirm_statement(statement_id, current_user=user, db=None)  # type: ignore[arg-type]
        assert exc.value.status_code == 404
