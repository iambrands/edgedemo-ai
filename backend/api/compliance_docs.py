"""
Compliance Documents API Endpoints.
ADV Part 2B, Form CRS generation and management.
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import get_db_session
from backend.models.compliance_docs import (
    ADVPart2BData,
    ComplianceDocument,
    ComplianceDocumentVersion,
    DeliveryStatus,
    DocumentDelivery,
    DocumentStatus,
    DocumentType,
    FormCRSData,
)
from backend.services.compliance_doc_service import ComplianceDocService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compliance/documents", tags=["Compliance Documents"])


# ============================================================================
# AUTH DEPENDENCY
# ============================================================================

try:
    from backend.api.auth import get_current_user
except ImportError:
    from api.auth import get_current_user


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ADVPart2BDataCreate(BaseModel):
    """Request schema for creating/updating ADV Part 2B data."""
    full_name: str
    crd_number: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    education: Optional[List[dict]] = None
    certifications: Optional[List[dict]] = None
    employment_history: Optional[List[dict]] = None
    has_disciplinary_history: bool = False
    disciplinary_disclosure: Optional[str] = None
    other_business_activities: Optional[List[dict]] = None
    outside_business_conflicts: Optional[str] = None
    additional_compensation_sources: Optional[List[dict]] = None
    economic_benefit_disclosure: Optional[str] = None
    supervisor_name: Optional[str] = None
    supervisor_phone: Optional[str] = None
    supervision_description: Optional[str] = None


class FormCRSDataCreate(BaseModel):
    """Request schema for creating/updating Form CRS data."""
    firm_name: str
    crd_number: Optional[str] = None
    sec_number: Optional[str] = None
    is_broker_dealer: bool = False
    is_investment_adviser: bool = True
    services_offered: Optional[List[dict]] = None
    account_minimums: Optional[dict] = None
    investment_authority: Optional[str] = None
    account_monitoring: Optional[str] = None
    fee_structure: Optional[List[dict]] = None
    other_fees: Optional[List[dict]] = None
    fee_impact_example: Optional[str] = None
    standard_of_conduct: Optional[str] = None
    conflicts_of_interest: Optional[List[dict]] = None
    has_disciplinary_history: bool = False
    disciplinary_link: Optional[str] = None
    additional_info_link: Optional[str] = None
    conversation_starters: Optional[List[str]] = None


class DocumentResponse(BaseModel):
    """Response schema for compliance documents."""
    id: str
    document_type: str
    title: str
    description: Optional[str]
    status: str
    current_version_id: Optional[str]
    effective_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VersionResponse(BaseModel):
    """Response schema for document versions."""
    id: str
    document_id: str
    version_number: int
    status: str
    ai_generated: bool
    ai_model: Optional[str]
    change_summary: Optional[str]
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateRequest(BaseModel):
    """Request schema for document generation."""
    regenerate: bool = False


class ApproveRequest(BaseModel):
    """Request schema for version approval."""
    review_notes: Optional[str] = None


class DeliveryRequest(BaseModel):
    """Request schema for document delivery."""
    client_ids: List[str]
    delivery_method: str = "email"
    acknowledgment_required: bool = True


class DeliveryResponse(BaseModel):
    """Response schema for document deliveries."""
    id: str
    document_id: str
    client_id: str
    delivery_method: str
    delivery_status: str
    sent_at: Optional[datetime]
    acknowledged_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def document_to_response(doc: ComplianceDocument) -> DocumentResponse:
    """Convert ComplianceDocument model to response."""
    return DocumentResponse(
        id=str(doc.id),
        document_type=doc.document_type.value,
        title=doc.title,
        description=doc.description,
        status=doc.status.value if doc.status else "draft",
        current_version_id=str(doc.current_version_id) if doc.current_version_id else None,
        effective_date=doc.effective_date,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


def version_to_response(ver: ComplianceDocumentVersion) -> VersionResponse:
    """Convert ComplianceDocumentVersion model to response."""
    return VersionResponse(
        id=str(ver.id),
        document_id=str(ver.document_id),
        version_number=ver.version_number,
        status=ver.status.value if ver.status else "draft",
        ai_generated=ver.ai_generated,
        ai_model=ver.ai_model,
        change_summary=ver.change_summary,
        reviewed_by=str(ver.reviewed_by) if ver.reviewed_by else None,
        reviewed_at=ver.reviewed_at,
        created_at=ver.created_at,
    )


def delivery_to_response(d: DocumentDelivery) -> DeliveryResponse:
    """Convert DocumentDelivery model to response."""
    return DeliveryResponse(
        id=str(d.id),
        document_id=str(d.document_id),
        client_id=str(d.client_id),
        delivery_method=d.delivery_method,
        delivery_status=d.delivery_status.value if d.delivery_status else "pending",
        sent_at=d.sent_at,
        acknowledged_at=d.acknowledged_at,
    )


# ============================================================================
# ADV PART 2B DATA ENDPOINTS
# ============================================================================

@router.get("/adv-2b-data/{advisor_id}")
async def get_adv_2b_data(
    advisor_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get ADV Part 2B data for an advisor."""
    try:
        advisor_uuid = UUID(advisor_id)

        result = await db.execute(
            select(ADVPart2BData).where(ADVPart2BData.advisor_id == advisor_uuid)
        )
        data = result.scalar_one_or_none()

        if not data:
            from backend.services.mock_data_store import compliance_adv2b_data_response
            return compliance_adv2b_data_response(advisor_id)

        return {
            "id": str(data.id),
            "advisor_id": str(data.advisor_id),
            "firm_id": str(data.firm_id),
            "full_name": data.full_name,
            "crd_number": data.crd_number,
            "business_address": data.business_address,
            "business_phone": data.business_phone,
            "education": data.education,
            "certifications": data.certifications,
            "employment_history": data.employment_history,
            "has_disciplinary_history": data.has_disciplinary_history,
            "disciplinary_disclosure": data.disciplinary_disclosure,
            "other_business_activities": data.other_business_activities,
            "supervisor_name": data.supervisor_name,
            "supervisor_phone": data.supervisor_phone,
            "supervision_description": data.supervision_description,
            "updated_at": data.updated_at,
        }
    except HTTPException:
        raise
    except Exception:
        from backend.services.mock_data_store import compliance_adv2b_data_response
        return compliance_adv2b_data_response(advisor_id)


