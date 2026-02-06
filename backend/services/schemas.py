"""Pydantic schemas for IIM, CIM, BIM outputs."""

from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer


def _serialize_decimal(v: Any) -> Any:
    """Serialize Decimal as string to preserve precision."""
    if isinstance(v, Decimal):
        return str(v)
    return v


class MonetaryModel(BaseModel):
    """Base for models with Decimal fields. Pydantic v2 serializes Decimal as string by default."""

    model_config = ConfigDict(populate_by_name=True)


# --- IIM Schemas ---


class AssetAllocationItem(MonetaryModel):
    asset_class: str
    target_pct: Optional[Decimal] = None
    actual_pct: Decimal
    value: Decimal
    drift: Optional[Decimal] = None


class ConcentrationViolation(MonetaryModel):
    type: str
    description: str
    severity: str
    current_pct: Decimal
    threshold_pct: Decimal
    suggestion: Optional[str] = None


class HouseholdAnalysis(MonetaryModel):
    household_id: str
    total_aum: Decimal
    account_count: int
    asset_allocation: list[AssetAllocationItem] = Field(default_factory=list)
    concentration_risks: list[ConcentrationViolation] = Field(default_factory=list)
    tax_optimization_opportunities: list[str] = Field(default_factory=list)
    summary: str = ""


class FeeProjection(MonetaryModel):
    year: int
    fees_paid: Decimal
    opportunity_cost: Decimal


class FeeImpactReport(MonetaryModel):
    account_id: str
    total_annual_fees: Decimal
    projected_10yr: Decimal
    projected_20yr: Decimal
    projected_30yr: Decimal
    low_cost_alternative_estimate: Decimal
    opportunity_cost_30yr: Decimal
    recommendations: list[str] = Field(default_factory=list)


class ConcentrationReport(MonetaryModel):
    household_id: str
    risk_score: int
    violations: list[ConcentrationViolation] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class RebalancingTrade(MonetaryModel):
    ticker: str
    action: str
    quantity: Decimal
    estimated_tax_impact: Optional[Decimal] = None
    rationale: Optional[str] = None


class RebalancingPlan(MonetaryModel):
    account_id: str
    trades: list[RebalancingTrade] = Field(default_factory=list)
    estimated_transaction_cost: Decimal = Decimal("0")
    tax_efficient: bool = True
    summary: str = ""


class TaxHarvestingOpportunity(MonetaryModel):
    ticker: str
    unrealized_loss: Decimal
    replacement_suggestion: Optional[str] = None
    estimated_savings: Optional[Decimal] = None
    wash_sale_risk: bool = False


class TaxHarvestingOpportunities(MonetaryModel):
    household_id: str
    opportunities: list[TaxHarvestingOpportunity] = Field(default_factory=list)
    total_estimated_savings: Decimal = Decimal("0")
    summary: str = ""


# --- CIM Schemas ---


# ComplianceStatus: "APPROVED" | "CONDITIONAL" | "REJECTED"


class ComplianceViolation(BaseModel):
    rule: str
    severity: str
    description: str
    remediation: Optional[str] = None


class RequiredDisclosure(BaseModel):
    id: str
    text: str
    required: bool = True


class CIMResponse(BaseModel):
    status: str
    violations: list[ComplianceViolation] = Field(default_factory=list)
    required_disclosures: list[RequiredDisclosure] = Field(default_factory=list)
    risk_labels: list[str] = Field(default_factory=list)
    modified_recommendation: Optional[dict] = None
    supervisory_review_required: bool = False
    audit_trail: dict = Field(default_factory=dict)


# --- BIM Schemas ---


# ToneType: REASSURING | EDUCATIONAL | CELEBRATORY | CAUTIONARY | MOTIVATIONAL


class BehavioralIntervention(BaseModel):
    bias_detected: str
    intervention: str
    priority: str = "MEDIUM"


class BIMResponse(BaseModel):
    message: str
    tone: str
    key_points: list[str] = Field(default_factory=list)
    educational_content: Optional[dict] = None
    behavioral_interventions: list[BehavioralIntervention] = Field(
        default_factory=list
    )
    call_to_action: Optional[str] = None
    follow_up_suggested: bool = False
    escalation_needed: bool = False
