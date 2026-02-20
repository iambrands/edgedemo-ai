"""
Enhanced onboarding flow for RIA migration.
Handles rollovers, tech stack migration, pain points assessment, and bulk import.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/onboarding", tags=["Onboarding"])


class OnboardingStep(str, Enum):
    FIRM_INFO = "firm_info"
    TECH_STACK = "tech_stack"
    PAIN_POINTS = "pain_points"
    MIGRATION_PLAN = "migration_plan"
    HOUSEHOLD_SETUP = "household_setup"
    ACCOUNT_LINKING = "account_linking"
    ROLLOVER_SETUP = "rollover_setup"
    COMPLIANCE_CONFIG = "compliance_config"
    REVIEW = "review"


class TechStackInfo(BaseModel):
    current_crm: Optional[str] = Field(None, description="Current CRM (e.g., Salesforce, Redtail, Wealthbox)")
    current_portfolio_mgmt: Optional[str] = Field(None, description="Portfolio management (e.g., Orion, Black Diamond)")
    current_planning: Optional[str] = Field(None, description="Financial planning (e.g., MoneyGuidePro, eMoney)")
    current_reporting: Optional[str] = Field(None, description="Reporting tool")
    custodians: List[str] = Field(default=[], description="Primary custodians (Schwab, Fidelity, etc.)")
    data_feeds: List[str] = Field(default=[], description="Active data feeds")
    integrations_needed: List[str] = Field(default=[], description="Required integrations")


class PainPoint(BaseModel):
    category: str
    description: str
    severity: str
    current_workaround: Optional[str] = None


class FirmOnboarding(BaseModel):
    firm_name: str
    aum: float
    num_advisors: int
    num_households: int
    num_accounts: int
    primary_contact_name: str
    primary_contact_email: str
    tech_stack: Optional[TechStackInfo] = None
    pain_points: List[PainPoint] = []
    migration_priority: Optional[str] = None
    rollover_volume_monthly: Optional[int] = None
    compliance_requirements: List[str] = []


class OnboardingProgress(BaseModel):
    firm_id: str
    current_step: OnboardingStep
    completed_steps: List[OnboardingStep]
    started_at: datetime
    estimated_completion: Optional[datetime] = None
    blockers: List[str] = []


ONBOARDING_SESSIONS: dict = {}


@router.post("/start")
async def start_onboarding(firm: FirmOnboarding):
    """Start new firm onboarding process."""
    firm_id = str(uuid.uuid4())
    ONBOARDING_SESSIONS[firm_id] = {
        "firm": firm.dict(),
        "progress": OnboardingProgress(
            firm_id=firm_id,
            current_step=OnboardingStep.FIRM_INFO,
            completed_steps=[],
            started_at=datetime.utcnow(),
        ).dict(),
    }
    return {
        "firm_id": firm_id,
        "status": "started",
        "next_step": OnboardingStep.TECH_STACK,
        "message": f"Onboarding initiated for {firm.firm_name}",
    }


@router.post("/{firm_id}/tech-stack")
async def update_tech_stack(firm_id: str, tech_stack: TechStackInfo):
    """Update firm's current tech stack for migration planning."""
    if firm_id not in ONBOARDING_SESSIONS:
        return {"error": "Firm not found"}

    ONBOARDING_SESSIONS[firm_id]["firm"]["tech_stack"] = tech_stack.dict()
    ONBOARDING_SESSIONS[firm_id]["progress"]["completed_steps"].append(OnboardingStep.TECH_STACK)
    ONBOARDING_SESSIONS[firm_id]["progress"]["current_step"] = OnboardingStep.PAIN_POINTS

    recommendations = []
    if tech_stack.current_crm:
        recommendations.append(f"CRM data migration from {tech_stack.current_crm} -- estimated 2-3 days")
    if tech_stack.current_portfolio_mgmt:
        recommendations.append(f"Portfolio data import from {tech_stack.current_portfolio_mgmt} -- automated sync available")

    return {
        "status": "updated",
        "next_step": OnboardingStep.PAIN_POINTS,
        "migration_recommendations": recommendations,
    }


@router.post("/{firm_id}/pain-points")
async def capture_pain_points(firm_id: str, pain_points: List[PainPoint]):
    """Capture firm's primary pain points for customized demo."""
    if firm_id not in ONBOARDING_SESSIONS:
        return {"error": "Firm not found"}

    ONBOARDING_SESSIONS[firm_id]["firm"]["pain_points"] = [p.dict() for p in pain_points]
    ONBOARDING_SESSIONS[firm_id]["progress"]["completed_steps"].append(OnboardingStep.PAIN_POINTS)
    ONBOARDING_SESSIONS[firm_id]["progress"]["current_step"] = OnboardingStep.MIGRATION_PLAN

    solution_map = {
        "onboarding": "Automated statement parsing reduces client onboarding from 2 hours to 15 minutes",
        "compliance": "Real-time compliance monitoring identifies potential issues before they become violations",
        "efficiency": "Edge automates portfolio reviews and generates client-ready reports",
        "reporting": "Custom report builder with scheduled delivery reduces manual report generation",
        "cost": "Consolidated platform eliminates the need for multiple vendor subscriptions",
    }
    solutions = [
        {"pain_point": pp.description, "solution": solution_map.get(pp.category, "Edge can help streamline this workflow")}
        for pp in pain_points
    ]

    return {
        "status": "captured",
        "pain_points_count": len(pain_points),
        "proposed_solutions": solutions,
        "next_step": OnboardingStep.MIGRATION_PLAN,
    }


