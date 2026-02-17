"""
Shared test fixtures for Edge real data testing.
Uses mocked async session for DB-dependent tests (no PostgreSQL required).
"""

import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

_project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_project_root))


@pytest.fixture
def sample_position_value():
    """Exact value to test Decimal precision."""
    return Decimal("54905.58")


class MockScalarResult:
    """Mock SQLAlchemy ScalarResult for async session."""

    def __init__(self, data):
        self._data = data if isinstance(data, list) else [data]

    def all(self):
        return self._data

    def scalars(self):
        return self

    def scalar_one_or_none(self):
        return self._data[0] if self._data else None


class MockAsyncSession:
    """Mock AsyncSession that returns fixture data based on query type."""

    def __init__(self, fixture_data: dict):
        self.fixture = fixture_data
        self.add = MagicMock()
        self.commit = AsyncMock()
        self.flush = AsyncMock()
        self.rollback = AsyncMock()
        self.refresh = AsyncMock()

    async def execute(self, stmt):
        from sqlalchemy import select

        # Inspect statement and return appropriate fixture data
        if stmt is None:
            return MockScalarResult([])

        # Get the froms/columns to determine query type
        try:
            cols = str(stmt)
            if "households" in cols or "household_id" in cols.lower():
                if "accounts" in cols or "account" in cols.lower():
                    return MockScalarResult(self.fixture.get("accounts", []))
            if "accounts" in cols and "position" not in cols.lower():
                return MockScalarResult(self.fixture.get("accounts", []))
            if "positions" in cols or "position" in cols.lower():
                return MockScalarResult(self.fixture.get("positions", []))
            if "clients" in cols or "client" in cols.lower():
                return MockScalarResult([self.fixture.get("client")] if self.fixture.get("client") else [])
        except Exception:
            pass

        return MockScalarResult([])


