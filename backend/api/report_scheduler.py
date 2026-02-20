"""
Report Scheduler API.
Automated quarterly/monthly report generation and delivery for RIA firms.
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/report-scheduler", tags=["Report Scheduler"])


class ScheduleCreate(BaseModel):
    template_id: str
    frequency: str  # monthly, quarterly, annual
    client_selection: str  # all, specific
    client_ids: List[str] = []
    delivery_method: str  # email, portal, both
    enabled: bool = True


MOCK_SCHEDULES = [
    {
        "id": "sched-1",
        "template_id": "quarterly",
        "template_name": "Quarterly Performance Report",
        "frequency": "quarterly",
        "client_selection": "all",
        "client_count": 47,
        "delivery_method": "both",
        "enabled": True,
        "next_run": (datetime.utcnow() + timedelta(days=22)).isoformat(),
        "last_run": (datetime.utcnow() - timedelta(days=68)).isoformat(),
        "last_run_status": "completed",
        "last_run_delivered": 47,
        "created_at": (datetime.utcnow() - timedelta(days=180)).isoformat(),
    },
    {
        "id": "sched-2",
        "template_id": "compliance",
        "template_name": "Monthly Compliance Summary",
        "frequency": "monthly",
        "client_selection": "all",
        "client_count": 47,
        "delivery_method": "email",
        "enabled": True,
        "next_run": (datetime.utcnow() + timedelta(days=5)).isoformat(),
        "last_run": (datetime.utcnow() - timedelta(days=25)).isoformat(),
        "last_run_status": "completed",
        "last_run_delivered": 47,
        "created_at": (datetime.utcnow() - timedelta(days=120)).isoformat(),
    },
    {
        "id": "sched-3",
        "template_id": "tax",
        "template_name": "Annual Tax Summary",
        "frequency": "annual",
        "client_selection": "all",
        "client_count": 47,
        "delivery_method": "portal",
        "enabled": True,
        "next_run": (datetime.utcnow() + timedelta(days=300)).isoformat(),
        "last_run": (datetime.utcnow() - timedelta(days=65)).isoformat(),
        "last_run_status": "completed",
        "last_run_delivered": 45,
        "created_at": (datetime.utcnow() - timedelta(days=365)).isoformat(),
    },
]

MOCK_HISTORY = [
    {"id": "run-1", "schedule_id": "sched-1", "template_name": "Quarterly Performance Report", "run_at": (datetime.utcnow() - timedelta(days=68)).isoformat(), "status": "completed", "total_clients": 47, "delivered": 47, "failed": 0, "duration_seconds": 142},
    {"id": "run-2", "schedule_id": "sched-2", "template_name": "Monthly Compliance Summary", "run_at": (datetime.utcnow() - timedelta(days=25)).isoformat(), "status": "completed", "total_clients": 47, "delivered": 47, "failed": 0, "duration_seconds": 98},
    {"id": "run-3", "schedule_id": "sched-1", "template_name": "Quarterly Performance Report", "run_at": (datetime.utcnow() - timedelta(days=158)).isoformat(), "status": "completed", "total_clients": 45, "delivered": 44, "failed": 1, "duration_seconds": 138},
    {"id": "run-4", "schedule_id": "sched-3", "template_name": "Annual Tax Summary", "run_at": (datetime.utcnow() - timedelta(days=65)).isoformat(), "status": "completed", "total_clients": 47, "delivered": 45, "failed": 2, "duration_seconds": 210},
]


@router.get("/schedules")
async def list_schedules():
    """List all scheduled report jobs."""
    return {"schedules": MOCK_SCHEDULES}


@router.post("/schedules")
async def create_schedule(schedule: ScheduleCreate):
    """Create a new report schedule."""
    new = {
        "id": f"sched-{uuid.uuid4().hex[:6]}",
        "template_id": schedule.template_id,
        "template_name": f"Custom - {schedule.template_id}",
        "frequency": schedule.frequency,
        "client_selection": schedule.client_selection,
        "client_count": len(schedule.client_ids) if schedule.client_ids else 47,
        "delivery_method": schedule.delivery_method,
        "enabled": schedule.enabled,
        "next_run": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "last_run": None,
        "last_run_status": None,
        "last_run_delivered": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    return new


@router.post("/schedules/{schedule_id}/run-now")
async def run_schedule_now(schedule_id: str):
    """Trigger an immediate report generation run."""
    return {
        "status": "running",
        "schedule_id": schedule_id,
        "started_at": datetime.utcnow().isoformat(),
        "estimated_completion": (datetime.utcnow() + timedelta(minutes=3)).isoformat(),
        "message": "Report generation started. You will be notified when complete.",
    }


@router.get("/schedules/{schedule_id}/history")
async def get_schedule_history(schedule_id: str):
    """Get past delivery history for a schedule."""
    history = [h for h in MOCK_HISTORY if h["schedule_id"] == schedule_id]
    return {"schedule_id": schedule_id, "history": history}
