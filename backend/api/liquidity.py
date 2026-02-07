"""
Liquidity Optimizer API endpoints.
Provides tax-optimized withdrawal planning and management.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.models import get_db_session
from backend.models.liquidity import (
    WithdrawalPriority,
    LotSelectionMethod,
    WithdrawalStatus,
    CashFlowType,
)
from backend.services.liquidity_optimizer import LiquidityOptimizer


router = APIRouter(prefix="/api/v1/liquidity", tags=["Liquidity Optimization"])


# ============================================================================
# SCHEMAS
# ============================================================================

class ProfileUpdate(BaseModel):
    """Liquidity profile update request."""
    default_priority: Optional[str] = None
    default_lot_selection: Optional[str] = None
    federal_tax_bracket: Optional[float] = None
    state_tax_rate: Optional[float] = None
    capital_gains_rate_short: Optional[float] = None
    capital_gains_rate_long: Optional[float] = None
    min_cash_reserve: Optional[float] = None
    max_single_position_liquidation_pct: Optional[float] = None
    avoid_wash_sales: Optional[bool] = None
    ytd_short_term_gains: Optional[float] = None
    ytd_long_term_gains: Optional[float] = None
    ytd_short_term_losses: Optional[float] = None
    ytd_long_term_losses: Optional[float] = None
    loss_carryforward: Optional[float] = None


class ProfileResponse(BaseModel):
    """Liquidity profile response."""
    id: str
    client_id: str
    default_priority: str
    default_lot_selection: str
    federal_tax_bracket: Optional[float]
    state_tax_rate: Optional[float]
    capital_gains_rate_short: float
    capital_gains_rate_long: float
    min_cash_reserve: float
    max_single_position_liquidation_pct: float
    avoid_wash_sales: bool
    ytd_short_term_gains: float
    ytd_long_term_gains: float
    ytd_short_term_losses: float
    ytd_long_term_losses: float
    loss_carryforward: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaxLotItem(BaseModel):
    """Individual tax lot data for syncing."""
    lot_id: Optional[str] = None
    symbol: str
    shares: float
    cost_basis_per_share: float
    acquisition_date: Optional[datetime] = None
    acquisition_method: Optional[str] = "purchase"
    current_price: Optional[float] = None


class TaxLotSyncRequest(BaseModel):
    """Tax lot sync wrapper."""
    lots: List[TaxLotItem]


class TaxLotResponse(BaseModel):
    """Tax lot response."""
    id: str
    account_id: str
    broker_lot_id: Optional[str]
    symbol: str
    shares: float
    cost_basis_per_share: float
    total_cost_basis: float
    acquisition_date: Optional[datetime]
    acquisition_method: str
    current_price: Optional[float]
    current_value: Optional[float]
    unrealized_gain_loss: Optional[float]
    days_held: Optional[int]
    is_short_term: bool
    is_active: bool

    class Config:
        from_attributes = True


class WithdrawalRequestCreate(BaseModel):
    """Withdrawal request creation."""
    client_id: str
    amount: float = Field(..., gt=0)
    purpose: Optional[str] = None
    priority: Optional[str] = None
    lot_selection: Optional[str] = None
    requested_date: Optional[datetime] = None


class LineItemResponse(BaseModel):
    """Withdrawal line item response."""
    id: str
    account_id: Optional[str]
    symbol: str
    shares_to_sell: float
    estimated_proceeds: float
    cost_basis: Optional[float]
    estimated_gain_loss: Optional[float]
    is_short_term: Optional[bool]
    sequence: int
    executed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlanResponse(BaseModel):
    """Withdrawal plan response."""
    id: str
    request_id: str
    plan_name: str
    is_recommended: bool
    total_amount: float
    estimated_tax_cost: Optional[float]
    estimated_short_term_gains: float
    estimated_long_term_gains: float
    estimated_short_term_losses: float
    estimated_long_term_losses: float
    ai_generated: bool
    ai_reasoning: Optional[str]
    line_items: List[LineItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class WithdrawalRequestResponse(BaseModel):
    """Withdrawal request response with embedded plans."""
    id: str
    client_id: str
    requested_amount: float
    requested_date: datetime
    purpose: Optional[str]
    priority: str
    lot_selection: str
    status: str
    optimized_plan_id: Optional[str]
    requested_by: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    completed_at: Optional[datetime]
    plans: List[PlanResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApproveRequest(BaseModel):
    """Request approval payload."""
    plan_id: Optional[str] = None


class CashFlowCreate(BaseModel):
    """Cash flow creation."""
    client_id: str
    flow_type: str
    amount: float
    expected_date: datetime
    description: Optional[str] = None
    account_id: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None


class CashFlowResponse(BaseModel):
    """Cash flow response."""
    id: str
    flow_type: str
    description: Optional[str]
    amount: float
    expected_date: datetime
    actual_date: Optional[datetime]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    is_projected: bool
    is_confirmed: bool

    class Config:
        from_attributes = True


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def profile_to_response(profile) -> ProfileResponse:
    """Convert profile model to response."""
    return ProfileResponse(
        id=str(profile.id),
        client_id=str(profile.client_id),
        default_priority=profile.default_priority.value,
        default_lot_selection=profile.default_lot_selection.value,
        federal_tax_bracket=float(profile.federal_tax_bracket) if profile.federal_tax_bracket else None,
        state_tax_rate=float(profile.state_tax_rate) if profile.state_tax_rate else None,
        capital_gains_rate_short=float(profile.capital_gains_rate_short),
        capital_gains_rate_long=float(profile.capital_gains_rate_long),
        min_cash_reserve=float(profile.min_cash_reserve),
        max_single_position_liquidation_pct=float(profile.max_single_position_liquidation_pct),
        avoid_wash_sales=profile.avoid_wash_sales,
        ytd_short_term_gains=float(profile.ytd_short_term_gains),
        ytd_long_term_gains=float(profile.ytd_long_term_gains),
        ytd_short_term_losses=float(profile.ytd_short_term_losses),
        ytd_long_term_losses=float(profile.ytd_long_term_losses),
        loss_carryforward=float(profile.loss_carryforward),
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def lot_to_response(lot) -> TaxLotResponse:
    """Convert tax lot model to response."""
    return TaxLotResponse(
        id=str(lot.id),
        account_id=str(lot.account_id),
        broker_lot_id=lot.broker_lot_id,
        symbol=lot.symbol,
        shares=float(lot.shares),
        cost_basis_per_share=float(lot.cost_basis_per_share),
        total_cost_basis=float(lot.total_cost_basis),
        acquisition_date=lot.acquisition_date,
        acquisition_method=lot.acquisition_method,
        current_price=float(lot.current_price) if lot.current_price else None,
        current_value=float(lot.current_value) if lot.current_value else None,
        unrealized_gain_loss=float(lot.unrealized_gain_loss) if lot.unrealized_gain_loss else None,
        days_held=lot.days_held,
        is_short_term=lot.is_short_term,
        is_active=lot.is_active,
    )


def line_item_to_response(item) -> LineItemResponse:
    """Convert line item model to response."""
    return LineItemResponse(
        id=str(item.id),
        account_id=str(item.account_id) if item.account_id else None,
        symbol=item.symbol,
        shares_to_sell=float(item.shares_to_sell),
        estimated_proceeds=float(item.estimated_proceeds),
        cost_basis=float(item.cost_basis) if item.cost_basis else None,
        estimated_gain_loss=float(item.estimated_gain_loss) if item.estimated_gain_loss else None,
        is_short_term=item.is_short_term,
        sequence=item.sequence,
        executed_at=item.executed_at,
    )


def plan_to_response(plan, include_line_items: bool = True) -> PlanResponse:
    """Convert plan model to response."""
    line_items = []
    if include_line_items and hasattr(plan, "line_items") and plan.line_items:
        line_items = [line_item_to_response(item) for item in plan.line_items]

    return PlanResponse(
        id=str(plan.id),
        request_id=str(plan.request_id),
        plan_name=plan.plan_name,
        is_recommended=plan.is_recommended,
        total_amount=float(plan.total_amount),
        estimated_tax_cost=float(plan.estimated_tax_cost) if plan.estimated_tax_cost else None,
        estimated_short_term_gains=float(plan.estimated_short_term_gains),
        estimated_long_term_gains=float(plan.estimated_long_term_gains),
        estimated_short_term_losses=float(plan.estimated_short_term_losses),
        estimated_long_term_losses=float(plan.estimated_long_term_losses),
        ai_generated=plan.ai_generated,
        ai_reasoning=plan.ai_reasoning,
        line_items=line_items,
        created_at=plan.created_at,
    )


def request_to_response(
    req, plans: Optional[list] = None, include_line_items: bool = True
) -> WithdrawalRequestResponse:
    """Convert request model to response with embedded plans."""
    plan_responses = []
    if plans:
        plan_responses = [
            plan_to_response(p, include_line_items=include_line_items)
            for p in plans
        ]

    return WithdrawalRequestResponse(
        id=str(req.id),
        client_id=str(req.client_id),
        requested_amount=float(req.requested_amount),
        requested_date=req.requested_date,
        purpose=req.purpose,
        priority=req.priority.value,
        lot_selection=req.lot_selection.value,
        status=req.status.value,
        optimized_plan_id=str(req.optimized_plan_id) if req.optimized_plan_id else None,
        requested_by=str(req.requested_by),
        approved_by=str(req.approved_by) if req.approved_by else None,
        approved_at=req.approved_at,
        completed_at=req.completed_at,
        plans=plan_responses,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


def cashflow_to_response(cf) -> CashFlowResponse:
    """Convert cash flow model to response."""
    return CashFlowResponse(
        id=str(cf.id),
        flow_type=cf.flow_type.value,
        description=cf.description,
        amount=float(cf.amount),
        expected_date=cf.expected_date,
        actual_date=cf.actual_date,
        is_recurring=cf.is_recurring,
        recurrence_pattern=cf.recurrence_pattern,
        is_projected=cf.is_projected,
        is_confirmed=cf.is_confirmed,
    )


def _parse_profile_updates(updates: ProfileUpdate) -> dict:
    """Parse profile update request into a dict with proper types."""
    update_dict = {}
    for key, value in updates.model_dump(exclude_unset=True).items():
        if key == "default_priority" and value:
            update_dict[key] = WithdrawalPriority(value)
        elif key == "default_lot_selection" and value:
            update_dict[key] = LotSelectionMethod(value)
        elif value is not None:
            if isinstance(value, float):
                update_dict[key] = Decimal(str(value))
            else:
                update_dict[key] = value
    return update_dict


# ============================================================================
# PROFILE ENDPOINTS
# ============================================================================

@router.get("/profile/{client_id}", response_model=None)
async def get_profile(
    client_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get liquidity profile for a client."""
    try:
        optimizer = LiquidityOptimizer(db)
        profile = await optimizer.get_or_create_profile(UUID(client_id))
        return profile_to_response(profile)
    except Exception:
        from backend.services.mock_data_store import liquidity_profile_response
        return liquidity_profile_response(client_id)


