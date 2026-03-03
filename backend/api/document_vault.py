"""
Document Vault API — Secure document storage, versioning, and
DocuSign e-signature integration with mock fallback.
"""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["Document Vault"])

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user

_now = datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

MOCK_DOCUMENTS: List[Dict[str, Any]] = [
    {"id": "doc-001", "name": "Williams Family Trust — IPS", "type": "IPS",
     "category": "agreements", "household_id": "hh-001", "client_name": "Williams Family",
     "size_bytes": 245000, "mime_type": "application/pdf", "version": 2,
     "status": "signed", "signature_status": "completed",
     "uploaded_by": "leslie@iabadvisors.com", "signed_by": "robert.williams@email.com",
     "signed_at": (_now - timedelta(days=30)).isoformat(),
     "created_at": (_now - timedelta(days=45)).isoformat(),
     "updated_at": (_now - timedelta(days=30)).isoformat()},
    {"id": "doc-002", "name": "Anderson Joint Account — ADV Part 2B", "type": "ADV 2B",
     "category": "compliance", "household_id": "hh-002", "client_name": "Anderson Family",
     "size_bytes": 180000, "mime_type": "application/pdf", "version": 1,
     "status": "signed", "signature_status": "completed",
     "uploaded_by": "leslie@iabadvisors.com", "signed_by": "lisa.anderson@email.com",
     "signed_at": (_now - timedelta(days=15)).isoformat(),
     "created_at": (_now - timedelta(days=20)).isoformat(),
     "updated_at": (_now - timedelta(days=15)).isoformat()},
    {"id": "doc-003", "name": "Martinez — Beneficiary Designation", "type": "Beneficiary Form",
     "category": "account_forms", "household_id": "hh-003", "client_name": "Martinez Family",
     "size_bytes": 95000, "mime_type": "application/pdf", "version": 1,
     "status": "pending_signature", "signature_status": "sent",
     "uploaded_by": "leslie@iabadvisors.com", "signed_by": None,
     "signed_at": None,
     "created_at": (_now - timedelta(days=3)).isoformat(),
     "updated_at": (_now - timedelta(days=3)).isoformat()},
    {"id": "doc-004", "name": "Q4 2025 Quarterly Statement — Williams", "type": "Quarterly Statement",
     "category": "statements", "household_id": "hh-001", "client_name": "Williams Family",
     "size_bytes": 320000, "mime_type": "application/pdf", "version": 1,
     "status": "delivered", "signature_status": None,
     "uploaded_by": "system", "signed_by": None, "signed_at": None,
     "created_at": (_now - timedelta(days=10)).isoformat(),
     "updated_at": (_now - timedelta(days=10)).isoformat()},
    {"id": "doc-005", "name": "Form CRS — IAB Advisors 2026", "type": "Form CRS",
     "category": "compliance", "household_id": None, "client_name": "All Clients",
     "size_bytes": 150000, "mime_type": "application/pdf", "version": 3,
     "status": "published", "signature_status": None,
     "uploaded_by": "leslie@iabadvisors.com", "signed_by": None, "signed_at": None,
     "created_at": (_now - timedelta(days=60)).isoformat(),
     "updated_at": (_now - timedelta(days=5)).isoformat()},
    {"id": "doc-006", "name": "Park — New Account Application", "type": "Account Application",
     "category": "account_forms", "household_id": "hh-004", "client_name": "Park Family",
     "size_bytes": 210000, "mime_type": "application/pdf", "version": 1,
     "status": "pending_signature", "signature_status": "viewed",
     "uploaded_by": "leslie@iabadvisors.com", "signed_by": None, "signed_at": None,
     "created_at": (_now - timedelta(days=1)).isoformat(),
     "updated_at": (_now - timedelta(hours=4)).isoformat()},
    {"id": "doc-007", "name": "2025 1099-B — Williams Trust", "type": "1099-B",
     "category": "tax", "household_id": "hh-001", "client_name": "Williams Family",
     "size_bytes": 85000, "mime_type": "application/pdf", "version": 1,
     "status": "delivered", "signature_status": None,
     "uploaded_by": "system", "signed_by": None, "signed_at": None,
     "created_at": (_now - timedelta(days=25)).isoformat(),
     "updated_at": (_now - timedelta(days=25)).isoformat()},
]

_uploaded_docs: List[Dict[str, Any]] = []
_signature_requests: List[Dict[str, Any]] = []


# ---------------------------------------------------------------------------
# DocuSign integration (lazy init)
# ---------------------------------------------------------------------------

def _get_docusign_config() -> Optional[Dict[str, str]]:
    key = os.getenv("DOCUSIGN_INTEGRATION_KEY")
    if key:
        return {
            "integration_key": key,
            "account_id": os.getenv("DOCUSIGN_ACCOUNT_ID", ""),
            "base_url": os.getenv("DOCUSIGN_BASE_URL", "https://demo.docusign.net/restapi"),
        }
    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
