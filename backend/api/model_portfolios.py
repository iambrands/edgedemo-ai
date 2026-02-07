"""
Model Portfolio Marketplace API endpoints.

CRUD for model portfolios, holdings management, marketplace browsing,
subscription management, account assignments, and rebalance signals.

Endpoints:
  GET    /api/v1/model-portfolios/marketplace/browse               – Browse marketplace
  GET    /api/v1/model-portfolios/assignments                      – List assignments
  POST   /api/v1/model-portfolios/rebalance/check                  – Check drift
  GET    /api/v1/model-portfolios/rebalance/signals                – List signals
  POST   /api/v1/model-portfolios/rebalance/signals/{id}/approve   – Approve signal
  POST   /api/v1/model-portfolios/rebalance/signals/{id}/reject    – Reject signal
  POST   /api/v1/model-portfolios/rebalance/signals/{id}/execute   – Mark executed
  DELETE /api/v1/model-portfolios/subscriptions/{id}               – Unsubscribe
  POST   /api/v1/model-portfolios/subscriptions/{id}/assign        – Assign to account
  POST   /api/v1/model-portfolios                                  – Create model
  GET    /api/v1/model-portfolios                                  – List models
  GET    /api/v1/model-portfolios/{id}                             – Get model
  PATCH  /api/v1/model-portfolios/{id}                             – Update model
  DELETE /api/v1/model-portfolios/{id}                             – Delete model
  POST   /api/v1/model-portfolios/{id}/holdings                   – Add holding
  PATCH  /api/v1/model-portfolios/{id}/holdings/{hid}             – Update holding
  DELETE /api/v1/model-portfolios/{id}/holdings/{hid}             – Remove holding
  GET    /api/v1/model-portfolios/{id}/holdings/validate          – Validate 100%
  POST   /api/v1/model-portfolios/{id}/publish                    – Publish to marketplace
  POST   /api/v1/model-portfolios/{id}/subscribe                  – Subscribe
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session
from backend.models.model_portfolio_marketplace import (
    ModelStatus,
    RebalanceSignalStatus,
)
from backend.services.model_portfolio import ModelPortfolioService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/model-portfolios",
    tags=["Model Portfolio Marketplace"],
)


# ============================================================================
# PYDANTIC SCHEMAS (inline, following existing codebase pattern)
# ============================================================================


class _MPBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Request schemas ─────────────────────────────────────────────


class ModelCreate(BaseModel):
    name: str
    ticker: Optional[str] = None
    description: Optional[str] = None
    category: str = "balanced"
    risk_level: int = Field(5, ge=1, le=10)
    investment_style: Optional[str] = None
    target_return: Optional[float] = None
    target_volatility: Optional[float] = None
    benchmark_symbol: Optional[str] = None
    rebalance_frequency: str = "quarterly"
    drift_threshold_pct: float = 5.0
    tax_loss_harvesting_enabled: bool = False
    tags: List[str] = []


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    risk_level: Optional[int] = None
    investment_style: Optional[str] = None
    drift_threshold_pct: Optional[float] = None
    rebalance_frequency: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    tags: Optional[List[str]] = None


class HoldingCreate(BaseModel):
    symbol: str
    security_name: str
    security_type: str = "etf"
    asset_class: str = "us_equity"
    sub_asset_class: Optional[str] = None
    target_weight_pct: float
    min_weight_pct: Optional[float] = None
    max_weight_pct: Optional[float] = None
    expense_ratio: Optional[float] = None


class HoldingUpdate(BaseModel):
    target_weight_pct: Optional[float] = None
    asset_class: Optional[str] = None
    min_weight_pct: Optional[float] = None
    max_weight_pct: Optional[float] = None
    expense_ratio: Optional[float] = None


class PublishRequest(BaseModel):
    subscription_fee_monthly: Optional[float] = None
    subscription_fee_annual: Optional[float] = None


class AssignmentCreate(BaseModel):
    account_id: UUID
    client_id: Optional[UUID] = None


class ApproveSignalRequest(BaseModel):
    notes: Optional[str] = None


class RejectSignalRequest(BaseModel):
    reason: str


class ExecuteSignalRequest(BaseModel):
    execution_details: Dict[str, Any]


# ── Response schemas ────────────────────────────────────────────


class HoldingResponse(_MPBase):
    id: UUID
    model_id: UUID
    symbol: str
    security_name: str
    security_type: str
    asset_class: str
    sub_asset_class: Optional[str] = None
    target_weight_pct: float
    min_weight_pct: Optional[float] = None
    max_weight_pct: Optional[float] = None
    expense_ratio: Optional[float] = None
    created_at: Optional[datetime] = None


class ModelResponse(_MPBase):
    id: UUID
    advisor_id: UUID
    name: str
    ticker: Optional[str] = None
    description: Optional[str] = None
    category: str
    risk_level: int
    investment_style: Optional[str] = None
    status: str
    visibility: str
    rebalance_frequency: str
    drift_threshold_pct: float
    tax_loss_harvesting_enabled: bool = False
    benchmark_symbol: Optional[str] = None
    target_return: Optional[float] = None
    target_volatility: Optional[float] = None
    tags: Optional[List[str]] = None
    # Performance
    ytd_return: Optional[float] = None
    one_year_return: Optional[float] = None
    three_year_return: Optional[float] = None
    inception_return: Optional[float] = None
    inception_date: Optional[str] = None
    # Marketplace
    subscription_fee_monthly: Optional[float] = None
    subscription_fee_annual: Optional[float] = None
    total_subscribers: int = 0
    total_aum: float = 0
    # Nested holdings
    holdings: List[HoldingResponse] = []
    created_at: Optional[datetime] = None


class HoldingsValidation(BaseModel):
    total_weight: float
    is_valid: bool
    difference: float


class SubscriptionResponse(_MPBase):
    id: UUID
    model_id: UUID
    subscriber_advisor_id: UUID
    status: str
    custom_drift_threshold: Optional[float] = None
    cancelled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class AssignmentResponse(_MPBase):
    id: UUID
    subscription_id: UUID
    account_id: UUID
    model_id: UUID
    client_id: Optional[UUID] = None
    assigned_by: UUID
    is_active: bool = True
    account_value: Optional[float] = None
    current_drift_pct: Optional[float] = None
    max_holding_drift_pct: Optional[float] = None
    last_rebalanced_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class RebalanceSignalResponse(_MPBase):
    id: UUID
    assignment_id: UUID
    model_id: UUID
    account_id: UUID
    advisor_id: UUID
    trigger_type: str
    trigger_value: Optional[float] = None
    status: str
    account_value: float = 0
    cash_available: float = 0
    total_drift_pct: float = 0
    drift_details: Optional[Dict[str, Any]] = None
    trades_required: Optional[List[Dict[str, Any]]] = None
    estimated_trades_count: int = 0
    estimated_buy_value: float = 0
    estimated_sell_value: float = 0
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ============================================================================
# HELPERS
# ============================================================================


def _model_to_dict(m) -> dict:  # noqa: ANN001
    """Convert a MarketplaceModelPortfolio ORM object to a safe dict."""
    holdings_list = []
    for h in (m.holdings or []):
        holdings_list.append(
            HoldingResponse(
                id=h.id,
                model_id=h.model_id,
                symbol=h.symbol,
                security_name=h.security_name,
                security_type=h.security_type,
                asset_class=(
                    h.asset_class.value
                    if hasattr(h.asset_class, "value")
                    else str(h.asset_class)
                ),
                sub_asset_class=h.sub_asset_class,
                target_weight_pct=float(h.target_weight_pct),
                min_weight_pct=(
                    float(h.min_weight_pct)
                    if h.min_weight_pct is not None
                    else None
                ),
                max_weight_pct=(
                    float(h.max_weight_pct)
                    if h.max_weight_pct is not None
                    else None
                ),
                expense_ratio=(
                    float(h.expense_ratio)
                    if h.expense_ratio is not None
                    else None
                ),
                created_at=h.created_at if hasattr(h, "created_at") else None,
            ).model_dump()
        )

    return ModelResponse(
        id=m.id,
        advisor_id=m.advisor_id,
        name=m.name,
        ticker=m.ticker,
        description=m.description,
        category=m.category,
        risk_level=m.risk_level,
        investment_style=m.investment_style,
        status=m.status.value if hasattr(m.status, "value") else str(m.status),
        visibility=(
            m.visibility.value
            if hasattr(m.visibility, "value")
            else str(m.visibility)
        ),
        rebalance_frequency=m.rebalance_frequency,
        drift_threshold_pct=float(m.drift_threshold_pct),
        tax_loss_harvesting_enabled=m.tax_loss_harvesting_enabled,
        benchmark_symbol=m.benchmark_symbol,
        target_return=(
            float(m.target_return) if m.target_return is not None else None
        ),
        target_volatility=(
            float(m.target_volatility)
            if m.target_volatility is not None
            else None
        ),
        tags=m.tags,
        ytd_return=(
            float(m.ytd_return) if m.ytd_return is not None else None
        ),
        one_year_return=(
            float(m.one_year_return)
            if m.one_year_return is not None
            else None
        ),
        three_year_return=(
            float(m.three_year_return)
            if m.three_year_return is not None
            else None
        ),
        inception_return=(
            float(m.inception_return)
            if m.inception_return is not None
            else None
        ),
        inception_date=(
            m.inception_date.isoformat() if m.inception_date else None
        ),
        subscription_fee_monthly=(
            float(m.subscription_fee_monthly)
            if m.subscription_fee_monthly is not None
            else None
        ),
        subscription_fee_annual=(
            float(m.subscription_fee_annual)
            if m.subscription_fee_annual is not None
            else None
        ),
        total_subscribers=m.total_subscribers or 0,
        total_aum=float(m.total_aum or 0),
        holdings=holdings_list,
        created_at=m.created_at,
    ).model_dump()


def _holding_to_dict(h) -> dict:  # noqa: ANN001
    return HoldingResponse(
        id=h.id,
        model_id=h.model_id,
        symbol=h.symbol,
        security_name=h.security_name,
        security_type=h.security_type,
        asset_class=(
            h.asset_class.value
            if hasattr(h.asset_class, "value")
            else str(h.asset_class)
        ),
        sub_asset_class=h.sub_asset_class,
        target_weight_pct=float(h.target_weight_pct),
        min_weight_pct=(
            float(h.min_weight_pct)
            if h.min_weight_pct is not None
            else None
        ),
        max_weight_pct=(
            float(h.max_weight_pct)
            if h.max_weight_pct is not None
            else None
        ),
        expense_ratio=(
            float(h.expense_ratio)
            if h.expense_ratio is not None
            else None
        ),
        created_at=h.created_at if hasattr(h, "created_at") else None,
    ).model_dump()


def _subscription_to_dict(s) -> dict:  # noqa: ANN001
    return SubscriptionResponse(
        id=s.id,
        model_id=s.model_id,
        subscriber_advisor_id=s.subscriber_advisor_id,
        status=s.status,
        custom_drift_threshold=(
            float(s.custom_drift_threshold)
            if s.custom_drift_threshold is not None
            else None
        ),
        cancelled_at=s.cancelled_at,
        created_at=s.created_at,
    ).model_dump()


def _assignment_to_dict(a) -> dict:  # noqa: ANN001
    return AssignmentResponse(
        id=a.id,
        subscription_id=a.subscription_id,
        account_id=a.account_id,
        model_id=a.model_id,
        client_id=a.client_id,
        assigned_by=a.assigned_by,
        is_active=a.is_active,
        account_value=(
            float(a.account_value) if a.account_value is not None else None
        ),
        current_drift_pct=(
            float(a.current_drift_pct)
            if a.current_drift_pct is not None
            else None
        ),
        max_holding_drift_pct=(
            float(a.max_holding_drift_pct)
            if a.max_holding_drift_pct is not None
            else None
        ),
        last_rebalanced_at=a.last_rebalanced_at,
        last_synced_at=a.last_synced_at,
        created_at=a.created_at,
    ).model_dump()


def _signal_to_dict(s) -> dict:  # noqa: ANN001
    return RebalanceSignalResponse(
        id=s.id,
        assignment_id=s.assignment_id,
        model_id=s.model_id,
        account_id=s.account_id,
        advisor_id=s.advisor_id,
        trigger_type=s.trigger_type,
        trigger_value=(
            float(s.trigger_value) if s.trigger_value is not None else None
        ),
        status=(
            s.status.value if hasattr(s.status, "value") else str(s.status)
        ),
        account_value=float(s.account_value or 0),
        cash_available=float(s.cash_available or 0),
        total_drift_pct=float(s.total_drift_pct or 0),
        drift_details=s.drift_details,
        trades_required=s.trades_required,
        estimated_trades_count=s.estimated_trades_count or 0,
        estimated_buy_value=float(s.estimated_buy_value or 0),
        estimated_sell_value=float(s.estimated_sell_value or 0),
        notes=s.notes,
        rejection_reason=s.rejection_reason,
        approved_at=s.approved_at,
        executed_at=s.executed_at,
        expires_at=s.expires_at,
        created_at=s.created_at,
    ).model_dump()


# ============================================================================
# MARKETPLACE (static paths — must come BEFORE /{model_id})
# ============================================================================


@router.get("/marketplace/browse")
async def browse_marketplace(
    category: Optional[str] = None,
    risk_level_min: Optional[int] = Query(None, ge=1, le=10),
    risk_level_max: Optional[int] = Query(None, ge=1, le=10),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Browse marketplace models."""
    try:
        service = ModelPortfolioService(db)
        models = await service.list_marketplace(
            category, risk_level_min, risk_level_max, search
        )
        return {
            "models": [_model_to_dict(m) for m in models],
            "total": len(models),
        }
    except Exception:
        from backend.services.mock_data_store import marketplace_response
        return marketplace_response()


