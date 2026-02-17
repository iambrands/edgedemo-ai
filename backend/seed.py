"""
Seed database with demo data for Edge RIA Platform.
Run: python -m backend.seed
"""
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal
from uuid import uuid4

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set default DATABASE_URL if not set
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/edgeai"

import bcrypt
from sqlalchemy import select

from backend.models import (
    Base,
    get_engine,
    get_session_factory,
    User,
    Firm,
    Advisor,
    Client,
    Household,
    Account,
    Position,
    ComplianceLog,
)
from backend.models.enums import AccountType, TaxType, ComplianceResult, ComplianceSeverity


async def seed_database():
    """Seed database with demo data."""
    engine = get_engine()

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = get_session_factory()

    async with session_factory() as session:
        # Check if already seeded
        result = await session.execute(
            select(User).where(User.email == "leslie@iabadvisors.com")
        )
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping...")
            return

        print("Seeding database...")

        # ── 1. Firm ──────────────────────────────────────────────
        firm = Firm(
            firm_name="IAB Advisors, Inc.",
            crd_number="7891234",
            sec_registration="801-12345",
            aum=1_250_000,
            advisor_count=1,
            plan="professional",
            max_households=50,
            max_advisors=5,
            branding={"primary_color": "#1a365d", "logo_url": None},
        )
        session.add(firm)
        await session.flush()
        print(f"Created firm: {firm.firm_name}")

        # ── 2. Advisor ───────────────────────────────────────────
        advisor = Advisor(
            firm_id=firm.id,
            first_name="Leslie",
            last_name="Wilson",
            email="leslie@iabadvisors.com",
            crd_number="7891234",
            licenses=["Series 6", "Series 7", "Series 63", "Series 65 (pending)"],
        )
        session.add(advisor)
        await session.flush()
        print(f"Created advisor: {advisor.first_name} {advisor.last_name}")

        # ── 3. User (auth record) ────────────────────────────────
        pw_hash = bcrypt.hashpw("CreateWealth2026$".encode(), bcrypt.gensalt()).decode()
        user = User(
            email="leslie@iabadvisors.com",
            hashed_password=pw_hash,
            user_type="B2B_ADVISOR",
            subscription_tier="professional",
            subscription_active=True,
            advisor_id=advisor.id,
            firm_id=firm.id,
            onboarding_completed=True,
            risk_profile_completed=True,
            features_enabled={
                "ai_analysis": True,
                "compliance_check": True,
                "statement_parsing": True,
                "household_management": True,
            },
        )
        session.add(user)
        await session.flush()
        print(f"Created user: {user.email}")

        # ── 4. Households ────────────────────────────────────────
        households_data = [
            {
                "name": "Wilson Household",
                "risk_tolerance": "moderate",
                "combined_aum": Decimal("54905.58"),
            },
            {
                "name": "Henderson Family",
                "risk_tolerance": "moderate",
                "combined_aum": Decimal("487230.00"),
            },
            {
                "name": "Martinez Retirement",
                "risk_tolerance": "conservative",
                "combined_aum": Decimal("312500.00"),
            },
            {
                "name": "Patel Household",
                "risk_tolerance": "conservative",
                "combined_aum": Decimal("198750.00"),
            },
        ]

        households = []
        for hh_data in households_data:
            hh = Household(
                name=hh_data["name"],
                risk_tolerance=hh_data["risk_tolerance"],
                combined_aum=hh_data["combined_aum"],
                firm_id=firm.id,
                advisor_id=advisor.id,
            )
            session.add(hh)
            households.append(hh)

        await session.flush()
        print(f"Created {len(households)} households")

        # ── 5. Clients ───────────────────────────────────────────
        clients_data = [
            {"first_name": "Nicole", "last_name": "Wilson", "email": "nicole@example.com",
             "household_idx": 0, "risk_tolerance": "moderate", "investment_objective": "growth",
             "state_of_residence": "TX", "annual_income_range": "$100k-$200k",
             "net_worth_range": "$250k-$500k"},
            {"first_name": "Mark", "last_name": "Henderson", "email": "mark.henderson@example.com",
             "household_idx": 1, "risk_tolerance": "moderate", "investment_objective": "balanced",
             "state_of_residence": "TX", "annual_income_range": "$200k-$500k",
             "net_worth_range": "$500k-$1M"},
            {"first_name": "Susan", "last_name": "Henderson", "email": "susan.henderson@example.com",
             "household_idx": 1, "risk_tolerance": "moderate", "investment_objective": "balanced",
             "state_of_residence": "TX"},
            {"first_name": "Carlos", "last_name": "Martinez", "email": "carlos.martinez@example.com",
             "household_idx": 2, "risk_tolerance": "conservative", "investment_objective": "income",
             "state_of_residence": "TX", "annual_income_range": "$75k-$100k",
             "net_worth_range": "$250k-$500k"},
            {"first_name": "Raj", "last_name": "Patel", "email": "raj.patel@example.com",
             "household_idx": 3, "risk_tolerance": "conservative", "investment_objective": "preservation",
             "state_of_residence": "TX", "annual_income_range": "$150k-$200k",
             "net_worth_range": "$250k-$500k"},
            {"first_name": "Priya", "last_name": "Patel", "email": "priya.patel@example.com",
             "household_idx": 3, "risk_tolerance": "conservative", "investment_objective": "preservation",
             "state_of_residence": "TX"},
        ]

        clients = []
        for c_data in clients_data:
            idx = c_data.pop("household_idx")
            client = Client(
                household_id=households[idx].id,
                advisor_id=advisor.id,
                firm_id=firm.id,
                first_name=c_data["first_name"],
                last_name=c_data["last_name"],
                email=c_data["email"],
                risk_tolerance=c_data.get("risk_tolerance"),
                investment_objective=c_data.get("investment_objective"),
                state_of_residence=c_data.get("state_of_residence"),
                annual_income_range=c_data.get("annual_income_range"),
                net_worth_range=c_data.get("net_worth_range"),
            )
            session.add(client)
            clients.append(client)

        await session.flush()

        # Set primary_contact_id on households
        households[0].primary_contact_id = clients[0].id  # Nicole Wilson
        households[1].primary_contact_id = clients[1].id  # Mark Henderson
        households[2].primary_contact_id = clients[3].id  # Carlos Martinez
        households[3].primary_contact_id = clients[4].id  # Raj Patel
        await session.flush()
        print(f"Created {len(clients)} clients")

        # ── 6. Accounts ──────────────────────────────────────────
        accounts_data = [
            # Wilson Household
            {"household_idx": 0, "client_idx": 0, "custodian": "Northwestern Mutual",
             "account_type": AccountType.VARIABLE_ANNUITY.value, "tax_type": TaxType.TAX_DEFERRED.value,
             "last_statement_value": Decimal("27891.34")},
            {"household_idx": 0, "client_idx": 0, "custodian": "Robinhood",
             "account_type": AccountType.BROKERAGE.value, "tax_type": TaxType.TAXABLE.value,
             "last_statement_value": Decimal("18234.56")},
            {"household_idx": 0, "client_idx": 0, "custodian": "E*TRADE/Morgan Stanley",
             "account_type": AccountType.IRA_401K.value, "tax_type": TaxType.TAX_DEFERRED.value,
             "last_statement_value": Decimal("8779.68")},
            # Henderson Family
            {"household_idx": 1, "client_idx": 1, "custodian": "Charles Schwab",
             "account_type": AccountType.JOINT.value, "tax_type": TaxType.TAXABLE.value,
             "last_statement_value": Decimal("245000.00")},
            {"household_idx": 1, "client_idx": 1, "custodian": "Fidelity",
             "account_type": AccountType.TRADITIONAL_IRA.value, "tax_type": TaxType.TAX_DEFERRED.value,
             "last_statement_value": Decimal("142230.00")},
            {"household_idx": 1, "client_idx": 2, "custodian": "Fidelity",
             "account_type": AccountType.ROTH_IRA.value, "tax_type": TaxType.TAX_FREE.value,
             "last_statement_value": Decimal("68000.00")},
            {"household_idx": 1, "client_idx": 1, "custodian": "Vanguard",
             "account_type": AccountType.PLAN_529.value, "tax_type": TaxType.TAX_FREE.value,
             "last_statement_value": Decimal("32000.00")},
            # Martinez Retirement
            {"household_idx": 2, "client_idx": 3, "custodian": "Charles Schwab",
             "account_type": AccountType.TRADITIONAL_IRA.value, "tax_type": TaxType.TAX_DEFERRED.value,
             "last_statement_value": Decimal("225000.00")},
            {"household_idx": 2, "client_idx": 3, "custodian": "Charles Schwab",
             "account_type": AccountType.ROTH_IRA.value, "tax_type": TaxType.TAX_FREE.value,
             "last_statement_value": Decimal("87500.00")},
            # Patel Household
            {"household_idx": 3, "client_idx": 4, "custodian": "Vanguard",
             "account_type": AccountType.BROKERAGE.value, "tax_type": TaxType.TAXABLE.value,
             "last_statement_value": Decimal("98750.00")},
            {"household_idx": 3, "client_idx": 4, "custodian": "Vanguard",
             "account_type": AccountType.TRADITIONAL_IRA.value, "tax_type": TaxType.TAX_DEFERRED.value,
             "last_statement_value": Decimal("65000.00")},
            {"household_idx": 3, "client_idx": 5, "custodian": "Vanguard",
             "account_type": AccountType.TRADITIONAL_IRA.value, "tax_type": TaxType.TAX_DEFERRED.value,
             "last_statement_value": Decimal("35000.00")},
        ]

        accounts = []
        for acc_data in accounts_data:
            hh_idx = acc_data.pop("household_idx")
            cl_idx = acc_data.pop("client_idx")
            acc = Account(
                household_id=households[hh_idx].id,
                client_id=clients[cl_idx].id,
                custodian=acc_data["custodian"],
                account_type=acc_data["account_type"],
                tax_type=acc_data["tax_type"],
                last_statement_value=acc_data["last_statement_value"],
                last_statement_date=date(2025, 1, 31),
            )
            session.add(acc)
            accounts.append(acc)

        await session.flush()
        print(f"Created {len(accounts)} accounts")

        # ── 7. Compliance Logs ────────────────────────────────────
        compliance_data = [
            {
                "rule_checked": "FINRA 2111 - Suitability",
                "result": ComplianceResult.FAIL.value,
                "severity": ComplianceSeverity.HIGH.value,
                "details": {"issue": "Concentration risk exceeds moderate risk tolerance",
                            "household": "Wilson Household", "threshold": "25%", "actual": "68%"},
                "client_idx": 0,
                "advisor_id": advisor.id,
                "prompt_version": "iim-v1.2.0",
            },
            {
                "rule_checked": "Reg BI - Best Interest",
                "result": ComplianceResult.WARNING.value,
                "severity": ComplianceSeverity.MEDIUM.value,
                "details": {"issue": "VA fee structure may not be in client best interest",
                            "fee_rate": "2.35%", "benchmark": "0.50%"},
                "client_idx": 0,
                "advisor_id": advisor.id,
                "prompt_version": "cim-v1.1.0",
            },
            {
                "rule_checked": "FINRA 2111 - Suitability",
                "result": ComplianceResult.PASS.value,
                "severity": ComplianceSeverity.LOW.value,
                "details": {"note": "All positions within suitability parameters"},
                "client_idx": 1,
                "advisor_id": advisor.id,
                "prompt_version": "iim-v1.2.0",
            },
            {
                "rule_checked": "FINRA 2330 - Variable Products",
                "result": ComplianceResult.PASS.value,
                "severity": ComplianceSeverity.LOW.value,
                "details": {"note": "Variable product suitability confirmed"},
                "client_idx": 3,
                "advisor_id": advisor.id,
                "prompt_version": "cim-v1.1.0",
            },
            {
                "rule_checked": "FINRA 2111 - Suitability",
                "result": ComplianceResult.PASS.value,
                "severity": ComplianceSeverity.LOW.value,
                "details": {"note": "Conservative allocation matches objectives"},
                "client_idx": 4,
                "advisor_id": advisor.id,
                "prompt_version": "iim-v1.2.0",
            },
        ]

        for log_data in compliance_data:
            cl_idx = log_data.pop("client_idx")
            log = ComplianceLog(
                rule_checked=log_data["rule_checked"],
                result=log_data["result"],
                severity=log_data["severity"],
                details=log_data["details"],
                client_id=clients[cl_idx].id,
                advisor_id=log_data["advisor_id"],
                prompt_version=log_data["prompt_version"],
            )
            session.add(log)

        await session.flush()
        print(f"Created {len(compliance_data)} compliance logs")

        # ── 8. Link user to household ─────────────────────────────
        user.household_id = households[0].id
        user.client_id = clients[0].id

        await session.commit()
        print("\n✅ Database seeded successfully!")
        print(f"   Login: leslie@iabadvisors.com / CreateWealth2026$")
        print(f"   Firm: {firm.firm_name}")
        print(f"   Households: {len(households)}")
        print(f"   Clients: {len(clients)}")
        print(f"   Accounts: {len(accounts)}")


if __name__ == "__main__":
    asyncio.run(seed_database())
