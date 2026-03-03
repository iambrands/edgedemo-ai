"""
CRM Integrations API — Salesforce Financial Services Cloud,
Redtail CRM, and Wealthbox bidirectional sync engine.
"""
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/crm-integrations", tags=["CRM Integrations"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Mock CRM connections
# ---------------------------------------------------------------------------

MOCK_INTEGRATIONS = [
    {
        "id": "crm-sf-001", "provider": "Salesforce",
        "provider_icon": "salesforce", "status": "connected",
        "connected_at": (_now - timedelta(days=120)).isoformat(),
        "last_sync": (_now - timedelta(hours=1)).isoformat(),
        "next_sync": (_now + timedelta(hours=3)).isoformat(),
        "sync_frequency": "every_4_hours",
        "contacts_synced": 156, "accounts_synced": 82,
        "activities_synced": 340, "sync_errors": 0,
        "sync_direction": "bidirectional",
        "field_mappings": 24,
        "features": ["Contact Sync", "Account Sync", "Activity Logging",
                     "Opportunity Tracking", "Task Creation", "Custom Fields"],
    },
    {
        "id": "crm-rt-001", "provider": "Redtail",
        "provider_icon": "redtail", "status": "connected",
        "connected_at": (_now - timedelta(days=200)).isoformat(),
        "last_sync": (_now - timedelta(hours=2)).isoformat(),
        "next_sync": (_now + timedelta(hours=2)).isoformat(),
        "sync_frequency": "every_4_hours",
        "contacts_synced": 156, "accounts_synced": 82,
        "activities_synced": 280, "sync_errors": 2,
        "sync_direction": "bidirectional",
        "field_mappings": 18,
        "features": ["Contact Sync", "Activity Logging", "Workflow Triggers",
                     "Note Sync", "Category Mapping"],
    },
    {
        "id": "crm-wb-001", "provider": "Wealthbox",
        "provider_icon": "wealthbox", "status": "disconnected",
        "connected_at": None,
        "last_sync": None, "next_sync": None,
        "sync_frequency": "every_4_hours",
        "contacts_synced": 0, "accounts_synced": 0,
        "activities_synced": 0, "sync_errors": 0,
        "sync_direction": "bidirectional",
        "field_mappings": 0,
        "features": ["Contact Sync", "Task Sync", "Event Sync",
                     "Pipeline Sync", "Note Sync"],
    },
]

MOCK_SYNC_LOG = [
    {"id": f"sync-{i:03d}", "provider": random.choice(["Salesforce", "Redtail"]),
     "timestamp": (_now - timedelta(hours=i * 4)).isoformat(),
     "direction": random.choice(["inbound", "outbound", "bidirectional"]),
     "records_created": random.randint(0, 5),
     "records_updated": random.randint(0, 15),
     "records_skipped": random.randint(0, 3),
     "errors": random.randint(0, 1),
     "duration_ms": random.randint(800, 4500),
     "status": "success" if random.random() > 0.1 else "partial"}
    for i in range(20)
]

MOCK_FIELD_MAPPINGS = [
    {"edge_field": "first_name", "crm_field": "FirstName", "direction": "bidirectional", "active": True},
    {"edge_field": "last_name", "crm_field": "LastName", "direction": "bidirectional", "active": True},
    {"edge_field": "email", "crm_field": "Email", "direction": "bidirectional", "active": True},
    {"edge_field": "phone", "crm_field": "Phone", "direction": "bidirectional", "active": True},
    {"edge_field": "aum", "crm_field": "Total_AUM__c", "direction": "outbound", "active": True},
    {"edge_field": "risk_profile", "crm_field": "Risk_Profile__c", "direction": "outbound", "active": True},
    {"edge_field": "last_review_date", "crm_field": "Last_Review_Date__c", "direction": "outbound", "active": True},
    {"edge_field": "next_review_date", "crm_field": "Next_Review__c", "direction": "outbound", "active": True},
    {"edge_field": "household_name", "crm_field": "Account.Name", "direction": "bidirectional", "active": True},
    {"edge_field": "account_type", "crm_field": "FinServ__FinancialAccountType__c", "direction": "outbound", "active": True},
    {"edge_field": "status", "crm_field": "Status__c", "direction": "bidirectional", "active": True},
    {"edge_field": "notes", "crm_field": "Description", "direction": "bidirectional", "active": True},
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/integrations")
async def list_integrations(current_user: dict = Depends(get_current_user)):
    return {
        "integrations": MOCK_INTEGRATIONS,
        "total_contacts_synced": sum(i["contacts_synced"] for i in MOCK_INTEGRATIONS),
        "total_sync_errors": sum(i["sync_errors"] for i in MOCK_INTEGRATIONS),
    }


@router.get("/integrations/{integration_id}")
async def get_integration(integration_id: str, current_user: dict = Depends(get_current_user)):
    for integ in MOCK_INTEGRATIONS:
        if integ["id"] == integration_id:
            return {**integ, "field_mappings_detail": MOCK_FIELD_MAPPINGS}
    return {"error": "Integration not found"}


@router.post("/integrations/{integration_id}/connect")
async def connect_integration(integration_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    return {
        "integration_id": integration_id,
        "status": "connected",
        "oauth_url": f"https://{request.get('provider', 'crm')}.example.com/oauth/authorize?client_id=edge&redirect_uri=...",
        "message": "OAuth flow initiated. Redirect user to complete authorization.",
    }


@router.post("/integrations/{integration_id}/sync")
async def trigger_sync(integration_id: str, current_user: dict = Depends(get_current_user)):
    return {
        "sync_id": f"sync-{uuid.uuid4().hex[:8]}",
        "integration_id": integration_id,
        "status": "in_progress",
        "started_at": _now.isoformat(),
        "estimated_duration_seconds": random.randint(5, 30),
    }


@router.post("/integrations/{integration_id}/disconnect")
async def disconnect_integration(integration_id: str, current_user: dict = Depends(get_current_user)):
    return {"integration_id": integration_id, "status": "disconnected"}


@router.get("/sync-log")
async def get_sync_log(
    provider: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    logs = MOCK_SYNC_LOG
    if provider:
        logs = [l for l in logs if l["provider"] == provider]
    return {"logs": logs, "total": len(logs)}


@router.get("/field-mappings/{provider}")
async def get_field_mappings(provider: str, current_user: dict = Depends(get_current_user)):
    return {"provider": provider, "mappings": MOCK_FIELD_MAPPINGS, "total": len(MOCK_FIELD_MAPPINGS)}


@router.put("/field-mappings/{provider}")
async def update_field_mappings(
    provider: str,
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    return {"provider": provider, "mappings_updated": len(request.get("mappings", [])), "status": "saved"}
