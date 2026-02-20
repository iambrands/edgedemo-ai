"""
Workflow Templates API.
Pre-built workflow templates that auto-generate task checklists for common advisor scenarios.
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/workflows", tags=["Workflows"])


class WorkflowStart(BaseModel):
    template_id: str
    client_name: str
    notes: Optional[str] = None


WORKFLOW_TEMPLATES = [
    {
        "id": "new-client",
        "name": "New Client Onboarding",
        "description": "Complete checklist for onboarding a new client household",
        "category": "onboarding",
        "task_count": 10,
        "estimated_days": 14,
        "tasks": [
            {"title": "Collect signed advisory agreement", "priority": "urgent"},
            {"title": "Complete KYC questionnaire", "priority": "high"},
            {"title": "Gather account statements from all custodians", "priority": "high"},
            {"title": "Run initial portfolio analysis", "priority": "high"},
            {"title": "Complete risk tolerance assessment", "priority": "high"},
            {"title": "Set up household in system", "priority": "medium"},
            {"title": "Configure compliance alerts", "priority": "medium"},
            {"title": "Schedule initial planning meeting", "priority": "medium"},
            {"title": "Send welcome packet via client portal", "priority": "low"},
            {"title": "Set up recurring review schedule", "priority": "low"},
        ],
    },
    {
        "id": "annual-review",
        "name": "Annual Review",
        "description": "Yearly review checklist covering performance, compliance, and planning",
        "category": "review",
        "task_count": 8,
        "estimated_days": 7,
        "tasks": [
            {"title": "Generate annual performance report", "priority": "high"},
            {"title": "Review asset allocation vs. target", "priority": "high"},
            {"title": "Check beneficiary designations are current", "priority": "high"},
            {"title": "Review fee schedule and total costs", "priority": "medium"},
            {"title": "Update financial plan projections", "priority": "medium"},
            {"title": "Assess tax-loss harvesting opportunities", "priority": "medium"},
            {"title": "Confirm client contact info and life changes", "priority": "low"},
            {"title": "Schedule next year's review", "priority": "low"},
        ],
    },
    {
        "id": "death-of-client",
        "name": "Death of Client/Spouse",
        "description": "Sensitive workflow for handling accounts after a client or spouse passes",
        "category": "life-event",
        "task_count": 12,
        "estimated_days": 30,
        "tasks": [
            {"title": "Express condolences and offer support", "priority": "urgent"},
            {"title": "Obtain certified copy of death certificate", "priority": "urgent"},
            {"title": "Identify all accounts held by deceased", "priority": "high"},
            {"title": "Notify custodians of death", "priority": "high"},
            {"title": "Review beneficiary designations", "priority": "high"},
            {"title": "Coordinate with estate attorney", "priority": "high"},
            {"title": "Determine required distributions (inherited IRA rules)", "priority": "high"},
            {"title": "Re-title accounts as needed", "priority": "medium"},
            {"title": "Update household structure in system", "priority": "medium"},
            {"title": "Review insurance claims and proceeds", "priority": "medium"},
            {"title": "Adjust financial plan for surviving spouse", "priority": "medium"},
            {"title": "Schedule follow-up meeting at 30/60/90 days", "priority": "low"},
        ],
    },
    {
        "id": "divorce",
        "name": "Divorce Processing",
        "description": "Workflow for dividing assets and restructuring accounts during divorce",
        "category": "life-event",
        "task_count": 10,
        "estimated_days": 60,
        "tasks": [
            {"title": "Obtain copy of divorce decree/QDRO", "priority": "urgent"},
            {"title": "Identify all joint and individual accounts", "priority": "high"},
            {"title": "Coordinate with client's divorce attorney", "priority": "high"},
            {"title": "Calculate asset division per court order", "priority": "high"},
            {"title": "Process QDRO transfers for retirement accounts", "priority": "high"},
            {"title": "Re-title joint accounts", "priority": "medium"},
            {"title": "Update beneficiary designations", "priority": "medium"},
            {"title": "Create separate household profiles", "priority": "medium"},
            {"title": "Revise financial plan for post-divorce situation", "priority": "medium"},
            {"title": "Update estate planning documents", "priority": "low"},
        ],
    },
    {
        "id": "rollover",
        "name": "Rollover Processing",
        "description": "Checklist for processing 401(k), 403(b), 457, TSP, and pension rollovers",
        "category": "transfer",
        "task_count": 8,
        "estimated_days": 14,
        "tasks": [
            {"title": "Obtain most recent plan statement", "priority": "high"},
            {"title": "Determine rollover type (direct vs. indirect)", "priority": "high"},
            {"title": "Open receiving IRA account if needed", "priority": "high"},
            {"title": "Complete rollover request forms", "priority": "high"},
            {"title": "Suitability review and compliance sign-off", "priority": "high"},
            {"title": "Submit transfer to sending custodian", "priority": "medium"},
            {"title": "Monitor transfer status and confirm receipt", "priority": "medium"},
            {"title": "Invest rollover proceeds per target allocation", "priority": "low"},
        ],
    },
    {
        "id": "account-closure",
        "name": "Account Closure",
        "description": "Orderly process for closing client accounts and off-boarding",
        "category": "administrative",
        "task_count": 6,
        "estimated_days": 14,
        "tasks": [
            {"title": "Confirm client's intent and reason for closure", "priority": "high"},
            {"title": "Liquidate or transfer all positions", "priority": "high"},
            {"title": "Process final advisory fee billing", "priority": "high"},
            {"title": "Generate final account statements", "priority": "medium"},
            {"title": "Archive client records per retention policy", "priority": "medium"},
            {"title": "Send closing confirmation letter", "priority": "low"},
        ],
    },
]

ACTIVE_WORKFLOWS: list = []


@router.get("/templates")
async def list_templates():
    """List all available workflow templates."""
    summaries = [
        {k: v for k, v in t.items() if k != "tasks"}
        for t in WORKFLOW_TEMPLATES
    ]
    return {"templates": summaries}


@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get a specific workflow template with full task list."""
    for t in WORKFLOW_TEMPLATES:
        if t["id"] == template_id:
            return t
    return {"error": "Template not found"}