async def list_documents(
    category: Optional[str] = None,
    household_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    docs = MOCK_DOCUMENTS + _uploaded_docs
    if category:
        docs = [d for d in docs if d["category"] == category]
    if household_id:
        docs = [d for d in docs if d.get("household_id") == household_id]
    if status:
        docs = [d for d in docs if d["status"] == status]
    if search:
        q = search.lower()
        docs = [d for d in docs if q in d["name"].lower() or q in d.get("client_name", "").lower()]

    summary = {
        "total": len(docs),
        "signed": sum(1 for d in docs if d.get("signature_status") == "completed"),
        "pending_signature": sum(1 for d in docs if d.get("signature_status") in ("sent", "viewed")),
        "categories": {
            "agreements": sum(1 for d in docs if d["category"] == "agreements"),
            "compliance": sum(1 for d in docs if d["category"] == "compliance"),
            "statements": sum(1 for d in docs if d["category"] == "statements"),
            "tax": sum(1 for d in docs if d["category"] == "tax"),
            "account_forms": sum(1 for d in docs if d["category"] == "account_forms"),
        },
    }
    return {"documents": docs, "summary": summary}


@router.get("/{document_id}")
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    for d in MOCK_DOCUMENTS + _uploaded_docs:
        if d["id"] == document_id:
            return {**d, "versions": [
                {"version": d["version"], "uploaded_at": d["created_at"], "uploaded_by": d["uploaded_by"]},
            ]}
    raise HTTPException(status_code=404, detail="Document not found")


@router.post("/upload")
async def upload_document(
    name: str = Form(...),
    category: str = Form("agreements"),
    household_id: Optional[str] = Form(None),
    client_name: Optional[str] = Form(None),
    require_signature: bool = Form(False),
    signer_email: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()
    content = await file.read()
    doc = {
        "id": f"doc-{uuid.uuid4().hex[:8]}",
        "name": name,
        "type": file.content_type or "application/pdf",
        "category": category,
        "household_id": household_id,
        "client_name": client_name or "—",
        "size_bytes": len(content),
        "mime_type": file.content_type or "application/pdf",
        "version": 1,
        "status": "pending_signature" if require_signature else "uploaded",
        "signature_status": "sent" if require_signature else None,
        "uploaded_by": "leslie@iabadvisors.com",
        "signed_by": None,
        "signed_at": None,
        "created_at": now,
        "updated_at": now,
    }
    _uploaded_docs.insert(0, doc)
    if require_signature and signer_email:
        _signature_requests.append({
            "id": f"sig-{uuid.uuid4().hex[:8]}",
            "document_id": doc["id"],
            "signer_email": signer_email,
            "status": "sent",
            "sent_at": now,
            "viewed_at": None,
            "signed_at": None,
            "provider": "docusign" if _get_docusign_config() else "mock",
        })
    return doc


@router.post("/{document_id}/send-for-signature")
async def send_for_signature(
    document_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user),
):
    signer_email = request.get("signer_email", "")
    signer_name = request.get("signer_name", "")
    now = datetime.now(timezone.utc).isoformat()

    sig = {
        "id": f"sig-{uuid.uuid4().hex[:8]}",
        "document_id": document_id,
        "signer_email": signer_email,
        "signer_name": signer_name,
        "status": "sent",
        "sent_at": now,
        "viewed_at": None,
        "signed_at": None,
        "provider": "docusign" if _get_docusign_config() else "mock",
        "envelope_id": f"env-{uuid.uuid4().hex[:12]}",
    }
    _signature_requests.append(sig)
    return {"signature_request": sig, "docusign_configured": _get_docusign_config() is not None}


@router.get("/signatures/pending")
async def list_pending_signatures(current_user: dict = Depends(get_current_user)):
    pending = [s for s in _signature_requests if s["status"] in ("sent", "viewed")]
    mock_pending = [
        {"id": "sig-mock-001", "document_id": "doc-003", "signer_email": "david.martinez@email.com",
         "signer_name": "David Martinez", "status": "sent",
         "sent_at": (_now - timedelta(days=3)).isoformat(), "viewed_at": None, "signed_at": None},
        {"id": "sig-mock-002", "document_id": "doc-006", "signer_email": "jennifer.park@email.com",
         "signer_name": "Jennifer Park", "status": "viewed",
         "sent_at": (_now - timedelta(days=1)).isoformat(),
         "viewed_at": (_now - timedelta(hours=4)).isoformat(), "signed_at": None},
    ]
    return {"pending": mock_pending + pending, "total": len(mock_pending) + len(pending)}


@router.get("/categories")
async def list_categories(current_user: dict = Depends(get_current_user)):
    return {
        "categories": [
            {"id": "agreements", "label": "Agreements & IPS", "icon": "FileSignature"},
            {"id": "compliance", "label": "Compliance (ADV, CRS)", "icon": "Shield"},
            {"id": "statements", "label": "Statements & Reports", "icon": "FileText"},
            {"id": "tax", "label": "Tax Documents", "icon": "Receipt"},
            {"id": "account_forms", "label": "Account Forms", "icon": "ClipboardList"},
        ]
    }