@router.get("/{firm_id}/migration-plan")
async def get_migration_plan(firm_id: str):
    """Generate customized migration plan based on firm's tech stack and pain points."""
    if firm_id not in ONBOARDING_SESSIONS:
        return {"error": "Firm not found"}

    firm = ONBOARDING_SESSIONS[firm_id]["firm"]

    return {
        "firm_name": firm["firm_name"],
        "aum": firm["aum"],
        "migration_phases": [
            {"phase": 1, "name": "Data Migration", "duration": "Week 1", "tasks": [
                "Export client data from existing CRM",
                "Import household and account structures",
                "Validate data integrity",
            ]},
            {"phase": 2, "name": "Statement Processing", "duration": "Week 1-2", "tasks": [
                "Upload historical statements",
                "AI parsing and position extraction",
                "Fee analysis and compliance baseline",
            ]},
            {"phase": 3, "name": "Workflow Setup", "duration": "Week 2", "tasks": [
                "Configure compliance rules",
                "Set up alert thresholds",
                "Customize report templates",
            ]},
            {"phase": 4, "name": "Training & Go-Live", "duration": "Week 3", "tasks": [
                "Advisor training sessions",
                "Parallel run with existing system",
                "Full cutover",
            ]},
        ],
        "estimated_timeline": "3 weeks",
        "operational_savings": f"${int(firm['aum'] * 0.001 * 12):,}/year estimated",
    }


@router.post("/{firm_id}/rollover-config")
async def configure_rollovers(firm_id: str, config: dict):
    """Configure rollover workflow automation."""
    return {
        "status": "configured",
        "rollover_workflow": {
            "supported_plan_types": [
                "401(k)", "403(b)", "457(b)", "TSP", "Pension",
                "Traditional IRA", "Roth IRA", "SEP IRA", "SIMPLE IRA", "Inherited IRA",
            ],
            "steps": [
                "Client initiates rollover request",
                "Edge extracts account details from uploaded statement",
                "Auto-generates transfer paperwork",
                "Compliance pre-check for suitability",
                "Advisor review and approval",
                "Electronic submission to custodian",
            ],
            "estimated_time": "Same-day processing",
            "current_industry_avg": "5-7 business days",
        },
    }


# --------------- Bulk Import Endpoints ---------------

class BulkImportRow(BaseModel):
    name: str
    email: str
    account_type: str
    custodian: str
    approximate_value: float
    risk_tolerance: str


class BulkImportValidation(BaseModel):
    total_rows: int
    valid_rows: int
    error_rows: int
    errors: list
    preview: list


VALID_ACCOUNT_TYPES = {
    "brokerage", "traditional_ira", "roth_ira", "sep_ira", "simple_ira",
    "inherited_ira", "401k", "403b", "457b", "tsp", "pension_rollover",
    "variable_annuity", "joint", "trust", "custodial", "529",
}

VALID_RISK_TOLERANCES = {"conservative", "moderate", "moderate_aggressive", "aggressive"}


@router.post("/bulk-import/validate")
async def validate_bulk_import(rows: List[BulkImportRow]):
    """Validate a batch of client import rows and return a preview with errors."""
    errors = []
    valid = []
    for i, row in enumerate(rows):
        row_errors = []
        if not row.name or len(row.name.strip()) < 2:
            row_errors.append("Name is required (min 2 characters)")
        if not row.email or "@" not in row.email:
            row_errors.append("Valid email is required")
        if row.account_type.lower().replace(" ", "_") not in VALID_ACCOUNT_TYPES:
            row_errors.append(f"Unknown account type: {row.account_type}")
        if row.approximate_value < 0:
            row_errors.append("Value must be non-negative")
        if row.risk_tolerance.lower().replace(" ", "_") not in VALID_RISK_TOLERANCES:
            row_errors.append(f"Unknown risk tolerance: {row.risk_tolerance}")

        if row_errors:
            errors.append({"row": i + 1, "data": row.dict(), "errors": row_errors})
        else:
            valid.append(row.dict())

    return BulkImportValidation(
        total_rows=len(rows),
        valid_rows=len(valid),
        error_rows=len(errors),
        errors=errors,
        preview=valid[:10],
    )


@router.post("/bulk-import/execute")
async def execute_bulk_import(rows: List[BulkImportRow]):
    """Process validated rows and create client records."""
    created = []
    for row in rows:
        created.append({
            "id": str(uuid.uuid4()),
            "name": row.name,
            "email": row.email,
            "account_type": row.account_type,
            "custodian": row.custodian,
            "approximate_value": row.approximate_value,
            "risk_tolerance": row.risk_tolerance,
            "status": "imported",
            "created_at": datetime.utcnow().isoformat(),
        })
    return {
        "status": "completed",
        "imported_count": len(created),
        "clients": created,
    }
