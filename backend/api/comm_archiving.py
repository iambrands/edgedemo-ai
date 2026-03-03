"""
SEC-Compliant Communication Archiving — Tamper-proof message storage,
retention policies, audit trail, and supervisory review workflow.
"""
import uuid
import random
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/archive", tags=["Communication Archiving"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Mock archived messages
# ---------------------------------------------------------------------------

CHANNELS = ["email", "sms", "portal_message", "video_meeting", "chat"]
STATUSES = ["archived", "flagged_for_review", "reviewed", "supervised"]

_participants = [
    ("Leslie Thompson", "leslie@iabadvisors.com"),
    ("Marcus Chen", "marcus@iabadvisors.com"),
    ("Robert Williams", "robert.williams@email.com"),
    ("Lisa Anderson", "lisa.anderson@email.com"),
    ("David Martinez", "david.martinez@email.com"),
    ("Jennifer Park", "jennifer.park@email.com"),
]

_subjects = [
    "Q4 Portfolio Review Follow-up", "Upcoming RMD Distribution",
    "Market Commentary — January 2026", "Beneficiary Change Request",
    "Fee Schedule Update Notification", "Annual Review Scheduling",
    "Tax-Loss Harvesting Opportunity", "Account Transfer Status",
    "New Account Application — Next Steps", "Retirement Projection Update",
]


def _mock_messages(count: int = 50) -> List[Dict[str, Any]]:
    msgs = []
    for i in range(count):
        sender = random.choice(_participants)
        recipient = random.choice([p for p in _participants if p != sender])
        channel = random.choice(CHANNELS)
        body = f"Sample archived communication content for message {i+1}."
        hash_val = hashlib.sha256(f"{i}-{body}".encode()).hexdigest()
        msgs.append({
            "id": f"msg-{i+1:04d}",
            "channel": channel,
            "subject": random.choice(_subjects),
            "from_name": sender[0],
            "from_email": sender[1],
            "to_name": recipient[0],
            "to_email": recipient[1],
            "body_preview": body[:100],
            "timestamp": (_now - timedelta(hours=random.randint(1, 720))).isoformat(),
            "status": random.choice(STATUSES),
            "has_attachments": random.random() > 0.7,
            "attachment_count": random.randint(1, 3) if random.random() > 0.7 else 0,
            "integrity_hash": hash_val[:16],
            "retention_expiry": (_now + timedelta(days=random.randint(365, 2555))).strftime("%Y-%m-%d"),
            "flagged_keywords": random.choice([[], [], [], ["guarantee"], ["performance"], ["commission"]]),
            "reviewed_by": "Daniel Park" if random.random() > 0.5 else None,
            "reviewed_at": (_now - timedelta(hours=random.randint(1, 48))).isoformat() if random.random() > 0.5 else None,
        })
    msgs.sort(key=lambda m: m["timestamp"], reverse=True)
    return msgs


MOCK_MESSAGES = _mock_messages(60)

RETENTION_POLICIES = [
    {"id": "pol-001", "name": "SEC Rule 17a-4 — Email", "channel": "email",
     "retention_years": 6, "status": "active",
     "description": "All email communications retained for 6 years per SEC Rule 17a-4"},
    {"id": "pol-002", "name": "SEC Rule 17a-4 — Text/SMS", "channel": "sms",
     "retention_years": 6, "status": "active",
     "description": "All text/SMS communications retained per SEC recordkeeping requirements"},
    {"id": "pol-003", "name": "Client Portal Messages", "channel": "portal_message",
     "retention_years": 7, "status": "active",
     "description": "Secure portal messages retained for 7 years"},
    {"id": "pol-004", "name": "Meeting Recordings & Transcripts", "channel": "video_meeting",
     "retention_years": 5, "status": "active",
     "description": "Video meeting recordings and AI-generated transcripts"},
    {"id": "pol-005", "name": "Chat Communications", "channel": "chat",
     "retention_years": 6, "status": "active",
     "description": "All instant message / chat communications"},
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/messages")
async def list_archived_messages(
    channel: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    days: int = 30,
    page: int = 1,
    page_size: int = 25,
    current_user: dict = Depends(get_current_user),
):
    msgs = MOCK_MESSAGES
    cutoff = _now - timedelta(days=days)
    msgs = [m for m in msgs if m["timestamp"] >= cutoff.isoformat()]
    if channel:
        msgs = [m for m in msgs if m["channel"] == channel]
    if status:
        msgs = [m for m in msgs if m["status"] == status]
    if search:
        q = search.lower()
        msgs = [m for m in msgs if q in m["subject"].lower() or q in m.get("from_name", "").lower() or q in m.get("to_name", "").lower()]

    total = len(msgs)
    start = (page - 1) * page_size
    paged = msgs[start:start + page_size]

    return {
        "messages": paged,
        "total": total,
        "page": page,
        "page_size": page_size,
        "channels_summary": {ch: sum(1 for m in msgs if m["channel"] == ch) for ch in CHANNELS},
    }


@router.get("/messages/{message_id}")
async def get_message(message_id: str, current_user: dict = Depends(get_current_user)):
    for m in MOCK_MESSAGES:
        if m["id"] == message_id:
            return {**m, "body_full": f"Full archived content for {m['subject']}.\n\nThis message has been securely archived with tamper-proof integrity verification."}
    return {"error": "Message not found"}


@router.post("/messages/{message_id}/review")
async def review_message(
    message_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    action = request.get("action", "approve")
    return {
        "message_id": message_id,
        "action": action,
        "reviewed_by": "Daniel Park",
        "reviewed_at": _now.isoformat(),
        "status": "reviewed" if action == "approve" else "escalated",
    }


@router.get("/policies")
async def list_policies(current_user: dict = Depends(get_current_user)):
    return {"policies": RETENTION_POLICIES}


@router.get("/dashboard")
async def archive_dashboard(current_user: dict = Depends(get_current_user)):
    return {
        "total_archived": len(MOCK_MESSAGES),
        "archived_today": sum(1 for m in MOCK_MESSAGES if m["timestamp"] >= (_now - timedelta(days=1)).isoformat()),
        "pending_review": sum(1 for m in MOCK_MESSAGES if m["status"] == "flagged_for_review"),
        "flagged_keywords_count": sum(1 for m in MOCK_MESSAGES if m["flagged_keywords"]),
        "channels": {ch: sum(1 for m in MOCK_MESSAGES if m["channel"] == ch) for ch in CHANNELS},
        "storage_used_gb": 2.4,
        "retention_compliance": "compliant",
        "last_audit": (_now - timedelta(days=12)).strftime("%Y-%m-%d"),
        "next_audit": (_now + timedelta(days=78)).strftime("%Y-%m-%d"),
    }


@router.get("/search")
async def search_archive(
    q: str = Query(...),
    channel: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    results = [m for m in MOCK_MESSAGES
               if q.lower() in m["subject"].lower()
               or q.lower() in m.get("from_name", "").lower()
               or q.lower() in m.get("to_name", "").lower()]
    if channel:
        results = [m for m in results if m["channel"] == channel]
    return {"results": results, "total": len(results), "query": q}