@router.put("/profile/{client_id}", response_model=ProfileResponse)
async def update_profile_put(
    client_id: str,
    updates: ProfileUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update liquidity profile settings (PUT)."""
    optimizer = LiquidityOptimizer(db)
    update_dict = _parse_profile_updates(updates)
    profile = await optimizer.update_profile(UUID(client_id), update_dict)
    return profile_to_response(profile)


@router.patch("/profile/{client_id}", response_model=ProfileResponse)
async def update_profile_patch(
    client_id: str,
    updates: ProfileUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update liquidity profile settings (PATCH - partial update)."""
    optimizer = LiquidityOptimizer(db)
    update_dict = _parse_profile_updates(updates)
    profile = await optimizer.update_profile(UUID(client_id), update_dict)
    return profile_to_response(profile)


# ============================================================================
# TAX LOT ENDPOINTS
# ============================================================================

@router.get("/tax-lots/{account_id}", response_model=List[TaxLotResponse])
async def get_tax_lots(
    account_id: str,
    symbol: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get tax lots for an account, optionally filtered by symbol."""
    optimizer = LiquidityOptimizer(db)
    if symbol:
        lots = await optimizer.get_lots_for_symbol(UUID(account_id), symbol.upper())
    else:
        lots = await optimizer.get_account_lots(UUID(account_id))
    return [lot_to_response(lot) for lot in lots]


@router.get("/tax-lots/{account_id}/{symbol}", response_model=List[TaxLotResponse])
async def get_lots_for_symbol(
    account_id: str,
    symbol: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get tax lots for a specific symbol in an account."""
    optimizer = LiquidityOptimizer(db)
    lots = await optimizer.get_lots_for_symbol(UUID(account_id), symbol.upper())
    return [lot_to_response(lot) for lot in lots]


@router.post("/tax-lots/{account_id}/sync")
async def sync_tax_lots(
    account_id: str,
    data: TaxLotSyncRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Sync tax lots from broker data."""
    optimizer = LiquidityOptimizer(db)

    try:
        lots_data = [lot.model_dump() for lot in data.lots]
        lots = await optimizer.sync_tax_lots(UUID(account_id), lots_data)
        return {
            "synced": len(lots),
            "message": "Tax lots synced successfully",
            "lots": [lot_to_response(lot) for lot in lots],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# WITHDRAWAL REQUEST ENDPOINTS
# ============================================================================

@router.post("/withdrawals", response_model=WithdrawalRequestResponse)
async def create_withdrawal_request(
    request: WithdrawalRequestCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create a new withdrawal request and generate optimized plans."""
    optimizer = LiquidityOptimizer(db)

    priority = WithdrawalPriority(request.priority) if request.priority else None
    lot_selection = LotSelectionMethod(request.lot_selection) if request.lot_selection else None

    try:
        withdrawal = await optimizer.create_withdrawal_request(
            client_id=UUID(request.client_id),
            amount=request.amount,
            requested_by=UUID(current_user["user_id"]),
            purpose=request.purpose,
            priority=priority,
            lot_selection=lot_selection,
            requested_date=request.requested_date,
        )

        # Load plans with line items for the response
        plans = await optimizer.get_plans_for_request(withdrawal.id)
        return request_to_response(withdrawal, plans=plans, include_line_items=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/withdrawals", response_model=None)
async def list_withdrawal_requests(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """List withdrawal requests with optional filters."""
    try:
        optimizer = LiquidityOptimizer(db)

        status_enum = WithdrawalStatus(status) if status else None

        if client_id:
            requests = await optimizer.get_client_requests(UUID(client_id), status_enum)
        else:
            requests = await optimizer.list_all_requests(status=status_enum, limit=50)

        results = []
        for req in requests:
            # Load plans without line items for list view (performance)
            plans = await optimizer.get_plans_for_request(req.id)
            results.append(
                request_to_response(req, plans=plans, include_line_items=False)
            )
        return results
    except Exception:
        from backend.services.mock_data_store import liquidity_withdrawals_response
        return liquidity_withdrawals_response()


@router.get("/withdrawals/{request_id}", response_model=WithdrawalRequestResponse)
async def get_withdrawal_request(
    request_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific withdrawal request with all plans and line items."""
    optimizer = LiquidityOptimizer(db)
    req = await optimizer.get_request(UUID(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    plans = await optimizer.get_plans_for_request(req.id)
    return request_to_response(req, plans=plans, include_line_items=True)


@router.get("/withdrawals/client/{client_id}", response_model=List[WithdrawalRequestResponse])
async def get_client_withdrawals(
    client_id: str,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get all withdrawal requests for a specific client."""
    optimizer = LiquidityOptimizer(db)

    status_enum = WithdrawalStatus(status) if status else None
    requests = await optimizer.get_client_requests(UUID(client_id), status_enum)

    results = []
    for req in requests:
        plans = await optimizer.get_plans_for_request(req.id)
        results.append(
            request_to_response(req, plans=plans, include_line_items=False)
        )
    return results


@router.get("/withdrawals/{request_id}/plans", response_model=List[PlanResponse])
async def get_withdrawal_plans(
    request_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get all plans for a withdrawal request."""
    optimizer = LiquidityOptimizer(db)
    plans = await optimizer.get_plans_for_request(UUID(request_id))
    return [plan_to_response(p) for p in plans]


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get a specific withdrawal plan with line items."""
    optimizer = LiquidityOptimizer(db)
    plan = await optimizer.get_plan(UUID(plan_id))
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan_to_response(plan)


@router.post("/withdrawals/{request_id}/approve")
async def approve_withdrawal(
    request_id: str,
    approval: ApproveRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Approve a withdrawal request with optional plan selection."""
    optimizer = LiquidityOptimizer(db)

    try:
        plan_id = UUID(approval.plan_id) if approval.plan_id else None
        req = await optimizer.approve_request(
            request_id=UUID(request_id),
            approver_id=UUID(current_user["user_id"]),
            plan_id=plan_id,
        )
        return {"status": "approved", "request_id": str(req.id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/withdrawals/{request_id}/execute")
async def execute_withdrawal(
    request_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Execute an approved withdrawal request's selected plan."""
    optimizer = LiquidityOptimizer(db)

    req = await optimizer.get_request(UUID(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != WithdrawalStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail="Request must be approved before execution",
        )

    if not req.optimized_plan_id:
        raise HTTPException(
            status_code=400,
            detail="No plan selected for execution",
        )

    try:
        plan = await optimizer.execute_plan(req.optimized_plan_id)
        return {"status": "executing", "plan_id": str(plan.id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/withdrawals/{request_id}/cancel")
async def cancel_withdrawal(
    request_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Cancel a withdrawal request."""
    optimizer = LiquidityOptimizer(db)

    req = await optimizer.get_request(UUID(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status in [WithdrawalStatus.COMPLETED, WithdrawalStatus.EXECUTING]:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel completed or executing request",
        )

    try:
        cancelled = await optimizer.reject_request(UUID(request_id), reason)
        return {"status": "cancelled", "request_id": str(cancelled.id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/withdrawals/{request_id}/reject")
async def reject_withdrawal(
    request_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Reject a withdrawal request (alias for cancel)."""
    optimizer = LiquidityOptimizer(db)

    try:
        req = await optimizer.reject_request(UUID(request_id), reason)
        return {"status": "rejected", "request_id": str(req.id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/plans/{plan_id}/execute", response_model=PlanResponse)
async def execute_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark a specific plan for execution."""
    optimizer = LiquidityOptimizer(db)
    try:
        plan = await optimizer.execute_plan(UUID(plan_id))
        return plan_to_response(plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/withdrawals/{request_id}/complete")
async def complete_withdrawal(
    request_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark a withdrawal request as completed."""
    optimizer = LiquidityOptimizer(db)
    try:
        req = await optimizer.complete_request(UUID(request_id))
        return {"status": "completed", "request_id": str(req.id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# CASH FLOW ENDPOINTS
# ============================================================================

@router.post("/cash-flows", response_model=CashFlowResponse)
async def create_cash_flow(
    request: CashFlowCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Add a projected cash flow."""
    optimizer = LiquidityOptimizer(db)

    cash_flow = await optimizer.add_cash_flow(
        client_id=UUID(request.client_id),
        flow_type=request.flow_type,
        amount=request.amount,
        expected_date=request.expected_date,
        description=request.description,
        account_id=UUID(request.account_id) if request.account_id else None,
        is_recurring=request.is_recurring,
        recurrence_pattern=request.recurrence_pattern,
    )
    return cashflow_to_response(cash_flow)


@router.get("/cash-flows/{client_id}", response_model=List[CashFlowResponse])
async def get_cash_flows(
    client_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get cash flows for a client within an optional date range."""
    optimizer = LiquidityOptimizer(db)
    cash_flows = await optimizer.get_cash_flows(
        UUID(client_id),
        start_date=start_date,
        end_date=end_date,
    )
    return [cashflow_to_response(cf) for cf in cash_flows]