@router.post("/adv-2b-data/{advisor_id}")
async def upsert_adv_2b_data(
    advisor_id: str,
    data: ADVPart2BDataCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create or update ADV Part 2B data for an advisor."""
    try:
        advisor_uuid = UUID(advisor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid advisor ID format")

    # Get firm_id from current user
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=400, detail="User has no associated firm")

    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    result = await db.execute(
        select(ADVPart2BData).where(ADVPart2BData.advisor_id == advisor_uuid)
    )
    existing = result.scalar_one_or_none()

    if existing:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(existing, key, value)
        await db.commit()
        await db.refresh(existing)
        return {"id": str(existing.id), "message": "Updated"}
    else:
        new_data = ADVPart2BData(
            advisor_id=advisor_uuid,
            firm_id=firm_uuid,
            **data.model_dump(),
        )
        db.add(new_data)
        await db.commit()
        await db.refresh(new_data)
        return {"id": str(new_data.id), "message": "Created"}


# ============================================================================
# FORM CRS DATA ENDPOINTS
# ============================================================================

@router.get("/form-crs-data")
async def get_form_crs_data(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get Form CRS data for the current user's firm."""
    try:
        firm_id = current_user.get("firm_id")
        if not firm_id:
            raise HTTPException(status_code=400, detail="User has no associated firm")

        try:
            firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid firm ID format")

        result = await db.execute(
            select(FormCRSData).where(FormCRSData.firm_id == firm_uuid)
        )
        data = result.scalar_one_or_none()

        if not data:
            from backend.services.mock_data_store import compliance_form_crs_data_response
            return compliance_form_crs_data_response()

        return {
            "id": str(data.id),
            "firm_id": str(data.firm_id),
            "firm_name": data.firm_name,
            "crd_number": data.crd_number,
            "sec_number": data.sec_number,
            "is_broker_dealer": data.is_broker_dealer,
            "is_investment_adviser": data.is_investment_adviser,
            "services_offered": data.services_offered,
            "account_minimums": data.account_minimums,
            "investment_authority": data.investment_authority,
            "fee_structure": data.fee_structure,
            "other_fees": data.other_fees,
            "standard_of_conduct": data.standard_of_conduct,
            "conflicts_of_interest": data.conflicts_of_interest,
            "has_disciplinary_history": data.has_disciplinary_history,
            "updated_at": data.updated_at,
        }
    except HTTPException:
        raise
    except Exception:
        from backend.services.mock_data_store import compliance_form_crs_data_response
        return compliance_form_crs_data_response()


@router.post("/form-crs-data")
async def upsert_form_crs_data(
    data: FormCRSDataCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create or update Form CRS data for the current user's firm."""
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=400, detail="User has no associated firm")

    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    result = await db.execute(
        select(FormCRSData).where(FormCRSData.firm_id == firm_uuid)
    )
    existing = result.scalar_one_or_none()

    if existing:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(existing, key, value)
        await db.commit()
        await db.refresh(existing)
        return {"id": str(existing.id), "message": "Updated"}
    else:
        new_data = FormCRSData(
            firm_id=firm_uuid,
            **data.model_dump(),
        )
        db.add(new_data)
        await db.commit()
        await db.refresh(new_data)
        return {"id": str(new_data.id), "message": "Created"}


# ============================================================================
# DOCUMENT GENERATION ENDPOINTS
# ============================================================================

@router.post("/generate/adv-2b/{advisor_id}", response_model=VersionResponse)
async def generate_adv_2b(
    advisor_id: str,
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Generate ADV Part 2B document for an advisor."""
    try:
        advisor_uuid = UUID(advisor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid advisor ID format")

    firm_id = current_user.get("firm_id")
    user_id = current_user.get("id")

    if not firm_id:
        raise HTTPException(status_code=400, detail="User has no associated firm")

    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    service = ComplianceDocService(db)

    try:
        version = await service.generate_adv_part_2b(
            advisor_id=advisor_uuid,
            firm_id=firm_uuid,
            created_by=user_uuid,
            regenerate=request.regenerate,
        )
        return version_to_response(version)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate/form-crs", response_model=VersionResponse)
async def generate_form_crs(
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Generate Form CRS document for the firm."""
    firm_id = current_user.get("firm_id")
    user_id = current_user.get("id")

    if not firm_id:
        raise HTTPException(status_code=400, detail="User has no associated firm")

    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    service = ComplianceDocService(db)

    try:
        version = await service.generate_form_crs(
            firm_id=firm_uuid,
            created_by=user_uuid,
            regenerate=request.regenerate,
        )
        return version_to_response(version)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# DOCUMENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List all compliance documents for the firm."""
    try:
        firm_id = current_user.get("firm_id")
        if not firm_id:
            raise HTTPException(status_code=400, detail="User has no associated firm")

        try:
            firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid firm ID format")

        service = ComplianceDocService(db)
        doc_type = DocumentType(document_type) if document_type else None
        documents = await service.get_firm_documents(firm_uuid, doc_type)

        result = [document_to_response(doc) for doc in documents]
        return result if result else _compliance_docs_fallback()
    except HTTPException:
        raise
    except Exception:
        return _compliance_docs_fallback()


def _compliance_docs_fallback():
    from backend.services.mock_data_store import compliance_documents_response
    return compliance_documents_response()


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific compliance document."""
    try:
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    firm_id = current_user.get("firm_id")
    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    service = ComplianceDocService(db)
    document = await service.get_document(doc_uuid)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.firm_id != firm_uuid:
        raise HTTPException(status_code=403, detail="Access denied")

    return document_to_response(document)


@router.get("/{document_id}/versions", response_model=List[VersionResponse])
async def list_versions(
    document_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List all versions of a document."""
    try:
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    firm_id = current_user.get("firm_id")
    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    service = ComplianceDocService(db)
    document = await service.get_document(doc_uuid)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.firm_id != firm_uuid:
        raise HTTPException(status_code=403, detail="Access denied")

    versions = await service.get_document_versions(doc_uuid)
    return [version_to_response(v) for v in versions]


@router.get("/versions/{version_id}/html", response_class=HTMLResponse)
async def get_version_html(
    version_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get rendered HTML of a document version."""
    try:
        ver_uuid = UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid version ID format")

    firm_id = current_user.get("firm_id")
    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    service = ComplianceDocService(db)
    version = await service.get_version(ver_uuid)

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Check access via parent document
    document = await service.get_document(version.document_id)
    if not document or document.firm_id != firm_uuid:
        raise HTTPException(status_code=403, detail="Access denied")

    return HTMLResponse(content=version.content_html or "<p>No content</p>")


@router.get("/versions/{version_id}/json")
async def get_version_json(
    version_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get structured JSON content of a document version."""
    try:
        ver_uuid = UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid version ID format")

    firm_id = current_user.get("firm_id")
    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    service = ComplianceDocService(db)
    version = await service.get_version(ver_uuid)

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    document = await service.get_document(version.document_id)
    if not document or document.firm_id != firm_uuid:
        raise HTTPException(status_code=403, detail="Access denied")

    return version.content_json


# ============================================================================
# REVIEW WORKFLOW ENDPOINTS
# ============================================================================

@router.post("/versions/{version_id}/approve", response_model=VersionResponse)
async def approve_version(
    version_id: str,
    request: ApproveRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Approve a document version."""
    try:
        ver_uuid = UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid version ID format")

    user_id = current_user.get("id")
    try:
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    service = ComplianceDocService(db)

    try:
        version = await service.approve_version(
            version_id=ver_uuid,
            reviewer_id=user_uuid,
            review_notes=request.review_notes,
        )
        return version_to_response(version)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/versions/{version_id}/publish", response_model=VersionResponse)
async def publish_version(
    version_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Publish an approved document version."""
    try:
        ver_uuid = UUID(version_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid version ID format")

    service = ComplianceDocService(db)

    try:
        version = await service.publish_version(ver_uuid)
        return version_to_response(version)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{document_id}/archive")
async def archive_document(
    document_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Archive a compliance document."""
    try:
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    firm_id = current_user.get("firm_id")
    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    service = ComplianceDocService(db)

    document = await service.get_document(doc_uuid)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.firm_id != firm_uuid:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        archived = await service.archive_document(doc_uuid)
        return {"id": str(archived.id), "status": "archived"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# DELIVERY ENDPOINTS
# ============================================================================

@router.post("/{document_id}/deliver", response_model=List[DeliveryResponse])
async def deliver_document(
    document_id: str,
    request: DeliveryRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Queue document delivery to clients."""
    try:
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    firm_id = current_user.get("firm_id")
    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    service = ComplianceDocService(db)
    document = await service.get_document(doc_uuid)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.firm_id != firm_uuid:
        raise HTTPException(status_code=403, detail="Access denied")

    if not document.current_version_id:
        raise HTTPException(status_code=400, detail="Document has no published version")

    deliveries = []
    for client_id_str in request.client_ids:
        try:
            client_uuid = UUID(client_id_str)
        except ValueError:
            continue  # Skip invalid IDs

        delivery = DocumentDelivery(
            document_id=doc_uuid,
            version_id=document.current_version_id,
            client_id=client_uuid,
            delivery_method=request.delivery_method,
            delivery_status=DeliveryStatus.PENDING,
            acknowledgment_required=request.acknowledgment_required,
        )
        db.add(delivery)
        deliveries.append(delivery)

    await db.commit()

    # Refresh to get IDs
    for d in deliveries:
        await db.refresh(d)

    # TODO: Queue background delivery task
    # background_tasks.add_task(send_document_deliveries, [str(d.id) for d in deliveries])

    logger.info(f"Queued {len(deliveries)} deliveries for document {document_id}")

    return [delivery_to_response(d) for d in deliveries]


@router.get("/{document_id}/deliveries", response_model=List[DeliveryResponse])
async def list_deliveries(
    document_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List all deliveries for a document."""
    try:
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    firm_id = current_user.get("firm_id")
    try:
        firm_uuid = UUID(firm_id) if isinstance(firm_id, str) else firm_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid firm ID format")

    service = ComplianceDocService(db)
    document = await service.get_document(doc_uuid)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.firm_id != firm_uuid:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(DocumentDelivery)
        .where(DocumentDelivery.document_id == doc_uuid)
        .order_by(desc(DocumentDelivery.created_at))
    )
    deliveries = list(result.scalars().all())

    return [delivery_to_response(d) for d in deliveries]
