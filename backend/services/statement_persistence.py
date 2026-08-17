"""Persist confirmed parsed statements into Account, Position, and Statement tables."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.account import Account
from backend.models.enums import AccountType, ParsingStatus, TaxType
from backend.models.position import Position
from backend.models.statement import Statement


class StatementPersistenceService:
    """Upsert account and replace positions using a confirmed parsed statement payload."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def persist_confirmed_statement(
        self,
        statement_id: str,
        payload: dict[str, Any],
        *,
        household_id: UUID,
        client_id: Optional[UUID],
        management_mode: str = "self_directed",
        source: str = "statement_upload",
    ) -> dict[str, Any]:
        """Persist one confirmed statement into normalized DB tables."""
        as_of_date = self._statement_date(payload)
        custodian = (payload.get("custodian") or "Unknown").strip() or "Unknown"
        account_type = self._normalize_account_type(payload.get("account_type"))
        tax_type = self._infer_tax_type(account_type)
        total_value = self._statement_total_value(payload)

        account = await self._upsert_account(
            household_id=household_id,
            client_id=client_id,
            custodian=custodian,
            account_type=account_type,
            tax_type=tax_type,
            as_of_date=as_of_date,
            total_value=total_value,
            management_mode=management_mode,
            source=source,
            account_number=payload.get("account_number"),
        )

        positions_created = await self._replace_positions(
            account_id=account.id,
            as_of_date=as_of_date,
            positions_payload=payload.get("positions") or [],
        )

        statement = Statement(
            account_id=account.id,
            filename=(payload.get("filename") or f"{statement_id}.pdf")[:255],
            upload_date=datetime.now(timezone.utc),
            custodian_detected=custodian[:100],
            parser_used=(payload.get("parser_used") or payload.get("custodian"))[:100]
            if (payload.get("parser_used") or payload.get("custodian"))
            else None,
            raw_text=payload.get("raw_text"),
            parsed_data={
                "source_statement_id": statement_id,
                "management_mode": management_mode,
                "source": source,
                **payload,
            },
            parsing_status=ParsingStatus.COMPLETED.value,
            statement_date=as_of_date,
            period_end=as_of_date,
            ending_value=total_value,
            parsed_at=datetime.now(timezone.utc),
        )
        self.db.add(statement)
        await self.db.flush()

        return {
            "account_id": str(account.id),
            "statement_db_id": str(statement.id),
            "positions_created": positions_created,
            "as_of_date": as_of_date.isoformat(),
        }

    async def _upsert_account(
        self,
        *,
        household_id: UUID,
        client_id: Optional[UUID],
        custodian: str,
        account_type: str,
        tax_type: str,
        as_of_date: date,
        total_value: Decimal,
        management_mode: str,
        source: str,
        account_number: Optional[str],
    ) -> Account:
        query = select(Account).where(
            Account.household_id == household_id,
            Account.custodian == custodian,
            Account.account_type == account_type,
        )
        if client_id:
            query = query.where(Account.client_id == client_id)

        result = await self.db.execute(query)
        account = result.scalar_one_or_none()

        if not account:
            account = Account(
                household_id=household_id,
                client_id=client_id,
                custodian=custodian,
                account_type=account_type,
                tax_type=tax_type,
                management_mode=management_mode,
                source=source,
            )
            self.db.add(account)
            await self.db.flush()

        if account_number:
            masked = str(account_number)[-4:]
            account.account_number_masked = f"***{masked}" if masked else account.account_number_masked
        account.tax_type = tax_type
        account.management_mode = management_mode
        account.source = source
        account.last_statement_date = as_of_date
        account.last_statement_value = total_value
        return account

    async def _replace_positions(
        self,
        *,
        account_id: UUID,
        as_of_date: date,
        positions_payload: list[dict[str, Any]],
    ) -> int:
        await self.db.execute(
            delete(Position).where(
                Position.account_id == account_id,
                Position.as_of_date == as_of_date,
            )
        )

        created = 0
        for raw_position in positions_payload:
            quantity = self._to_decimal(raw_position.get("quantity")) or Decimal("0")
            market_value = self._to_decimal(
                raw_position.get("value", raw_position.get("market_value"))
            ) or Decimal("0")
            market_price = Decimal("0")
            if quantity != 0:
                market_price = (market_value / quantity).copy_abs()

            security_name = (
                raw_position.get("name")
                or raw_position.get("security_name")
                or raw_position.get("ticker")
                or "Unknown Security"
            )
            ticker = raw_position.get("ticker")
            if isinstance(ticker, str):
                ticker = ticker.strip().upper() or None
            else:
                ticker = None

            position = Position(
                account_id=account_id,
                as_of_date=as_of_date,
                cost_basis_date=as_of_date,
                ticker=ticker,
                security_name=security_name[:255],
                security_type=self._infer_security_type(raw_position),
                quantity=quantity,
                market_price=market_price,
                market_value=market_value,
                cost_basis=self._to_decimal(raw_position.get("cost_basis")),
                asset_class=raw_position.get("asset_class"),
                sector=raw_position.get("sector"),
                expense_ratio=self._to_decimal(raw_position.get("expense_ratio")),
                m_and_e_fee=self._to_decimal(raw_position.get("m_and_e_fee")),
                target_allocation_pct=self._to_decimal(
                    raw_position.get("target_allocation_pct")
                ),
                actual_allocation_pct=self._to_decimal(
                    raw_position.get("actual_allocation_pct")
                ),
                fund_name=raw_position.get("fund_name"),
            )
            self.db.add(position)
            created += 1

        return created

    def _statement_date(self, payload: dict[str, Any]) -> date:
        value = (
            payload.get("statement_date")
            or payload.get("date")
            or payload.get("statementDate")
            or payload.get("period_end")
        )
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value[:10])
            except ValueError:
                pass
        return datetime.now(timezone.utc).date()

    def _statement_total_value(self, payload: dict[str, Any]) -> Decimal:
        explicit = self._to_decimal(
            payload.get("totalValue", payload.get("total_value", payload.get("ending_value")))
        )
        if explicit is not None:
            return explicit
        running = Decimal("0")
        for position in payload.get("positions") or []:
            running += self._to_decimal(
                position.get("value", position.get("market_value"))
            ) or Decimal("0")
        return running

    def _normalize_account_type(self, value: Any) -> str:
        if isinstance(value, str):
            candidate = value.strip().upper().replace(" ", "_")
            allowed = {member.value for member in AccountType}
            if candidate in allowed:
                return candidate
        return AccountType.BROKERAGE.value

    def _infer_tax_type(self, account_type: str) -> str:
        deferred = {
            AccountType.TRADITIONAL_IRA.value,
            AccountType.SEP_IRA.value,
            AccountType.SIMPLE_IRA.value,
            AccountType.INHERITED_IRA.value,
            AccountType.IRA_401K.value,
            AccountType.PLAN_403B.value,
            AccountType.PLAN_457B.value,
            AccountType.TSP.value,
            AccountType.PENSION_ROLLOVER.value,
            AccountType.VARIABLE_ANNUITY.value,
        }
        tax_free = {
            AccountType.ROTH_IRA.value,
            AccountType.PLAN_529.value,
        }
        if account_type in deferred:
            return TaxType.TAX_DEFERRED.value
        if account_type in tax_free:
            return TaxType.TAX_FREE.value
        return TaxType.TAXABLE.value

    def _infer_security_type(self, position_payload: dict[str, Any]) -> str:
        if position_payload.get("fund_name"):
            return "MUTUAL_FUND"
        ticker = position_payload.get("ticker")
        if isinstance(ticker, str) and len(ticker.strip()) > 5:
            return "MUTUAL_FUND"
        return "EQUITY"

    def _to_decimal(self, value: Any) -> Optional[Decimal]:
        if value is None or value == "":
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None