@router.post("/start")
async def start_workflow(req: WorkflowStart):
    """Instantiate a workflow from a template, creating tasks."""
    template = None
    for t in WORKFLOW_TEMPLATES:
        if t["id"] == req.template_id:
            template = t
            break
    if not template:
        return {"error": "Template not found"}

    workflow_id = str(uuid.uuid4())
    tasks = []
    for i, task_def in enumerate(template["tasks"]):
        tasks.append({
            "id": f"task-{workflow_id[:8]}-{i}",
            "title": task_def["title"],
            "priority": task_def["priority"],
            "status": "pending",
            "due_date": (datetime.utcnow() + timedelta(days=(i + 1) * 2)).strftime("%Y-%m-%d"),
        })

    workflow = {
        "id": workflow_id,
        "template_id": req.template_id,
        "template_name": template["name"],
        "client_name": req.client_name,
        "notes": req.notes,
        "status": "active",
        "started_at": datetime.utcnow().isoformat(),
        "tasks": tasks,
        "total_tasks": len(tasks),
        "completed_tasks": 0,
        "progress_percent": 0,
    }
    ACTIVE_WORKFLOWS.append(workflow)
    return workflow


@router.get("/active")
async def list_active_workflows():
    """List all active workflow instances with progress."""
    return {"workflows": ACTIVE_WORKFLOWS}


@router.patch("/tasks/{task_id}/complete")
async def complete_task(task_id: str):
    """Mark a workflow task as completed."""
    for wf in ACTIVE_WORKFLOWS:
        for task in wf["tasks"]:
            if task["id"] == task_id:
                task["status"] = "completed"
                completed = sum(1 for t in wf["tasks"] if t["status"] == "completed")
                wf["completed_tasks"] = completed
                wf["progress_percent"] = round(completed / wf["total_tasks"] * 100)
                if completed == wf["total_tasks"]:
                    wf["status"] = "completed"
                return {"status": "completed", "workflow_progress": wf["progress_percent"]}
    return {"error": "Task not found"}