def _make_nicole_fixture_objects():
    """Create ORM-like objects for Nicole Wilson household (no DB)."""
    from backend.models.account import Account
    from backend.models.client import Client
    from backend.models.household import Household
    from backend.models.position import Position

    hh_id = uuid4()
    client_id = uuid4()
    va_id = uuid4()
    rh_id = uuid4()
    et_id = uuid4()

    household = Household(
        id=hh_id,
        name="Wilson Household",
        tax_filing_status="single",
        risk_tolerance="moderate",
        combined_aum=Decimal("54905.58"),
    )
    client = Client(
        id=client_id,
        household_id=hh_id,
        first_name="Nicole",
        last_name="Wilson",
        email="nicole.wilson@test.com",
        date_of_birth=date(1985, 6, 15),
        risk_tolerance="moderate",
        investment_objective="growth_and_income",
        annual_income_range="75000-100000",
        net_worth_range="100000-250000",
    )

    va_account = Account(
        id=va_id,
        household_id=hh_id,
        client_id=client_id,
        custodian="Northwestern Mutual",
        account_number_masked="xxxx3694",
        account_type="VARIABLE_ANNUITY",
        tax_type="TAX_DEFERRED",
        last_statement_value=Decimal("42005.58"),
    )
    rh_account = Account(
        id=rh_id,
        household_id=hh_id,
        client_id=client_id,
        custodian="Robinhood",
        account_number_masked="xxxx548",
        account_type="BROKERAGE",
        tax_type="TAXABLE",
        last_statement_value=Decimal("8000.00"),
    )
    et_account = Account(
        id=et_id,
        household_id=hh_id,
        client_id=client_id,
        custodian="E*TRADE",
        account_number_masked="xxxx205",
        account_type="BROKERAGE",
        tax_type="TAXABLE",
        last_statement_value=Decimal("4900.00"),
    )
    accounts = [va_account, rh_account, et_account]

    # VA positions (sub-accounts) — sum must equal va_account last_statement_value (42005.58)
    as_of = date(2026, 1, 8)
    va_positions = [
        Position(
            account_id=va_id,
            as_of_date=as_of,
            ticker="SELBOND",
            security_name="Select Bond (Allspring)",
            security_type="VA_SUBACCOUNT",
            quantity=Decimal("0"),
            market_price=Decimal("1"),
            market_value=Decimal("5460.73"),
            asset_class="FIXED_INCOME",
            target_allocation_pct=Decimal("0.15"),
            actual_allocation_pct=Decimal("0.13"),
            expense_ratio=Decimal("0.0045"),
        ),
        Position(
            account_id=va_id,
            as_of_date=as_of,
            ticker="IDX500",
            security_name="Index 500 (BlackRock)",
            security_type="VA_SUBACCOUNT",
            quantity=Decimal("0"),
            market_price=Decimal("1"),
            market_value=Decimal("4620.61"),
            asset_class="EQUITY",
            target_allocation_pct=Decimal("0.09"),
            actual_allocation_pct=Decimal("0.11"),
            expense_ratio=Decimal("0.0035"),
        ),
        Position(
            account_id=va_id,
            as_of_date=as_of,
            ticker="CONTRA",
            security_name="Fidelity Contrafund",
            security_type="VA_SUBACCOUNT",
            quantity=Decimal("0"),
            market_price=Decimal("1"),
            market_value=Decimal("2940.39"),
            asset_class="EQUITY",
            target_allocation_pct=Decimal("0.05"),
            actual_allocation_pct=Decimal("0.07"),
            expense_ratio=Decimal("0.0055"),
        ),
        Position(
            account_id=va_id,
            as_of_date=as_of,
            ticker="MSECT",
            security_name="Multi Sector Bond (PIMCO)",
            security_type="VA_SUBACCOUNT",
            quantity=Decimal("0"),
            market_price=Decimal("1"),
            market_value=Decimal("28983.85"),  # remainder: 42005.58 - 13021.73
            asset_class="FIXED_INCOME",
            target_allocation_pct=Decimal("0.10"),
            actual_allocation_pct=Decimal("0.09"),
            expense_ratio=Decimal("0.0065"),
        ),
    ]

    rh_positions = [
        Position(
            account_id=rh_id,
            as_of_date=as_of,
            ticker="AAPL",
            security_name="Apple Inc.",
            security_type="STOCK",
            quantity=Decimal("10"),
            market_price=Decimal("220"),
            market_value=Decimal("2200.00"),
            asset_class="EQUITY",
            unrealized_gain_loss=Decimal("700.00"),
        ),
        Position(
            account_id=rh_id,
            as_of_date=as_of,
            ticker="VTI",
            security_name="Vanguard Total Stock Market ETF",
            security_type="ETF",
            quantity=Decimal("20"),
            market_price=Decimal("290"),
            market_value=Decimal("5800.00"),
            asset_class="EQUITY",
            expense_ratio=Decimal("0.0003"),
            unrealized_gain_loss=Decimal("1000.00"),
        ),
    ]

    et_positions = [
        Position(
            account_id=et_id,
            as_of_date=as_of,
            ticker="SPY",
            security_name="SPDR S&P 500 ETF Trust",
            security_type="ETF",
            quantity=Decimal("8"),
            market_price=Decimal("525"),
            market_value=Decimal("4200.00"),
            asset_class="EQUITY",
            expense_ratio=Decimal("0.000945"),
            unrealized_gain_loss=Decimal("600.00"),
        ),
        Position(
            account_id=et_id,
            as_of_date=as_of,
            ticker="CASH",
            security_name="Cash",
            security_type="CASH",
            quantity=Decimal("700"),
            market_price=Decimal("1"),
            market_value=Decimal("700.00"),
            asset_class="CASH",
        ),
    ]

    all_positions = va_positions + rh_positions + et_positions

    return {
        "household": household,
        "client": client,
        "va_account": va_account,
        "robinhood_account": rh_account,
        "etrade_account": et_account,
        "accounts": accounts,
        "va_positions": va_positions,
        "rh_positions": rh_positions,
        "et_positions": et_positions,
        "all_positions": all_positions,
    }


@pytest.fixture
def nicole_household():
    """Nicole Wilson household fixture data (ORM objects, no DB)."""
    return _make_nicole_fixture_objects()


@pytest.fixture
def nicole_mock_session(nicole_household):
    """AsyncMock session that returns Nicole's data for IIM/CIM tests.
    Call order: 1) accounts, 2) va_positions, 3) rh_positions, 4) et_positions.
    """
    data = nicole_household
    results = [
        MockScalarResult(data["accounts"]),
        MockScalarResult(data["va_positions"]),
        MockScalarResult(data["rh_positions"]),
        MockScalarResult(data["et_positions"]),
    ]
    call_idx = [0]

    async def execute_side_effect(stmt):
        idx = call_idx[0]
        call_idx[0] += 1
        if idx < len(results):
            return results[idx]
        return MockScalarResult([])

    session = MagicMock()
    session.execute = AsyncMock(side_effect=execute_side_effect)
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.flush = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def db_session(nicole_mock_session):
    """Alias for nicole_mock_session. Returns mock async session."""
    return nicole_mock_session
