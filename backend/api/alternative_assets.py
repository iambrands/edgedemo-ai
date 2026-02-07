"""
Alternative Asset Tracking API endpoints.

CRUD for investments, capital calls, distributions, valuations,
documents (K-1), performance recalculation, and client summaries.

Endpoints (static paths first to avoid path-parameter conflicts):
  GET    /api/v1/alternative-assets/capital-calls/pending             – Pending calls
  GET    /api/v1/alternative-assets/documents/k1s                     – K-1s by year
  GET    /api/v1/alternative-assets/clients/{client_id}/summary       – Client summary
  POST   /api/v1/alternative-assets/capital-calls/{call_id}/pay       – Pay capital call
  POST   /api/v1/alternative-assets                                   – Create investment
  GET    /api/v1/alternative-assets                                   – List investments
  GET    /api/v1/alternative-assets/{id}                              – Get detail
  PATCH  /api/v1/alternative-assets/{id}                              – Update investment
  DELETE /api/v1/alternative-assets/{id}                              – Delete investment
  POST   /api/v1/alternative-assets/{id}/capital-calls                – Create capital call
  GET    /api/v1/alternative-assets/{id}/capital-calls                – List capital calls
  POST   /api/v1/alternative-assets/{id}/distributions                – Record distribution
  GET    /api/v1/alternative-assets/{id}/transactions                 – List transactions
  POST   /api/v1/alternative-assets/{id}/valuations                   – Record valuation
  GET    /api/v1/alternative-assets/{id}/valuations                   – Valuation history
  POST   /api/v1/alternative-assets/{id}/documents                    – Add document
  GET    /api/v1/alternative-assets/{id}/documents                    – List documents
  POST   /api/v1/alternative-assets/{id}/recalculate                  – Recalc performance
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session
from backend.models.alternative_asset import (
    AlternativeAssetType,
    InvestmentStatus,
)
from backend.services.alternative import AlternativeAssetService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/alternative-assets",
    tags=["Alternative Assets"],
)


# ============================================================================
# PYDANTIC SCHEMAS (inline, following existing codebase pattern)
# ============================================================================


class _AltBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Request schemas ─────────────────────────────────────────────


class InvestmentCreate(BaseModel):
    name: str
    asset_type: str
    client_id: UUID
    total_commitment: float
    status: str = "committed"
    account_id: Optional[UUID] = None
    fund_name: Optional[str] = None
    sponsor_name: Optional[str] = None
    fund_manager: Optional[str] = None
    vintage_year: Optional[int] = None
    investment_date: Optional[date] = None
    maturity_date: Optional[date] = None
    investment_strategy: Optional[str] = None
    geography: Optional[str] = None
    sector_focus: Optional[str] = None
    management_fee_rate: Optional[float] = None
    carried_interest_rate: Optional[float] = None
    preferred_return: Optional[float] = None
    tax_entity_type: Optional[str] = None
    ein: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    # Real estate
    property_address: Optional[str] = None
    property_type: Optional[str] = None
    square_footage: Optional[int] = None
    # Collectibles
    item_description: Optional[str] = None
    provenance: Optional[str] = None
    storage_location: Optional[str] = None
    insurance_policy: Optional[str] = None
    insurance_value: Optional[float] = None
    notes: Optional[str] = None
    tags: List[str] = []
    custom_fields: Optional[Dict[str, Any]] = None
    subscription_doc_url: Optional[str] = None


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    account_id: Optional[UUID] = None
    fund_name: Optional[str] = None
    sponsor_name: Optional[str] = None
    fund_manager: Optional[str] = None
    maturity_date: Optional[date] = None
    investment_strategy: Optional[str] = None
    geography: Optional[str] = None
    sector_focus: Optional[str] = None
    management_fee_rate: Optional[float] = None
    carried_interest_rate: Optional[float] = None
    preferred_return: Optional[float] = None
    tax_entity_type: Optional[str] = None
    ein: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    property_address: Optional[str] = None
    property_type: Optional[str] = None
    square_footage: Optional[int] = None
    item_description: Optional[str] = None
    provenance: Optional[str] = None
    storage_location: Optional[str] = None
    insurance_policy: Optional[str] = None
    insurance_value: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    subscription_doc_url: Optional[str] = None


class CapitalCallCreate(BaseModel):
    notice_date: date
    due_date: date
    call_amount: float
    management_fee_portion: Optional[float] = None
    investment_portion: Optional[float] = None
    other_expenses: Optional[float] = None
    wire_instructions: Optional[Dict[str, Any]] = None
    notice_url: Optional[str] = None
    notes: Optional[str] = None


class PayCapitalCallRequest(BaseModel):
    paid_date: date
    paid_amount: Optional[float] = None


class DistributionCreate(BaseModel):
    transaction_date: date
    amount: float
    transaction_type: str = "distribution"
    return_of_capital: Optional[float] = None
    capital_gains_short: Optional[float] = None
    capital_gains_long: Optional[float] = None
    ordinary_income: Optional[float] = None
    qualified_dividends: Optional[float] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class ValuationCreate(BaseModel):
    valuation_date: date
    nav: float
    source: str = "fund_statement"
    source_document: Optional[str] = None
    period_return: Optional[float] = None
    ytd_return: Optional[float] = None
    unrealized_gain: Optional[float] = None
    realized_gain: Optional[float] = None
    irr: Optional[float] = None
    tvpi: Optional[float] = None
    dpi: Optional[float] = None
    notes: Optional[str] = None


class DocumentCreate(BaseModel):
    document_type: str
    name: str
    file_url: str
    description: Optional[str] = None
    document_date: Optional[date] = None
    tax_year: Optional[int] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    # K-1 fields
    k1_box_1: Optional[float] = None
    k1_box_2: Optional[float] = None
    k1_box_3: Optional[float] = None
    k1_box_4a: Optional[float] = None
    k1_box_5: Optional[float] = None
    k1_box_6a: Optional[float] = None
    k1_box_6b: Optional[float] = None
    k1_box_8: Optional[float] = None
    k1_box_9a: Optional[float] = None
    k1_box_11: Optional[float] = None
    k1_box_13: Optional[Dict[str, Any]] = None
    k1_box_19: Optional[float] = None
    k1_box_20: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


# ── Response schemas ────────────────────────────────────────────


class InvestmentResponse(_AltBase):
    id: UUID
    advisor_id: UUID
    client_id: UUID
    account_id: Optional[UUID] = None
    name: str
    asset_type: str
    status: str
    # Fund details
    fund_name: Optional[str] = None
    sponsor_name: Optional[str] = None
    fund_manager: Optional[str] = None
    vintage_year: Optional[int] = None
    investment_date: Optional[date] = None
    maturity_date: Optional[date] = None
    # Strategy
    investment_strategy: Optional[str] = None
    geography: Optional[str] = None
    sector_focus: Optional[str] = None
    # Capital
    total_commitment: float = 0
    called_capital: float = 0
    uncalled_capital: float = 0
    distributions_received: float = 0
    recallable_distributions: float = 0
    # Valuation
    current_nav: float = 0
    nav_date: Optional[date] = None
    # Cost basis
    cost_basis: float = 0
    adjusted_cost_basis: float = 0
    # Performance
    irr: Optional[float] = None
    tvpi: Optional[float] = None
    dpi: Optional[float] = None
    rvpi: Optional[float] = None
    moic: Optional[float] = None
    # Fees
    management_fee_rate: Optional[float] = None
    carried_interest_rate: Optional[float] = None
    preferred_return: Optional[float] = None
    # Tax
    tax_entity_type: Optional[str] = None
    ein: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    # Real estate
    property_address: Optional[str] = None
    property_type: Optional[str] = None
    square_footage: Optional[int] = None
    # Collectibles
    item_description: Optional[str] = None
    provenance: Optional[str] = None
    storage_location: Optional[str] = None
    insurance_policy: Optional[str] = None
    insurance_value: Optional[float] = None
    # Metadata
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    subscription_doc_url: Optional[str] = None
    created_at: Optional[datetime] = None


class CapitalCallResponse(_AltBase):
    id: UUID
    investment_id: UUID
    call_number: int = 1
    notice_date: date
    due_date: date
    call_amount: float
    management_fee_portion: Optional[float] = None
    investment_portion: Optional[float] = None
    cumulative_called: float = 0
    remaining_commitment: float = 0
    percentage_called: float = 0
    status: str = "pending"
    paid_date: Optional[date] = None
    paid_amount: Optional[float] = None
    other_expenses: Optional[float] = None
    wire_instructions: Optional[Dict[str, Any]] = None
    notice_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class TransactionResponse(_AltBase):
    id: UUID
    investment_id: UUID
    transaction_type: str
    transaction_date: date
    settlement_date: Optional[date] = None
    amount: float
    capital_call_id: Optional[UUID] = None
    return_of_capital: Optional[float] = None
    capital_gains_short: Optional[float] = None
    capital_gains_long: Optional[float] = None
    ordinary_income: Optional[float] = None
    qualified_dividends: Optional[float] = None
    reference_number: Optional[str] = None
    status: str = "completed"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class ValuationResponse(_AltBase):
    id: UUID
    investment_id: UUID
    valuation_date: date
    nav: float
    source: str = "fund_statement"
    source_document: Optional[str] = None
    period_return: Optional[float] = None
    ytd_return: Optional[float] = None
    unrealized_gain: Optional[float] = None
    realized_gain: Optional[float] = None
    irr: Optional[float] = None
    tvpi: Optional[float] = None
    dpi: Optional[float] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class DocumentResponse(_AltBase):
    id: UUID
    investment_id: UUID
    document_type: str
    name: str
    description: Optional[str] = None
    document_date: Optional[date] = None
    tax_year: Optional[int] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    file_url: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    # K-1 fields
    k1_box_1: Optional[float] = None
    k1_box_2: Optional[float] = None
    k1_box_3: Optional[float] = None
    k1_box_4a: Optional[float] = None
    k1_box_5: Optional[float] = None
    k1_box_6a: Optional[float] = None
    k1_box_6b: Optional[float] = None
    k1_box_8: Optional[float] = None
    k1_box_9a: Optional[float] = None
    k1_box_11: Optional[float] = None
    k1_box_13: Optional[Dict[str, Any]] = None
    k1_box_19: Optional[float] = None
    k1_box_20: Optional[Dict[str, Any]] = None
    # Processing
    is_processed: bool = False
    processed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class ClientSummaryResponse(BaseModel):
    total_investments: int = 0
    total_commitment: float = 0
    total_called: float = 0
    total_uncalled: float = 0
    total_nav: float = 0
    total_distributions: float = 0
    nav_by_type: Dict[str, float] = {}
    commitment_by_type: Dict[str, float] = {}
    pending_capital_calls: int = 0
    pending_call_amount: float = 0


# ============================================================================
# HELPERS
# ============================================================================


def _investment_to_dict(inv) -> dict:  # noqa: ANN001
    """Convert an AlternativeInvestment ORM object to a safe dict."""
    return InvestmentResponse(
        id=inv.id,
        advisor_id=inv.advisor_id,
        client_id=inv.client_id,
        account_id=inv.account_id,
        name=inv.name,
        asset_type=(
            inv.asset_type.value
            if hasattr(inv.asset_type, "value")
            else str(inv.asset_type)
        ),
        status=(
            inv.status.value
            if hasattr(inv.status, "value")
            else str(inv.status)
        ),
        fund_name=inv.fund_name,
        sponsor_name=inv.sponsor_name,
        fund_manager=inv.fund_manager,
        vintage_year=inv.vintage_year,
        investment_date=inv.investment_date,
        maturity_date=inv.maturity_date,
        investment_strategy=inv.investment_strategy,
        geography=inv.geography,
        sector_focus=inv.sector_focus,
        total_commitment=float(inv.total_commitment or 0),
        called_capital=float(inv.called_capital or 0),
        uncalled_capital=float(inv.uncalled_capital or 0),
        distributions_received=float(inv.distributions_received or 0),
        recallable_distributions=float(inv.recallable_distributions or 0),
        current_nav=float(inv.current_nav or 0),
        nav_date=inv.nav_date,
        cost_basis=float(inv.cost_basis or 0),
        adjusted_cost_basis=float(inv.adjusted_cost_basis or 0),
        irr=float(inv.irr) if inv.irr is not None else None,
        tvpi=float(inv.tvpi) if inv.tvpi is not None else None,
        dpi=float(inv.dpi) if inv.dpi is not None else None,
        rvpi=float(inv.rvpi) if inv.rvpi is not None else None,
        moic=float(inv.moic) if inv.moic is not None else None,
        management_fee_rate=(
            float(inv.management_fee_rate)
            if inv.management_fee_rate is not None
            else None
        ),
        carried_interest_rate=(
            float(inv.carried_interest_rate)
            if inv.carried_interest_rate is not None
            else None
        ),
        preferred_return=(
            float(inv.preferred_return)
            if inv.preferred_return is not None
            else None
        ),
        tax_entity_type=inv.tax_entity_type,
        ein=inv.ein,
        fiscal_year_end=inv.fiscal_year_end,
        property_address=inv.property_address,
        property_type=inv.property_type,
        square_footage=inv.square_footage,
        item_description=inv.item_description,
        provenance=inv.provenance,
        storage_location=inv.storage_location,
        insurance_policy=inv.insurance_policy,
        insurance_value=(
            float(inv.insurance_value)
            if inv.insurance_value is not None
            else None
        ),
        notes=inv.notes,
        tags=inv.tags,
        custom_fields=inv.custom_fields,
        subscription_doc_url=inv.subscription_doc_url,
        created_at=inv.created_at,
    ).model_dump()


def _call_to_dict(c) -> dict:  # noqa: ANN001
    return CapitalCallResponse(
        id=c.id,
        investment_id=c.investment_id,
        call_number=c.call_number or 1,
        notice_date=c.notice_date,
        due_date=c.due_date,
        call_amount=float(c.call_amount),
        management_fee_portion=(
            float(c.management_fee_portion)
            if c.management_fee_portion is not None
            else None
        ),
        investment_portion=(
            float(c.investment_portion)
            if c.investment_portion is not None
            else None
        ),
        other_expenses=(
            float(c.other_expenses)
            if c.other_expenses is not None
            else None
        ),
        cumulative_called=float(c.cumulative_called or 0),
        remaining_commitment=float(c.remaining_commitment or 0),
        percentage_called=float(c.percentage_called or 0),
        status=c.status or "pending",
        paid_date=c.paid_date,
        paid_amount=float(c.paid_amount) if c.paid_amount is not None else None,
        wire_instructions=c.wire_instructions,
        notice_url=c.notice_url,
        notes=c.notes,
        created_at=c.created_at,
    ).model_dump()


def _txn_to_dict(t) -> dict:  # noqa: ANN001
    return TransactionResponse(
        id=t.id,
        investment_id=t.investment_id,
        transaction_type=(
            t.transaction_type.value
            if hasattr(t.transaction_type, "value")
            else str(t.transaction_type)
        ),
        transaction_date=t.transaction_date,
        settlement_date=t.settlement_date,
        amount=float(t.amount),
        capital_call_id=t.capital_call_id,
        return_of_capital=(
            float(t.return_of_capital) if t.return_of_capital is not None else None
        ),
        capital_gains_short=(
            float(t.capital_gains_short) if t.capital_gains_short is not None else None
        ),
        capital_gains_long=(
            float(t.capital_gains_long) if t.capital_gains_long is not None else None
        ),
        ordinary_income=(
            float(t.ordinary_income) if t.ordinary_income is not None else None
        ),
        qualified_dividends=(
            float(t.qualified_dividends) if t.qualified_dividends is not None else None
        ),
        reference_number=t.reference_number,
        status=t.status or "completed",
        notes=t.notes,
        created_at=t.created_at,
    ).model_dump()


def _val_to_dict(v) -> dict:  # noqa: ANN001
    return ValuationResponse(
        id=v.id,
        investment_id=v.investment_id,
        valuation_date=v.valuation_date,
        nav=float(v.nav),
        source=(
            v.source.value if hasattr(v.source, "value") else str(v.source)
        ),
        source_document=v.source_document,
        period_return=float(v.period_return) if v.period_return is not None else None,
        ytd_return=float(v.ytd_return) if v.ytd_return is not None else None,
        unrealized_gain=float(v.unrealized_gain) if v.unrealized_gain is not None else None,
        realized_gain=float(v.realized_gain) if v.realized_gain is not None else None,
        irr=float(v.irr) if v.irr is not None else None,
        tvpi=float(v.tvpi) if v.tvpi is not None else None,
        dpi=float(v.dpi) if v.dpi is not None else None,
        notes=v.notes,
        created_at=v.created_at,
    ).model_dump()


def _doc_to_dict(d) -> dict:  # noqa: ANN001
    return DocumentResponse(
        id=d.id,
        investment_id=d.investment_id,
        document_type=(
            d.document_type.value
            if hasattr(d.document_type, "value")
            else str(d.document_type)
        ),
        name=d.name,
        description=d.description,
        document_date=d.document_date,
        tax_year=d.tax_year,
        period_start=d.period_start,
        period_end=d.period_end,
        file_url=d.file_url,
        file_size=d.file_size,
        file_type=d.file_type,
        k1_box_1=float(d.k1_box_1) if d.k1_box_1 is not None else None,
        k1_box_2=float(d.k1_box_2) if d.k1_box_2 is not None else None,
        k1_box_3=float(d.k1_box_3) if d.k1_box_3 is not None else None,
        k1_box_4a=float(d.k1_box_4a) if d.k1_box_4a is not None else None,
        k1_box_5=float(d.k1_box_5) if d.k1_box_5 is not None else None,
        k1_box_6a=float(d.k1_box_6a) if d.k1_box_6a is not None else None,
        k1_box_6b=float(d.k1_box_6b) if d.k1_box_6b is not None else None,
        k1_box_8=float(d.k1_box_8) if d.k1_box_8 is not None else None,
        k1_box_9a=float(d.k1_box_9a) if d.k1_box_9a is not None else None,
        k1_box_11=float(d.k1_box_11) if d.k1_box_11 is not None else None,
        k1_box_13=d.k1_box_13,
        k1_box_19=float(d.k1_box_19) if d.k1_box_19 is not None else None,
        k1_box_20=d.k1_box_20,
        is_processed=d.is_processed if d.is_processed is not None else False,
        processed_at=d.processed_at,
        notes=d.notes,
        created_at=d.created_at,
    ).model_dump()


# ============================================================================
# STATIC-PATH ENDPOINTS (must come BEFORE /{investment_id})
# ============================================================================


@router.get("/capital-calls/pending")
async def get_pending_capital_calls(
    days_ahead: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get pending capital calls due within a window."""
    try:
        advisor_id = UUID(current_user["id"])
        service = AlternativeAssetService(db)
        calls = await service.get_pending_capital_calls(advisor_id, days_ahead)
        return {
            "calls": [_call_to_dict(c) for c in calls],
            "total": len(calls),
            "total_amount": sum(float(c.call_amount) for c in calls),
        }
    except Exception:
        from backend.services.mock_data_store import alt_pending_calls_response
        return alt_pending_calls_response()


