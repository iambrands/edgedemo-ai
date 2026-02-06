"""
Compliance dashboard endpoints.
"""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/compliance", tags=["Compliance"])


class ComplianceMetrics(BaseModel):
    total_checks: int
    passed: int
    passed_pct: float
    warnings: int
    warnings_pct: float
    failed: int
    failed_pct: float


class PendingReview(BaseModel):
    id: str
    client_name: str
    household_id: str
    rule: str
    rule_description: str
    severity: str
    date: datetime
    details: str | None = None


class AuditLogEntry(BaseModel):
    id: str
    timestamp: datetime
    client_name: str
    rule: str
    result: str
    details: str
    advisor_id: str | None = None


class ComplianceDashboardData(BaseModel):
    metrics: ComplianceMetrics
    pending_reviews: list[PendingReview]
    recent_audit_log: list[AuditLogEntry]


@router.get("/dashboard", response_model=ComplianceDashboardData)
async def get_compliance_dashboard():
    """Get compliance dashboard data."""
    return ComplianceDashboardData(
        metrics=ComplianceMetrics(
            total_checks=1247,
            passed=1189,
            passed_pct=95.3,
            warnings=42,
            warnings_pct=3.4,
            failed=16,
            failed_pct=1.3,
        ),
        pending_reviews=[
            PendingReview(
                id="rev_001",
                client_name="Nicole Wilson",
                household_id="hh_001",
                rule="FINRA 2330",
                rule_description="Variable Annuity Suitability",
                severity="medium",
                date=datetime.now(),
                details="VA concentration exceeds recommended threshold",
            ),
            PendingReview(
                id="rev_002",
                client_name="Robert Johnson",
                household_id="hh_002",
                rule="Reg BI",
                rule_description="Best Interest Obligation",
                severity="low",
                date=datetime.now(),
                details="Alternative lower-cost options available",
            ),
            PendingReview(
                id="rev_003",
                client_name="David Chen",
                household_id="hh_003",
                rule="Concentration",
                rule_description="Single Position Limit",
                severity="high",
                date=datetime.now(),
                details="Single position exceeds 50% of portfolio",
            ),
        ],
        recent_audit_log=[
            AuditLogEntry(
                id="log_001",
                timestamp=datetime.now(),
                client_name="Nicole Wilson",
                rule="FINRA 2111",
                result="pass",
                details="Suitability check passed",
            ),
            AuditLogEntry(
                id="log_002",
                timestamp=datetime.now(),
                client_name="Robert Johnson",
                rule="FINRA 2111",
                result="pass",
                details="Suitability check passed",
            ),
            AuditLogEntry(
                id="log_003",
                timestamp=datetime.now(),
                client_name="David Chen",
                rule="Concentration",
                result="warning",
                details="Single position concentration flagged",
            ),
        ],
    )
