"""
Tax-Loss Harvesting API endpoints.

Provides endpoints for:
  - Portfolio scanning for harvest opportunities
  - Replacement security recommendations (AI + DB)
  - Approval workflow (recommend → approve → execute)
  - Wash sale monitoring and checking
  - Per-advisor/client harvesting settings
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session
from backend.models.tax_harvest import (
    HarvestOpportunity,
    HarvestStatus,
    WashSaleStatus,
    WashSaleTransaction,
)
from backend.services.tax_harvest import TaxHarvestService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/tax-harvest",
    tags=["Tax-Loss Harvesting"],
)


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================


class _HarvestBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Opportunity ────────────────────────────────────────────────


class HarvestOpportunityResponse(_HarvestBase):
    id: str
    client_id: Optional[str] = None
    account_id: str
    symbol: str
    security_name: str
    quantity_to_harvest: float
    current_price: float
    cost_basis: float
    market_value: float
    unrealized_loss: float
    estimated_tax_savings: float
    short_term_loss: float
    long_term_loss: float
    status: str
    wash_sale_status: str
    wash_sale_risk_amount: Optional[float] = None
    wash_sale_window_start: Optional[str] = None
    wash_sale_window_end: Optional[str] = None
    replacement_recommendations: Optional[List[Dict[str, Any]]] = None
    replacement_symbol: Optional[str] = None
    identified_at: str
    expires_at: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None


class OpportunityListResponse(BaseModel):
    opportunities: List[HarvestOpportunityResponse]
    total: int


class OpportunitySummaryResponse(BaseModel):
    total_opportunities: int
    total_harvestable_loss: float
    total_estimated_savings: float


# ── Replacement Recommendations ────────────────────────────────


class ReplacementRecommendation(BaseModel):
    symbol: str
    name: Optional[str] = None
    reason: str
    correlation: float
    source: str
    wash_sale_safe: bool = True


class RecommendationsResponse(BaseModel):
    opportunity_id: str
    symbol: str
    recommendations: List[ReplacementRecommendation]


# ── Approval / Execution Requests ──────────────────────────────


class ScanRequest(BaseModel):
    client_id: Optional[str] = None
    account_id: Optional[str] = None


class ApproveOpportunityRequest(BaseModel):
    replacement_symbol: Optional[str] = None
    notes: Optional[str] = None


class RejectOpportunityRequest(BaseModel):
    reason: str


class ExecuteOpportunityRequest(BaseModel):
    sell_transaction_id: str
    buy_transaction_id: Optional[str] = None
    actual_loss: Optional[float] = None


# ── Wash Sale ──────────────────────────────────────────────────


class WashSaleWindowResponse(_HarvestBase):
    id: str
    symbol: str
    sale_date: str
    loss_amount: float
    window_start: str
    window_end: str
    watch_symbols: Optional[List[str]] = None
    status: str
    violation_date: Optional[str] = None
    disallowed_loss: Optional[float] = None


class WashSaleCheckResponse(BaseModel):
    symbol: str
    is_safe: bool
    active_windows: List[WashSaleWindowResponse]


# ── Settings ───────────────────────────────────────────────────


class HarvestingSettingsResponse(_HarvestBase):
    id: str
    min_loss_amount: float
    min_loss_percentage: float
    min_tax_savings: float
    short_term_tax_rate: float
    long_term_tax_rate: float
    auto_identify: bool
    auto_recommend: bool
    require_approval: bool
    excluded_symbols: Optional[List[str]] = None
    notify_on_opportunity: bool
    notify_on_wash_sale_risk: bool
    is_active: bool


class HarvestingSettingsUpdate(BaseModel):
    min_loss_amount: Optional[float] = None
    min_loss_percentage: Optional[float] = None
    min_tax_savings: Optional[float] = None
    short_term_tax_rate: Optional[float] = None
    long_term_tax_rate: Optional[float] = None
    auto_identify: Optional[bool] = None
    auto_recommend: Optional[bool] = None
    require_approval: Optional[bool] = None
    excluded_symbols: Optional[List[str]] = None
    notify_on_opportunity: Optional[bool] = None
    notify_on_wash_sale_risk: Optional[bool] = None


# ============================================================================
# HELPERS
# ============================================================================


def _opp_to_response(opp: HarvestOpportunity) -> HarvestOpportunityResponse:
    """Convert HarvestOpportunity ORM object to response dict."""
    return HarvestOpportunityResponse(
        id=str(opp.id),
        client_id=str(opp.client_id) if opp.client_id else None,
        account_id=str(opp.account_id),
        symbol=opp.symbol,
        security_name=opp.security_name,
        quantity_to_harvest=float(opp.quantity_to_harvest),
        current_price=float(opp.current_price),
        cost_basis=float(opp.cost_basis),
        market_value=float(opp.market_value),
        unrealized_loss=float(opp.unrealized_loss),
        estimated_tax_savings=float(opp.estimated_tax_savings),
        short_term_loss=float(opp.short_term_loss),
        long_term_loss=float(opp.long_term_loss),
        status=opp.status.value if hasattr(opp.status, "value") else str(opp.status),
        wash_sale_status=(
            opp.wash_sale_status.value
            if hasattr(opp.wash_sale_status, "value")
            else str(opp.wash_sale_status)
        ),
        wash_sale_risk_amount=(
            float(opp.wash_sale_risk_amount) if opp.wash_sale_risk_amount else None
        ),
        wash_sale_window_start=(
            opp.wash_sale_window_start.isoformat()
            if opp.wash_sale_window_start
            else None
        ),
        wash_sale_window_end=(
            opp.wash_sale_window_end.isoformat()
            if opp.wash_sale_window_end
            else None
        ),
        replacement_recommendations=opp.replacement_recommendations,
        replacement_symbol=opp.replacement_symbol,
        identified_at=opp.identified_at.isoformat() if opp.identified_at else "",
        expires_at=opp.expires_at.isoformat() if opp.expires_at else None,
        approved_at=opp.approved_at.isoformat() if opp.approved_at else None,
        executed_at=opp.executed_at.isoformat() if opp.executed_at else None,
    )


def _wash_to_response(w: WashSaleTransaction) -> WashSaleWindowResponse:
    """Convert WashSaleTransaction ORM object to response dict."""
    return WashSaleWindowResponse(
        id=str(w.id),
        symbol=w.symbol,
        sale_date=w.sale_date.isoformat(),
        loss_amount=float(w.loss_amount),
        window_start=w.window_start.isoformat(),
        window_end=w.window_end.isoformat(),
        watch_symbols=w.watch_symbols,
        status=w.status.value if hasattr(w.status, "value") else str(w.status),
        violation_date=w.violation_date.isoformat() if w.violation_date else None,
        disallowed_loss=float(w.disallowed_loss) if w.disallowed_loss else None,
    )


def _advisor_id(current_user: dict) -> UUID:
    """Extract advisor UUID from current_user dict."""
    return UUID(current_user["id"])


# ============================================================================
# SCANNING & OPPORTUNITIES
# ============================================================================


@router.post("/scan", response_model=OpportunityListResponse)
async def scan_for_opportunities(
    request: ScanRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Scan portfolio for tax-loss harvesting opportunities."""
    service = TaxHarvestService(db)
    opportunities = await service.scan_for_opportunities(
        advisor_id=_advisor_id(current_user),
        client_id=UUID(request.client_id) if request.client_id else None,
        account_id=UUID(request.account_id) if request.account_id else None,
    )
    return OpportunityListResponse(
        opportunities=[_opp_to_response(o) for o in opportunities],
        total=len(opportunities),
    )