@router.get("/documents/k1s")
async def get_k1s_by_year(
    tax_year: int,
    client_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get all K-1 documents for a tax year."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    k1s = await service.get_k1s_by_year(advisor_id, tax_year, client_id)
    return {
        "k1s": [_doc_to_dict(k) for k in k1s],
        "total": len(k1s),
        "tax_year": tax_year,
    }


@router.get("/clients/{client_id}/summary")
async def get_client_summary(
    client_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get aggregated summary for a client's alternative investments."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    summary = await service.get_client_summary(client_id, advisor_id)
    return summary


@router.post("/capital-calls/{call_id}/pay")
async def pay_capital_call(
    call_id: UUID,
    request: PayCapitalCallRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark a capital call as paid."""
    service = AlternativeAssetService(db)
    paid_amount = (
        Decimal(str(request.paid_amount))
        if request.paid_amount is not None
        else None
    )
    try:
        call = await service.pay_capital_call(
            call_id, request.paid_date, paid_amount
        )
        return _call_to_dict(call)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ============================================================================
# INVESTMENT CRUD (parameterised — after static paths)
# ============================================================================


@router.post("")
async def create_investment(
    request: InvestmentCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create a new alternative investment."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.create_investment(
        advisor_id, request.client_id, request.model_dump()
    )
    return _investment_to_dict(investment)


@router.get("")
async def list_investments(
    client_id: Optional[UUID] = None,
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List alternative investments with optional filters."""
    try:
        advisor_id = UUID(current_user["id"])
        service = AlternativeAssetService(db)
        investments = await service.list_investments(
            advisor_id,
            client_id,
            AlternativeAssetType(asset_type) if asset_type else None,
            InvestmentStatus(status) if status else None,
        )
        return {
            "investments": [_investment_to_dict(i) for i in investments],
            "total": len(investments),
        }
    except Exception:
        from backend.services.mock_data_store import alt_investment_list_response
        return alt_investment_list_response()


@router.get("/{investment_id}")
async def get_investment(
    investment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get investment with full details (transactions, valuations, calls, docs)."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")

    result = _investment_to_dict(investment)
    result["transactions"] = [_txn_to_dict(t) for t in (investment.transactions or [])]
    result["valuations"] = [_val_to_dict(v) for v in (investment.valuations or [])]
    result["capital_calls"] = [_call_to_dict(c) for c in (investment.capital_calls or [])]
    result["documents"] = [_doc_to_dict(d) for d in (investment.documents or [])]
    return result


@router.patch("/{investment_id}")
async def update_investment(
    investment_id: UUID,
    request: InvestmentUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update an investment."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    try:
        updated = await service.update_investment(
            investment_id, request.model_dump(exclude_none=True)
        )
        return _investment_to_dict(updated)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{investment_id}", status_code=204)
async def delete_investment(
    investment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Delete an investment and all related records."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    await service.delete_investment(investment_id)


# ============================================================================
# CAPITAL CALLS (under /{investment_id})
# ============================================================================


@router.post("/{investment_id}/capital-calls")
async def create_capital_call(
    investment_id: UUID,
    request: CapitalCallCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create a capital call notice."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    try:
        call = await service.create_capital_call(
            investment_id, request.model_dump()
        )
        return _call_to_dict(call)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{investment_id}/capital-calls")
async def list_capital_calls(
    investment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List capital calls for an investment."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    calls = await service.get_capital_calls(investment_id)
    return {
        "calls": [_call_to_dict(c) for c in calls],
        "total": len(calls),
    }


# ============================================================================
# DISTRIBUTIONS & TRANSACTIONS (under /{investment_id})
# ============================================================================


@router.post("/{investment_id}/distributions")
async def record_distribution(
    investment_id: UUID,
    request: DistributionCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Record a distribution from an investment."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    try:
        txn = await service.record_distribution(
            investment_id, request.model_dump()
        )
        return _txn_to_dict(txn)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{investment_id}/transactions")
async def list_transactions(
    investment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List all transactions for an investment."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    txns = await service.get_transactions(investment_id)
    return {
        "transactions": [_txn_to_dict(t) for t in txns],
        "total": len(txns),
    }


# ============================================================================
# VALUATIONS (under /{investment_id})
# ============================================================================


@router.post("/{investment_id}/valuations")
async def record_valuation(
    investment_id: UUID,
    request: ValuationCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Record a new valuation."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    try:
        valuation = await service.record_valuation(
            investment_id, request.model_dump()
        )
        return _val_to_dict(valuation)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{investment_id}/valuations")
async def get_valuation_history(
    investment_id: UUID,
    limit: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get valuation history."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    valuations = await service.get_valuation_history(investment_id, limit)
    return {
        "valuations": [_val_to_dict(v) for v in valuations],
        "total": len(valuations),
    }


# ============================================================================
# DOCUMENTS (under /{investment_id})
# ============================================================================


@router.post("/{investment_id}/documents")
async def add_document(
    investment_id: UUID,
    request: DocumentCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Add a document to an investment."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    doc = await service.add_document(investment_id, request.model_dump())
    return _doc_to_dict(doc)


@router.get("/{investment_id}/documents")
async def list_documents(
    investment_id: UUID,
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List documents for an investment."""
    from backend.models.alternative_asset import DocumentType

    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    docs = await service.list_documents(
        investment_id,
        DocumentType(document_type) if document_type else None,
    )
    return {
        "documents": [_doc_to_dict(d) for d in docs],
        "total": len(docs),
    }


# ============================================================================
# PERFORMANCE RECALCULATION (under /{investment_id})
# ============================================================================


@router.post("/{investment_id}/recalculate")
async def recalculate_performance(
    investment_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Recalculate performance metrics (IRR, TVPI, DPI, RVPI, MOIC)."""
    advisor_id = UUID(current_user["id"])
    service = AlternativeAssetService(db)
    investment = await service.get_investment(investment_id, include_related=False)
    if not investment or investment.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Investment not found")
    try:
        updated = await service.recalculate_performance(investment_id)
        return _investment_to_dict(updated)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
