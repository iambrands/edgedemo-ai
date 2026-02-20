"""
Secure advisor-client messaging API.
Thread-based messaging between advisors and their clients.
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/messaging", tags=["Messaging"])


class NewThread(BaseModel):
    participant_name: str
    subject: str
    initial_message: str


class NewMessage(BaseModel):
    content: str
    sender_role: str = "advisor"


MOCK_THREADS = [
    {
        "id": "thread-1",
        "participant_name": "Sarah & Michael Chen",
        "household_id": "hh-001",
        "subject": "Quarterly Review Follow-up",
        "last_message": "Thank you for the detailed review. We have a few follow-up questions about the rebalancing proposal.",
        "last_message_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
        "unread_count": 2,
        "status": "active",
    },
    {
        "id": "thread-2",
        "participant_name": "Robert & Lisa Johnson",
        "household_id": "hh-002",
        "subject": "Rollover from Previous Employer 403(b)",
        "last_message": "We've received the transfer paperwork. Should we sign and send back directly?",
        "last_message_at": (datetime.utcnow() - timedelta(hours=8)).isoformat(),
        "unread_count": 1,
        "status": "active",
    },
    {
        "id": "thread-3",
        "participant_name": "James Wilson",
        "household_id": "hh-003",
        "subject": "Tax-Loss Harvesting Opportunities",
        "last_message": "I've reviewed the recommendations and approve the suggested trades. Please proceed.",
        "last_message_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        "unread_count": 0,
        "status": "active",
    },
    {
        "id": "thread-4",
        "participant_name": "Patricia Davis",
        "household_id": "hh-004",
        "subject": "Beneficiary Update Request",
        "last_message": "All beneficiary updates have been processed. Let me know if you need anything else.",
        "last_message_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
        "unread_count": 0,
        "status": "resolved",
    },
    {
        "id": "thread-5",
        "participant_name": "David & Maria Garcia",
        "household_id": "hh-005",
        "subject": "New Account Opening - TSP Rollover",
        "last_message": "We've submitted the TSP rollover request. Expected processing time is 5-7 business days.",
        "last_message_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
        "unread_count": 0,
        "status": "active",
    },
]

MOCK_MESSAGES = {
    "thread-1": [
        {"id": "msg-1", "content": "Hi Sarah and Michael, here is the summary from our quarterly review meeting today.", "sender_role": "advisor", "sender_name": "Your Advisor", "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
        {"id": "msg-2", "content": "Thank you! The performance summary looks great. Quick question - you mentioned rebalancing the international allocation. Can you explain the rationale?", "sender_role": "client", "sender_name": "Sarah Chen", "created_at": (datetime.utcnow() - timedelta(hours=6)).isoformat()},
        {"id": "msg-3", "content": "Also, we wanted to ask about the 529 plan for our daughter. Is now a good time to increase contributions?", "sender_role": "client", "sender_name": "Sarah Chen", "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat()},
    ],
    "thread-2": [
        {"id": "msg-4", "content": "Hi Robert and Lisa, I wanted to follow up on the 403(b) rollover from your previous employer.", "sender_role": "advisor", "sender_name": "Your Advisor", "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()},
        {"id": "msg-5", "content": "We've prepared the transfer paperwork. I'm attaching the forms you'll need to sign.", "sender_role": "advisor", "sender_name": "Your Advisor", "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
        {"id": "msg-6", "content": "We've received the transfer paperwork. Should we sign and send back directly?", "sender_role": "client", "sender_name": "Robert Johnson", "created_at": (datetime.utcnow() - timedelta(hours=8)).isoformat()},
    ],
}


@router.get("/threads")
async def list_threads(authorization: Optional[str] = Header(None)):
    """List message threads for the current user."""
    return {"threads": MOCK_THREADS}


@router.post("/threads")
async def create_thread(thread: NewThread):
    """Create a new message thread."""
    new_thread = {
        "id": f"thread-{uuid.uuid4().hex[:6]}",
        "participant_name": thread.participant_name,
        "household_id": f"hh-new",
        "subject": thread.subject,
        "last_message": thread.initial_message,
        "last_message_at": datetime.utcnow().isoformat(),
        "unread_count": 0,
        "status": "active",
    }
    return new_thread


@router.get("/threads/{thread_id}/messages")
async def get_messages(thread_id: str):
    """Get messages in a thread."""
    messages = MOCK_MESSAGES.get(thread_id, [])
    return {"thread_id": thread_id, "messages": messages}


@router.post("/threads/{thread_id}/messages")
async def send_message(thread_id: str, message: NewMessage):
    """Send a message in a thread."""
    new_msg = {
        "id": f"msg-{uuid.uuid4().hex[:6]}",
        "content": message.content,
        "sender_role": message.sender_role,
        "sender_name": "Your Advisor" if message.sender_role == "advisor" else "Client",
        "created_at": datetime.utcnow().isoformat(),
    }
    if thread_id in MOCK_MESSAGES:
        MOCK_MESSAGES[thread_id].append(new_msg)
    else:
        MOCK_MESSAGES[thread_id] = [new_msg]
    return new_msg


@router.patch("/threads/{thread_id}/read")
async def mark_thread_read(thread_id: str):
    """Mark a thread as read."""
    for t in MOCK_THREADS:
        if t["id"] == thread_id:
            t["unread_count"] = 0
            return {"status": "marked_read"}
    return {"status": "thread_not_found"}