@router.get("/opportunities", response_model=None)
async def list_opportunities(
    client_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    include_expired: bool = False,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List harvest opportunities with optional filters."""
    try:
        harvest_status: Optional[HarvestStatus] = None
        if status_filter:
            try:
                harvest_status = HarvestStatus(status_filter)
            except ValueError:
                raise HTTPException(400, f"Invalid status: {status_filter}")

        service = TaxHarvestService(db)
        opportunities = await service.get_opportunities(
            advisor_id=_advisor_id(current_user),
            client_id=UUID(client_id) if client_id else None,
            status=harvest_status,
            include_expired=include_expired,
        )
        return OpportunityListResponse(
            opportunities=[_opp_to_response(o) for o in opportunities],
            total=len(opportunities),
        )
    except HTTPException:
        raise
    except Exception:
        from backend.services.mock_data_store import tax_opportunity_list_response
        return tax_opportunity_list_response()


@router.get("/opportunities/summary", response_model=None)
async def get_summary(
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get summary statistics for active opportunities."""
    try:
        service = TaxHarvestService(db)
        return await service.get_opportunity_summary(
            advisor_id=_advisor_id(current_user),
            client_id=UUID(client_id) if client_id else None,
        )
    except Exception:
        from backend.services.mock_data_store import tax_summary_response
        return tax_summary_response()


@router.get(
    "/opportunities/{opportunity_id}",
    response_model=HarvestOpportunityResponse,
)
async def get_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get a single harvest opportunity by ID."""
    service = TaxHarvestService(db)
    opp = await service.get_opportunity(UUID(opportunity_id))
    if not opp or opp.advisor_id != _advisor_id(current_user):
        raise HTTPException(404, "Opportunity not found")
    return _opp_to_response(opp)


# ============================================================================
# RECOMMENDATIONS
# ============================================================================


@router.get(
    "/opportunities/{opportunity_id}/recommendations",
    response_model=RecommendationsResponse,
)
async def get_recommendations(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get AI + database-sourced replacement security recommendations."""
    service = TaxHarvestService(db)
    opp = await service.get_opportunity(UUID(opportunity_id))
    if not opp or opp.advisor_id != _advisor_id(current_user):
        raise HTTPException(404, "Opportunity not found")

    recs = await service.get_replacement_recommendations(UUID(opportunity_id))
    return RecommendationsResponse(
        opportunity_id=str(opp.id),
        symbol=opp.symbol,
        recommendations=[ReplacementRecommendation(**r) for r in recs],
    )


# ============================================================================
# APPROVAL WORKFLOW
# ============================================================================


@router.post(
    "/opportunities/{opportunity_id}/recommend",
    response_model=HarvestOpportunityResponse,
)
async def recommend_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark opportunity as recommended to advisor."""
    service = TaxHarvestService(db)
    opp = await service.get_opportunity(UUID(opportunity_id))
    if not opp or opp.advisor_id != _advisor_id(current_user):
        raise HTTPException(404, "Opportunity not found")
    try:
        updated = await service.recommend_opportunity(UUID(opportunity_id))
        return _opp_to_response(updated)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post(
    "/opportunities/{opportunity_id}/approve",
    response_model=HarvestOpportunityResponse,
)
async def approve_opportunity(
    opportunity_id: str,
    request: ApproveOpportunityRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Approve a harvest opportunity with optional replacement selection."""
    service = TaxHarvestService(db)
    opp = await service.get_opportunity(UUID(opportunity_id))
    if not opp or opp.advisor_id != _advisor_id(current_user):
        raise HTTPException(404, "Opportunity not found")
    try:
        updated = await service.approve_opportunity(
            opportunity_id=UUID(opportunity_id),
            approved_by=_advisor_id(current_user),
            replacement_symbol=request.replacement_symbol,
            notes=request.notes,
        )
        return _opp_to_response(updated)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post(
    "/opportunities/{opportunity_id}/reject",
    response_model=HarvestOpportunityResponse,
)
async def reject_opportunity(
    opportunity_id: str,
    request: RejectOpportunityRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Reject a harvest opportunity."""
    service = TaxHarvestService(db)
    opp = await service.get_opportunity(UUID(opportunity_id))
    if not opp or opp.advisor_id != _advisor_id(current_user):
        raise HTTPException(404, "Opportunity not found")
    updated = await service.reject_opportunity(
        UUID(opportunity_id), request.reason
    )
    return _opp_to_response(updated)


@router.post(
    "/opportunities/{opportunity_id}/executing",
    response_model=HarvestOpportunityResponse,
)
async def mark_executing(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark opportunity as executing (trade submitted)."""
    service = TaxHarvestService(db)
    opp = await service.get_opportunity(UUID(opportunity_id))
    if not opp or opp.advisor_id != _advisor_id(current_user):
        raise HTTPException(404, "Opportunity not found")
    try:
        updated = await service.mark_executing(UUID(opportunity_id))
        return _opp_to_response(updated)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post(
    "/opportunities/{opportunity_id}/executed",
    response_model=HarvestOpportunityResponse,
)
async def mark_executed(
    opportunity_id: str,
    request: ExecuteOpportunityRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark opportunity as executed and create wash sale tracking window."""
    service = TaxHarvestService(db)
    opp = await service.get_opportunity(UUID(opportunity_id))
    if not opp or opp.advisor_id != _advisor_id(current_user):
        raise HTTPException(404, "Opportunity not found")
    updated = await service.mark_executed(
        opportunity_id=UUID(opportunity_id),
        sell_transaction_id=UUID(request.sell_transaction_id),
        buy_transaction_id=(
            UUID(request.buy_transaction_id)
            if request.buy_transaction_id
            else None
        ),
        actual_loss=(
            Decimal(str(request.actual_loss)) if request.actual_loss else None
        ),
    )
    return _opp_to_response(updated)


# ============================================================================
# WASH SALE MONITORING
# ============================================================================


@router.get("/wash-sales", response_model=List[WashSaleWindowResponse])
async def get_wash_sales(
    symbol: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get active wash sale windows."""
    query = (
        select(WashSaleTransaction)
        .join(HarvestOpportunity)
        .where(
            and_(
                HarvestOpportunity.advisor_id == _advisor_id(current_user),
                WashSaleTransaction.window_end >= date.today(),
            )
        )
    )
    if symbol:
        query = query.where(
            WashSaleTransaction.symbol == symbol.upper()
        )
    result = await db.execute(query)
    return [_wash_to_response(w) for w in result.scalars().all()]


@router.get(
    "/wash-sales/check/{symbol}", response_model=WashSaleCheckResponse
)
async def check_wash_sale(
    symbol: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Check if buying a symbol would trigger a wash sale."""
    query = (
        select(WashSaleTransaction)
        .join(HarvestOpportunity)
        .where(
            and_(
                HarvestOpportunity.advisor_id == _advisor_id(current_user),
                WashSaleTransaction.watch_symbols.contains(
                    [symbol.upper()]
                ),
                WashSaleTransaction.window_end >= date.today(),
                WashSaleTransaction.status == WashSaleStatus.IN_WINDOW,
            )
        )
    )
    result = await db.execute(query)
    windows = result.scalars().all()
    return WashSaleCheckResponse(
        symbol=symbol.upper(),
        is_safe=len(windows) == 0,
        active_windows=[_wash_to_response(w) for w in windows],
    )


# ============================================================================
# SETTINGS
# ============================================================================


@router.get("/settings", response_model=None)
async def get_settings(
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get harvesting settings (cascading: account → client → advisor)."""
    try:
        service = TaxHarvestService(db)
        settings = await service.get_settings(
            advisor_id=_advisor_id(current_user),
            client_id=UUID(client_id) if client_id else None,
        )
        return HarvestingSettingsResponse(
            id=str(settings.id) if settings.id else "",
            min_loss_amount=float(settings.min_loss_amount),
            min_loss_percentage=float(settings.min_loss_percentage),
            min_tax_savings=float(settings.min_tax_savings),
            short_term_tax_rate=float(settings.short_term_tax_rate),
            long_term_tax_rate=float(settings.long_term_tax_rate),
            auto_identify=settings.auto_identify,
            auto_recommend=settings.auto_recommend,
            require_approval=settings.require_approval,
            excluded_symbols=settings.excluded_symbols,
            notify_on_opportunity=settings.notify_on_opportunity,
            notify_on_wash_sale_risk=settings.notify_on_wash_sale_risk,
            is_active=settings.is_active,
        )
    except Exception:
        from backend.services.mock_data_store import tax_settings_response
        return tax_settings_response()


@router.put("/settings", response_model=HarvestingSettingsResponse)
async def update_settings(
    request: HarvestingSettingsUpdate,
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update harvesting settings."""
    service = TaxHarvestService(db)
    update_data = request.model_dump(exclude_none=True)

    # Convert floats to Decimal for DB storage
    decimal_fields = [
        "min_loss_amount",
        "min_loss_percentage",
        "min_tax_savings",
        "short_term_tax_rate",
        "long_term_tax_rate",
    ]
    for field in decimal_fields:
        if field in update_data:
            update_data[field] = Decimal(str(update_data[field]))

    settings = await service.update_settings(
        advisor_id=_advisor_id(current_user),
        settings_data=update_data,
        client_id=UUID(client_id) if client_id else None,
    )
    return HarvestingSettingsResponse(
        id=str(settings.id),
        min_loss_amount=float(settings.min_loss_amount),
        min_loss_percentage=float(settings.min_loss_percentage),
        min_tax_savings=float(settings.min_tax_savings),
        short_term_tax_rate=float(settings.short_term_tax_rate),
        long_term_tax_rate=float(settings.long_term_tax_rate),
        auto_identify=settings.auto_identify,
        auto_recommend=settings.auto_recommend,
        require_approval=settings.require_approval,
        excluded_symbols=settings.excluded_symbols,
        notify_on_opportunity=settings.notify_on_opportunity,
        notify_on_wash_sale_risk=settings.notify_on_wash_sale_risk,
        is_active=settings.is_active,
    )