# ============================================================================
# ASSIGNMENTS (static path)
# ============================================================================


@router.get("/assignments")
async def list_assignments(
    model_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List account model assignments."""
    try:
        advisor_id = UUID(current_user["id"])
        service = ModelPortfolioService(db)
        assignments = await service.get_account_assignments(
            advisor_id, model_id
        )
        return {
            "assignments": [_assignment_to_dict(a) for a in assignments],
            "total": len(assignments),
        }
    except Exception:
        from backend.services.mock_data_store import model_assignments_response
        return model_assignments_response()


# ============================================================================
# REBALANCING (static paths)
# ============================================================================


@router.post("/rebalance/check")
async def check_drift(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Check all assignments for drift and generate signals."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    signals = await service.rebalance.check_all_assignments(advisor_id)
    return {
        "signals_generated": len(signals),
        "signals": [_signal_to_dict(s) for s in signals],
    }


@router.get("/rebalance/signals")
async def list_rebalance_signals(
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List pending rebalance signals."""
    try:
        advisor_id = UUID(current_user["id"])
        service = ModelPortfolioService(db)
        signals = await service.rebalance.get_pending_signals(advisor_id)
        return {
            "signals": [_signal_to_dict(s) for s in signals],
            "total": len(signals),
            "pending": len(signals),
        }
    except Exception:
        from backend.services.mock_data_store import rebalance_signals_response
        return rebalance_signals_response()


@router.post("/rebalance/signals/{signal_id}/approve")
async def approve_signal(
    signal_id: UUID,
    request: ApproveSignalRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Approve a rebalance signal."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    try:
        signal = await service.rebalance.approve_signal(
            signal_id, advisor_id, request.notes
        )
        return _signal_to_dict(signal)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/rebalance/signals/{signal_id}/reject")
async def reject_signal(
    signal_id: UUID,
    request: RejectSignalRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Reject a rebalance signal."""
    service = ModelPortfolioService(db)
    try:
        signal = await service.rebalance.reject_signal(
            signal_id, request.reason
        )
        return _signal_to_dict(signal)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/rebalance/signals/{signal_id}/execute")
async def mark_signal_executed(
    signal_id: UUID,
    request: ExecuteSignalRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark a rebalance signal as executed."""
    service = ModelPortfolioService(db)
    try:
        signal = await service.rebalance.mark_executed(
            signal_id, request.execution_details
        )
        return _signal_to_dict(signal)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ============================================================================
# SUBSCRIPTIONS (static prefix — before /{model_id})
# ============================================================================


@router.delete("/subscriptions/{subscription_id}", status_code=204)
async def unsubscribe(
    subscription_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Unsubscribe from a model."""
    service = ModelPortfolioService(db)
    await service.unsubscribe(subscription_id)


@router.post("/subscriptions/{subscription_id}/assign")
async def assign_model_to_account(
    subscription_id: UUID,
    request: AssignmentCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Assign model to a client account."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    try:
        assignment = await service.assign_model_to_account(
            subscription_id,
            request.account_id,
            advisor_id,
            request.client_id,
        )
        return _assignment_to_dict(assignment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ============================================================================
# MODEL CRUD (parameterised — must come AFTER static paths)
# ============================================================================


@router.post("")
async def create_model(
    request: ModelCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create a new model portfolio."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    model = await service.create_model(
        advisor_id, request.model_dump()
    )
    return _model_to_dict(model)


@router.get("")
async def list_models(
    status: Optional[str] = None,
    include_subscribed: bool = True,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List own and subscribed model portfolios."""
    try:
        advisor_id = UUID(current_user["id"])
        service = ModelPortfolioService(db)
        models = await service.list_models(
            advisor_id,
            ModelStatus(status) if status else None,
            include_subscribed,
        )
        return {
            "models": [_model_to_dict(m) for m in models],
            "total": len(models),
        }
    except Exception:
        from backend.services.mock_data_store import model_list_response
        return model_list_response()


@router.get("/{model_id}")
async def get_model(
    model_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get a model portfolio with holdings."""
    service = ModelPortfolioService(db)
    model = await service.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return _model_to_dict(model)


@router.patch("/{model_id}")
async def update_model(
    model_id: UUID,
    request: ModelUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update a model portfolio."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    model = await service.get_model(model_id, include_holdings=False)
    if not model or model.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        updated = await service.update_model(
            model_id, request.model_dump(exclude_none=True)
        )
        return _model_to_dict(updated)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{model_id}", status_code=204)
async def delete_model(
    model_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Delete a model portfolio."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    model = await service.get_model(model_id, include_holdings=False)
    if not model or model.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Model not found")
    await service.delete_model(model_id)


# ============================================================================
# HOLDINGS (under /{model_id})
# ============================================================================


@router.post("/{model_id}/holdings")
async def add_holding(
    model_id: UUID,
    request: HoldingCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Add a holding to a model."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    model = await service.get_model(model_id, include_holdings=False)
    if not model or model.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Model not found")
    holding = await service.add_holding(
        model_id, request.model_dump()
    )
    return _holding_to_dict(holding)


@router.patch("/{model_id}/holdings/{holding_id}")
async def update_holding(
    model_id: UUID,
    holding_id: UUID,
    request: HoldingUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update a holding."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    model = await service.get_model(model_id, include_holdings=False)
    if not model or model.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        holding = await service.update_holding(
            holding_id, request.model_dump(exclude_none=True)
        )
        return _holding_to_dict(holding)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/{model_id}/holdings/{holding_id}", status_code=204)
async def remove_holding(
    model_id: UUID,
    holding_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Remove a holding."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    model = await service.get_model(model_id, include_holdings=False)
    if not model or model.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Model not found")
    await service.remove_holding(holding_id)


@router.get("/{model_id}/holdings/validate")
async def validate_holdings(
    model_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Validate holdings sum to 100%."""
    service = ModelPortfolioService(db)
    return await service.validate_holdings(model_id)


# ============================================================================
# PUBLISH & SUBSCRIBE (under /{model_id})
# ============================================================================


@router.post("/{model_id}/publish")
async def publish_to_marketplace(
    model_id: UUID,
    request: PublishRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Publish model to marketplace."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    model = await service.get_model(model_id, include_holdings=False)
    if not model or model.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        fee_monthly = (
            Decimal(str(request.subscription_fee_monthly))
            if request.subscription_fee_monthly is not None
            else None
        )
        fee_annual = (
            Decimal(str(request.subscription_fee_annual))
            if request.subscription_fee_annual is not None
            else None
        )
        updated = await service.publish_to_marketplace(
            model_id, fee_monthly, fee_annual
        )
        return _model_to_dict(updated)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{model_id}/subscribe")
async def subscribe_to_model(
    model_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Subscribe to a model portfolio."""
    advisor_id = UUID(current_user["id"])
    service = ModelPortfolioService(db)
    try:
        subscription = await service.subscribe(model_id, advisor_id)
        return _subscription_to_dict(subscription)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
