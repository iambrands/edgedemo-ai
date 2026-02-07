"""
Compliance Co-Pilot endpoints: Dashboard metrics, Alerts, Tasks, Audit trail.

These endpoints serve mock data for the demo. In production they would
query real database tables via ComplianceService.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compliance", tags=["Compliance"])


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _now():
    return datetime.utcnow()


# ═══════════════════════════════════════════════════════════════════════════
# DEMO DATA
# ═══════════════════════════════════════════════════════════════════════════

def _demo_alerts():
    now = _now()
    return [
        {
            "id": "al100000-0000-4000-8000-000000000001",
            "title": "NVDA concentration at 47% in Robinhood account",
            "description": "Single position exceeds 40% concentration threshold. Consider rebalancing to reduce idiosyncratic risk.",
            "category": "concentration",
            "severity": "high",
            "status": "open",
            "client_name": "Sarah Johnson",
            "ai_analysis": {"recommendation": "Sell 20% of NVDA position and redeploy into VTI or sector ETFs", "confidence": 0.92},
            "due_date": (now + timedelta(days=7)).isoformat(),
            "resolved_at": None,
            "resolution_notes": None,
            "created_at": (now - timedelta(days=2)).isoformat(),
            "comments": [],
        },
        {
            "id": "al100000-0000-4000-8000-000000000002",
            "title": "NW Mutual VA total fees at 2.35%",
            "description": "Variable annuity fees exceed recommended threshold. Consider 1035 exchange after surrender period ends.",
            "category": "suitability",
            "severity": "medium",
            "status": "under_review",
            "client_name": "John Smith",
            "ai_analysis": {"recommendation": "Wait for surrender period to end (6 months), then 1035 exchange to low-cost VA", "confidence": 0.85},
            "due_date": (now + timedelta(days=14)).isoformat(),
            "resolved_at": None,
            "resolution_notes": None,
            "created_at": (now - timedelta(days=5)).isoformat(),
            "comments": [
                {"id": "cm-001", "user_name": "Demo Advisor", "content": "Reviewing this with compliance team.", "created_at": (now - timedelta(hours=6)).isoformat()},
            ],
        },
        {
            "id": "al100000-0000-4000-8000-000000000003",
            "title": "Allocation drift >5% from IPS targets",
            "description": "Rollover IRA equity allocation has drifted 7.2% above target. Rebalancing required per IPS guidelines.",
            "category": "trading",
            "severity": "medium",
            "status": "open",
            "client_name": "Michael Chen",
            "ai_analysis": {"recommendation": "Rebalance by selling equity positions and buying fixed income to return to 60/40 target", "confidence": 0.88},
            "due_date": (now + timedelta(days=5)).isoformat(),
            "resolved_at": None,
            "resolution_notes": None,
            "created_at": (now - timedelta(days=1)).isoformat(),
            "comments": [],
        },
        {
            "id": "al100000-0000-4000-8000-000000000004",
            "title": "Missing beneficiary designation on Roth IRA",
            "description": "Roth IRA account opened 30 days ago still lacks beneficiary designation.",
            "category": "documentation",
            "severity": "low",
            "status": "resolved",
            "client_name": "John Smith",
            "ai_analysis": None,
            "due_date": (now - timedelta(days=3)).isoformat(),
            "resolved_at": (now - timedelta(days=1)).isoformat(),
            "resolution_notes": "Beneficiary form signed and submitted to custodian.",
            "created_at": (now - timedelta(days=10)).isoformat(),
            "comments": [],
        },
        {
            "id": "al100000-0000-4000-8000-000000000005",
            "title": "Quarterly compliance report overdue",
            "description": "Q4 compliance self-assessment report has not been filed. Regulatory deadline approaching.",
            "category": "regulatory",
            "severity": "critical",
            "status": "escalated",
            "client_name": None,
            "ai_analysis": {"recommendation": "File immediately — SEC expects timely self-assessment filings", "confidence": 0.95},
            "due_date": (now + timedelta(days=2)).isoformat(),
            "resolved_at": None,
            "resolution_notes": None,
            "created_at": (now - timedelta(hours=12)).isoformat(),
            "comments": [],
        },
    ]


def _demo_tasks():
    now = _now()
    return [
        {
            "id": "ct100000-0000-4000-8000-000000000001",
            "title": "Annual ADV Part 2A/2B Update",
            "description": "Review and file Form ADV amendments by March 31 deadline.",
            "category": "regulatory",
            "priority": "high",
            "status": "in_progress",
            "assigned_to_name": "Demo Advisor",
            "due_date": (now + timedelta(days=30)).isoformat(),
            "completed_at": None,
            "created_at": (now - timedelta(days=15)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000002",
            "title": "Client Risk Tolerance Reviews",
            "description": "Complete quarterly suitability reviews for all active households.",
            "category": "client_review",
            "priority": "medium",
            "status": "pending",
            "assigned_to_name": "Demo Advisor",
            "due_date": (now + timedelta(days=14)).isoformat(),
            "completed_at": None,
            "created_at": (now - timedelta(days=5)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000003",
            "title": "Cybersecurity Incident Response Test",
            "description": "Run annual tabletop exercise for cybersecurity incident response plan.",
            "category": "training",
            "priority": "medium",
            "status": "pending",
            "assigned_to_name": "Demo Advisor",
            "due_date": (now + timedelta(days=45)).isoformat(),
            "completed_at": None,
            "created_at": (now - timedelta(days=2)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000004",
            "title": "Marketing Material Compliance Review",
            "description": "Review new website content and social media posts for compliance.",
            "category": "documentation",
            "priority": "low",
            "status": "completed",
            "assigned_to_name": "Demo Advisor",
            "due_date": (now - timedelta(days=5)).isoformat(),
            "completed_at": (now - timedelta(days=7)).isoformat(),
            "created_at": (now - timedelta(days=20)).isoformat(),
        },
        {
            "id": "ct100000-0000-4000-8000-000000000005",
            "title": "Anti-Money Laundering Training",
            "description": "Complete annual AML/KYC training and certification.",
            "category": "training",
            "priority": "urgent",
            "status": "pending",
            "assigned_to_name": "Demo Advisor",
            "due_date": (now - timedelta(days=2)).isoformat(),
            "completed_at": None,
            "created_at": (now - timedelta(days=30)).isoformat(),
        },
    ]


def _demo_audit_log():
    now = _now()
    return [
        {"id": "alog-001", "action": "alert_created", "entity_type": "compliance_alert", "details": {"title": "NVDA concentration at 47%", "severity": "high"}, "created_at": (now - timedelta(days=2)).isoformat()},
        {"id": "alog-002", "action": "document_approved", "entity_type": "compliance_document", "details": {"document": "ADV Part 2B", "version": 3}, "created_at": (now - timedelta(days=3)).isoformat()},
        {"id": "alog-003", "action": "task_completed", "entity_type": "compliance_task", "details": {"title": "Marketing Material Compliance Review"}, "created_at": (now - timedelta(days=7)).isoformat()},
        {"id": "alog-004", "action": "alert_status_changed", "entity_type": "compliance_alert", "details": {"alert": "Missing beneficiary designation", "old_status": "open", "new_status": "resolved"}, "created_at": (now - timedelta(days=1)).isoformat()},
        {"id": "alog-005", "action": "suitability_check_passed", "entity_type": "compliance_check", "details": {"client": "Sarah Johnson", "rule": "FINRA 2111"}, "created_at": (now - timedelta(hours=6)).isoformat()},
        {"id": "alog-006", "action": "concentration_warning", "entity_type": "compliance_check", "details": {"client": "Sarah Johnson", "position": "NVDA", "concentration": "47%"}, "created_at": (now - timedelta(hours=6)).isoformat()},
        {"id": "alog-007", "action": "document_generated", "entity_type": "compliance_document", "details": {"document": "Form CRS", "ai_model": "claude-3.5-sonnet"}, "created_at": (now - timedelta(days=5)).isoformat()},
        {"id": "alog-008", "action": "login", "entity_type": "session", "details": {"method": "password", "ip": "192.168.1.100"}, "created_at": (now - timedelta(hours=2)).isoformat()},
    ]


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
async def get_compliance_dashboard():
    """Get compliance dashboard metrics (new Co-Pilot format)."""
    alerts = _demo_alerts()
    tasks = _demo_tasks()

    open_alerts = [a for a in alerts if a["status"] in ("open", "under_review", "escalated")]
    critical = sum(1 for a in open_alerts if a["severity"] == "critical")
    high = sum(1 for a in open_alerts if a["severity"] == "high")
    medium = sum(1 for a in open_alerts if a["severity"] == "medium")
    low = sum(1 for a in open_alerts if a["severity"] == "low")

    overdue_tasks = [
        t for t in tasks
        if t["status"] in ("pending", "in_progress")
        and t["due_date"] < _now().isoformat()
    ]

    score = max(0, min(100, 100 - critical * 15 - high * 8 - len(overdue_tasks) * 5))

    return {
        "compliance_score": score,
        "alerts": {
            "total": len(alerts),
            "open": sum(1 for a in alerts if a["status"] == "open"),
            "under_review": sum(1 for a in alerts if a["status"] == "under_review"),
            "escalated": sum(1 for a in alerts if a["status"] == "escalated"),
            "resolved": sum(1 for a in alerts if a["status"] == "resolved"),
            "by_severity": {
                "critical": critical,
                "high": high,
                "medium": medium,
                "low": low,
            },
        },
        "tasks": {
            "total": len(tasks),
            "pending": sum(1 for t in tasks if t["status"] == "pending"),
            "in_progress": sum(1 for t in tasks if t["status"] == "in_progress"),
            "completed": sum(1 for t in tasks if t["status"] == "completed"),
            "overdue": len(overdue_tasks),
        },
        "pending_reviews": 3,
    }


# ═══════════════════════════════════════════════════════════════════════════
# ALERTS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/alerts")
async def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
):
    """List compliance alerts with optional filters."""
    items = _demo_alerts()
    if status:
        items = [a for a in items if a["status"] == status]
    if severity:
        items = [a for a in items if a["severity"] == severity]
    return items


@router.get("/alerts/{alert_id}")
async def get_alert(alert_id: str):
    """Get alert detail with comments."""
    for alert in _demo_alerts():
        if alert["id"] == alert_id:
            return alert
    return {"detail": "Alert not found"}


@router.patch("/alerts/{alert_id}/status")
async def update_alert_status(alert_id: str):
    """Update alert status (demo — returns the alert unchanged)."""
    for alert in _demo_alerts():
        if alert["id"] == alert_id:
            return alert
    return {"detail": "Alert not found"}


@router.post("/alerts/{alert_id}/comments")
async def add_alert_comment(alert_id: str):
    """Add comment to alert (demo)."""
    return {
        "id": "cm-new-001",
        "user_name": "Demo Advisor",
        "content": "Comment added.",
        "created_at": _now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════
# TASKS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/tasks")
async def list_tasks(
    status: Optional[str] = Query(None),
    include_completed: bool = Query(False),
):
    """List compliance tasks."""
    items = _demo_tasks()
    if status:
        items = [t for t in items if t["status"] == status]
    if not include_completed:
        items = [t for t in items if t["status"] != "completed"]
    return items


@router.post("/tasks")
async def create_task():
    """Create a new task (demo — returns first task)."""
    return _demo_tasks()[0]


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str):
    """Mark task completed (demo)."""
    for task in _demo_tasks():
        if task["id"] == task_id:
            task["status"] = "completed"
            task["completed_at"] = _now().isoformat()
            return task
    return {"detail": "Task not found"}


# ═══════════════════════════════════════════════════════════════════════════
# AUDIT TRAIL  (replaces old format with new Co-Pilot format)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/audit-trail")
async def get_audit_trail_copilot():
    """Get compliance audit trail in Co-Pilot format."""
    return _demo_audit_log()
