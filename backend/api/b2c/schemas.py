"""B2C response schemas — frontend contract."""

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AccountSummary(BaseModel):
    id: str
    custodian: str
    account_type: str
    total_value: Decimal
    last_statement_date: Optional[str] = None


class AllocationBreakdown(BaseModel):
    asset_class: str
    pct: Decimal
    value: Decimal


class FeeImpactSummary(BaseModel):
    annual_cost: Decimal
    ten_year_impact: Decimal
    thirty_year_impact: Decimal
    potential_savings: Decimal
    highest_fee_account: Optional[str] = None
    highest_fee_rate: Optional[Decimal] = None
    effective_fee_rate_pct: Optional[Decimal] = None


class FeeBenchmark(BaseModel):
    label: str
    rate_pct: Decimal
    annual_cost_at_aum: Decimal


class NetWorthPoint(BaseModel):
    date: str
    value: Decimal


class RiskProfileSummary(BaseModel):
    risk_number: int
    risk_tolerance: str
    label: str


class Alert(BaseModel):
    type: str
    severity: str
    message: str
    action: str
    gated: bool
    upgrade_tier: Optional[str] = None


class DashboardResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    total_aum: Decimal
    accounts: list[AccountSummary]
    allocation: list[AllocationBreakdown]
    fee_impact_summary: Optional[FeeImpactSummary] = None
    fee_benchmarks: list[FeeBenchmark] = []
    net_worth_history: list[NetWorthPoint] = []
    risk_profile: Optional[RiskProfileSummary] = None
    alerts: list[Alert]
    ai_chat_remaining: int
    subscription_tier: str
