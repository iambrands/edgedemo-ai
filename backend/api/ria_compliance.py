"""
RIA Compliance audit trail endpoints.
Returns pre-seeded Leslie Wilson data for demo purposes.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/v1/ria/compliance", tags=["RIA Compliance"])

# --- Response Models ---

class ComplianceLog(BaseModel):
    id: int
    date: str
    household: str
    rule: str
    result: str  # PASS, FAIL, WARNING
    detail: str
    promptVersion: str

# --- Pre-seeded Data ---

COMPLIANCE_LOGS = [
    {"id": 1, "date": "2026-02-04", "household": "Wilson", "rule": "FINRA 2111", "result": "FAIL", "detail": "Concentration risk exceeds moderate risk tolerance", "promptVersion": "iim-v1.2.0"},
    {"id": 2, "date": "2026-02-04", "household": "Wilson", "rule": "Reg BI", "result": "WARNING", "detail": "VA fee structure may not be in best interest — document rationale", "promptVersion": "cim-v1.1.0"},
    {"id": 3, "date": "2026-01-28", "household": "Henderson", "rule": "FINRA 2111", "result": "PASS", "detail": "All positions within suitability parameters", "promptVersion": "iim-v1.2.0"},
    {"id": 4, "date": "2026-01-30", "household": "Martinez", "rule": "FINRA 2330", "result": "PASS", "detail": "Variable product suitability confirmed", "promptVersion": "cim-v1.1.0"},
    {"id": 5, "date": "2026-02-01", "household": "Patel", "rule": "FINRA 2111", "result": "PASS", "detail": "Conservative allocation matches stated objectives", "promptVersion": "iim-v1.2.0"},
]

# --- Endpoints ---

@router.get("/audit-trail", response_model=List[ComplianceLog])
async def get_audit_trail(current_user: dict = Depends(get_current_user)):
    """Get compliance audit trail for all households."""
    return [ComplianceLog(**log) for log in COMPLIANCE_LOGS]
