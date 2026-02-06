"""
Seed database with Leslie Wilson's pre-configured data.
Run: python backend/seed.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set default DATABASE_URL if not set
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/edgeai"

from datetime import datetime
import bcrypt
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from backend.models import (
    Base,
    get_engine,
    get_session_factory,
    User,
    Household,
    Account,
    Position,
    ComplianceLog,
)
from backend.models.enums import AccountType, TaxType


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
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("Database already seeded. Skipping...")
            return
        
        print("Seeding database...")
        
        # Create Leslie Wilson
        password_hash = bcrypt.hashpw("CreateWealth2026$".encode(), bcrypt.gensalt()).decode()
        leslie = User(
            email="leslie@iabadvisors.com",
            password_hash=password_hash,
            first_name="Leslie",
            last_name="Wilson",
            role="ria",
            firm="IAB Advisors, Inc.",
            crd="7891234",
            state="TX",
            licenses=["Series 6", "Series 7", "Series 63", "Series 65 (pending)"],
        )
        session.add(leslie)
        await session.flush()
        
        print(f"Created user: {leslie.email}")
        
        # Create Households
        households_data = [
            {
                "name": "Wilson Household",
                "members": ["Nicole Wilson"],
                "risk_score": 72,
                "status": "attention",
                "risk_tolerance": "moderate",
                "investment_objective": "growth",
                "time_horizon": "long",
            },
            {
                "name": "Henderson Family",
                "members": ["Mark Henderson", "Susan Henderson"],
                "risk_score": 45,
                "status": "good",
                "risk_tolerance": "moderate",
                "investment_objective": "balanced",
                "time_horizon": "long",
            },
            {
                "name": "Martinez Retirement",
                "members": ["Carlos Martinez"],
                "risk_score": 58,
                "status": "rebalance",
                "risk_tolerance": "conservative",
                "investment_objective": "income",
                "time_horizon": "medium",
            },
            {
                "name": "Patel Household",
                "members": ["Raj Patel", "Priya Patel"],
                "risk_score": 35,
                "status": "good",
                "risk_tolerance": "conservative",
                "investment_objective": "preservation",
                "time_horizon": "long",
            },
        ]
        
        households = []
        for hh_data in households_data:
            hh = Household(
                advisor_id=leslie.id,
                name=hh_data["name"],
                members=hh_data["members"],
                risk_score=hh_data["risk_score"],
                status=hh_data["status"],
                risk_tolerance=hh_data["risk_tolerance"],
                investment_objective=hh_data["investment_objective"],
                time_horizon=hh_data["time_horizon"],
            )
            session.add(hh)
            households.append(hh)
        
        await session.flush()
        print(f"Created {len(households)} households")
        
        # Create Accounts
        accounts_data = [
            # Wilson Household
            {
                "household_idx": 0,
                "name": "NW Mutual VA IRA",
                "custodian": "Northwestern Mutual",
                "account_type": "ira",
                "tax_type": "tax_deferred",
                "balance": 27891.34,
                "fee_percent": 2.35,
                "status": "high_fee",
            },
            {
                "household_idx": 0,
                "name": "Robinhood Taxable",
                "custodian": "Robinhood",
                "account_type": "individual",
                "tax_type": "taxable",
                "balance": 18234.56,
                "fee_percent": 0.0,
                "status": "concentrated",
            },
            {
                "household_idx": 0,
                "name": "E*TRADE Employer Plan",
                "custodian": "E*TRADE/Morgan Stanley",
                "account_type": "401k",
                "tax_type": "tax_deferred",
                "balance": 8779.68,
                "fee_percent": 0.45,
                "status": "good",
            },
            # Henderson Family
            {
                "household_idx": 1,
                "name": "Schwab Joint Account",
                "custodian": "Charles Schwab",
                "account_type": "joint",
                "tax_type": "taxable",
                "balance": 245000.0,
                "fee_percent": 0.12,
                "status": "good",
            },
            {
                "household_idx": 1,
                "name": "Fidelity IRA - Mark",
                "custodian": "Fidelity",
                "account_type": "ira",
                "tax_type": "tax_deferred",
                "balance": 142230.0,
                "fee_percent": 0.08,
                "status": "good",
            },
            {
                "household_idx": 1,
                "name": "Fidelity Roth - Susan",
                "custodian": "Fidelity",
                "account_type": "roth_ira",
                "tax_type": "tax_free",
                "balance": 68000.0,
                "fee_percent": 0.10,
                "status": "good",
            },
            {
                "household_idx": 1,
                "name": "529 College Fund",
                "custodian": "Vanguard",
                "account_type": "529",
                "tax_type": "tax_free",
                "balance": 32000.0,
                "fee_percent": 0.15,
                "status": "good",
            },
            # Martinez Retirement
            {
                "household_idx": 2,
                "name": "Schwab Rollover IRA",
                "custodian": "Charles Schwab",
                "account_type": "ira",
                "tax_type": "tax_deferred",
                "balance": 225000.0,
                "fee_percent": 0.10,
                "status": "rebalance",
            },
            {
                "household_idx": 2,
                "name": "Schwab Roth IRA",
                "custodian": "Charles Schwab",
                "account_type": "roth_ira",
                "tax_type": "tax_free",
                "balance": 87500.0,
                "fee_percent": 0.10,
                "status": "good",
            },
            # Patel Household
            {
                "household_idx": 3,
                "name": "Vanguard Brokerage",
                "custodian": "Vanguard",
                "account_type": "individual",
                "tax_type": "taxable",
                "balance": 98750.0,
                "fee_percent": 0.05,
                "status": "good",
            },
            {
                "household_idx": 3,
                "name": "Vanguard IRA - Raj",
                "custodian": "Vanguard",
                "account_type": "ira",
                "tax_type": "tax_deferred",
                "balance": 65000.0,
                "fee_percent": 0.05,
                "status": "good",
            },
            {
                "household_idx": 3,
                "name": "Vanguard IRA - Priya",
                "custodian": "Vanguard",
                "account_type": "ira",
                "tax_type": "tax_deferred",
                "balance": 35000.0,
                "fee_percent": 0.05,
                "status": "good",
            },
        ]
        
        accounts = []
        for acc_data in accounts_data:
            idx = acc_data.pop("household_idx")
            acc = Account(
                household_id=households[idx].id,
                name=acc_data["name"],
                custodian=acc_data["custodian"],
                account_type=acc_data["account_type"],
                tax_type=acc_data["tax_type"],
                balance=acc_data["balance"],
                fee_percent=acc_data["fee_percent"],
                status=acc_data["status"],
            )
            session.add(acc)
            accounts.append(acc)
        
        await session.flush()
        print(f"Created {len(accounts)} accounts")
        
        # Create Compliance Logs
        compliance_data = [
            {
                "household_idx": 0,
                "rule": "FINRA 2111",
                "result": "FAIL",
                "detail": "Concentration risk exceeds moderate risk tolerance",
                "prompt_version": "iim-v1.2.0",
            },
            {
                "household_idx": 0,
                "rule": "Reg BI",
                "result": "WARNING",
                "detail": "VA fee structure may not be in best interest",
                "prompt_version": "cim-v1.1.0",
            },
            {
                "household_idx": 1,
                "rule": "FINRA 2111",
                "result": "PASS",
                "detail": "All positions within suitability parameters",
                "prompt_version": "iim-v1.2.0",
            },
            {
                "household_idx": 2,
                "rule": "FINRA 2330",
                "result": "PASS",
                "detail": "Variable product suitability confirmed",
                "prompt_version": "cim-v1.1.0",
            },
            {
                "household_idx": 3,
                "rule": "FINRA 2111",
                "result": "PASS",
                "detail": "Conservative allocation matches objectives",
                "prompt_version": "iim-v1.2.0",
            },
        ]
        
        for log_data in compliance_data:
            idx = log_data.pop("household_idx")
            log = ComplianceLog(
                household_id=households[idx].id,
                rule=log_data["rule"],
                result=log_data["result"],
                detail=log_data["detail"],
                prompt_version=log_data["prompt_version"],
            )
            session.add(log)
        
        await session.flush()
        print(f"Created {len(compliance_data)} compliance logs")
        
        await session.commit()
        print("\nDatabase seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
