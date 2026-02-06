"""
Liquidity Optimizer API endpoints.
Provides tax-optimized withdrawal planning and management.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
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


router = APIRouter(prefix="/api/v1/liquidity", tags=["Liquidity Optimizer"])


# ============================================================================
# SCHEMAS
# ============================================================================

class ProfileUpdate(BaseModel):
    """Liquidity profile update request."""
    federal_tax_bracket: Optional[float] = None
    state_tax_rate: Optional[float] = None
    capital_gains_rate_short: Optional[float] = None
    capital_gains_rate_long: Optional[float] = None
    ytd_short_term_gains: Optional[float] = None
    ytd_long_term_gains: Optional[float] = None
    ytd_short_term_losses: Optional[float] = None
    ytd_long_term_losses: Optional[float] = None
    loss_carryforward: Optional[float] = None
    min_cash_reserve: Optional[float] = None
    max_single_position_liquidation_pct: Optional[float] = None
    default_priority: Optional[str] = None
    default_lot_selection: Optional[str] = None
    avoid_wash_sales: Optional[bool] = None


class ProfileResponse(BaseModel):
    """Liquidity profile response."""
    id: str
    client_id: str
    federal_tax_bracket: Optional[float]
    state_tax_rate: Optional[float]
    capital_gains_rate_short: float
    capital_gains_rate_long: float
    ytd_short_term_gains: float
    ytd_long_term_gains: float
    ytd_short_term_losses: float
    ytd_long_term_losses: float
    loss_carryforward: float
    min_cash_reserve: float
    max_single_position_liquidation_pct: float
    default_priority: str
    default_lot_selection: str
    avoid_wash_sales: bool
    created_at: datetime
    updated_at: datetime


class TaxLotSync(BaseModel):
    """Tax lot data for syncing."""
    lot_id: Optional[str] = None
    symbol: str
    shares: float
    cost_basis_per_share: float
    acquisition_date: Optional[datetime] = None
    acquisition_method: Optional[str] = "purchase"
    current_price: Optional[float] = None


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


class PlanResponse(BaseModel):
    """Withdrawal plan response."""
    id: str
    request_id: str
    plan_name: str
    total_amount: float
    is_recommended: bool
    ai_generated: bool
    ai_reasoning: Optional[str]
    estimated_tax_cost: Optional[float]
    estimated_short_term_gains: float
    estimated_long_term_gains: float
    estimated_short_term_losses: float
    estimated_long_term_losses: float
    line_items: List[LineItemResponse]
    created_at: datetime


class WithdrawalRequestResponse(BaseModel):
    """Withdrawal request response."""
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
    created_at: datetime
    updated_at: datetime


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


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def profile_to_response(profile) -> ProfileResponse:
    """Convert profile model to response."""
    return ProfileResponse(
        id=str(profile.id),
        client_id=str(profile.client_id),
        federal_tax_bracket=float(profile.federal_tax_bracket) if profile.federal_tax_bracket else None,
        state_tax_rate=float(profile.state_tax_rate) if profile.state_tax_rate else None,
        capital_gains_rate_short=float(profile.capital_gains_rate_short),
        capital_gains_rate_long=float(profile.capital_gains_rate_long),
        ytd_short_term_gains=float(profile.ytd_short_term_gains),
        ytd_long_term_gains=float(profile.ytd_long_term_gains),
        ytd_short_term_losses=float(profile.ytd_short_term_losses),
        ytd_long_term_losses=float(profile.ytd_long_term_losses),
        loss_carryforward=float(profile.loss_carryforward),
        min_cash_reserve=float(profile.min_cash_reserve),
        max_single_position_liquidation_pct=float(profile.max_single_position_liquidation_pct),
        default_priority=profile.default_priority.value,
        default_lot_selection=profile.default_lot_selection.value,
        avoid_wash_sales=profile.avoid_wash_sales,
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


def plan_to_response(plan) -> PlanResponse:
    """Convert plan model to response."""
    line_items = []
    for item in plan.line_items:
        line_items.append(LineItemResponse(
            id=str(item.id),
            account_id=str(item.account_id) if item.account_id else None,
            symbol=item.symbol,
            shares_to_sell=float(item.shares_to_sell),
            estimated_proceeds=float(item.estimated_proceeds),
            cost_basis=float(item.cost_basis) if item.cost_basis else None,
            estimated_gain_loss=float(item.estimated_gain_loss) if item.estimated_gain_loss else None,
            is_short_term=item.is_short_term,
            sequence=item.sequence,
        ))
    
    return PlanResponse(
        id=str(plan.id),
        request_id=str(plan.request_id),
        plan_name=plan.plan_name,
        total_amount=float(plan.total_amount),
        is_recommended=plan.is_recommended,
        ai_generated=plan.ai_generated,
        ai_reasoning=plan.ai_reasoning,
        estimated_tax_cost=float(plan.estimated_tax_cost) if plan.estimated_tax_cost else None,
        estimated_short_term_gains=float(plan.estimated_short_term_gains),
        estimated_long_term_gains=float(plan.estimated_long_term_gains),
        estimated_short_term_losses=float(plan.estimated_short_term_losses),
        estimated_long_term_losses=float(plan.estimated_long_term_losses),
        line_items=line_items,
        created_at=plan.created_at,
    )


def request_to_response(request) -> WithdrawalRequestResponse:
    """Convert request model to response."""
    return WithdrawalRequestResponse(
        id=str(request.id),
        client_id=str(request.client_id),
        requested_amount=float(request.requested_amount),
        requested_date=request.requested_date,
        purpose=request.purpose,
        priority=request.priority.value,
        lot_selection=request.lot_selection.value,
        status=request.status.value,
        optimized_plan_id=str(request.optimized_plan_id) if request.optimized_plan_id else None,
        requested_by=str(request.requested_by),
        approved_by=str(request.approved_by) if request.approved_by else None,
        approved_at=request.approved_at,
        completed_at=request.completed_at,
        created_at=request.created_at,
        updated_at=request.updated_at,
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


# ============================================================================
# PROFILE ENDPOINTS
# ============================================================================

@router.get("/profile/{client_id}", response_model=ProfileResponse)
async def get_profile(
    client_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get or create liquidity profile for a client."""
    optimizer = LiquidityOptimizer(db)
    profile = await optimizer.get_or_create_profile(UUID(client_id))
    return profile_to_response(profile)


@router.put("/profile/{client_id}", response_model=ProfileResponse)
async def update_profile(
    client_id: str,
    updates: ProfileUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Update liquidity profile settings."""
    optimizer = LiquidityOptimizer(db)
    
    # Convert to dict, filter None values, and handle enums
    update_dict = {}
    for key, value in updates.model_dump(exclude_none=True).items():
        if key == "default_priority" and value:
            update_dict[key] = WithdrawalPriority(value)
        elif key == "default_lot_selection" and value:
            update_dict[key] = LotSelectionMethod(value)
        elif value is not None:
            # Convert floats to Decimal for numeric fields
            if isinstance(value, float):
                update_dict[key] = Decimal(str(value))
            else:
                update_dict[key] = value
    
    profile = await optimizer.update_profile(UUID(client_id), update_dict)
    return profile_to_response(profile)


# ============================================================================
# TAX LOT ENDPOINTS
# ============================================================================

@router.post("/tax-lots/{account_id}/sync", response_model=List[TaxLotResponse])
async def sync_tax_lots(
    account_id: str,
    lots: List[TaxLotSync],
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Sync tax lots from broker data."""
    optimizer = LiquidityOptimizer(db)
    
    lots_data = [lot.model_dump() for lot in lots]
    synced = await optimizer.sync_tax_lots(UUID(account_id), lots_data)
    return [lot_to_response(lot) for lot in synced]


@router.get("/tax-lots/{account_id}", response_model=List[TaxLotResponse])
async def get_account_lots(
    account_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get all active tax lots for an account."""
    optimizer = LiquidityOptimizer(db)
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


# ============================================================================
# WITHDRAWAL REQUEST ENDPOINTS
# ============================================================================

@router.post("/withdrawals", response_model=WithdrawalRequestResponse)
async def create_withdrawal_request(
    request: WithdrawalRequestCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Create a new withdrawal request with optimized plans."""
    optimizer = LiquidityOptimizer(db)
    
    priority = WithdrawalPriority(request.priority) if request.priority else None
    lot_selection = LotSelectionMethod(request.lot_selection) if request.lot_selection else None
    
    withdrawal = await optimizer.create_withdrawal_request(
        client_id=UUID(request.client_id),
        amount=request.amount,
        requested_by=UUID(current_user["user_id"]),
        purpose=request.purpose,
        priority=priority,
        lot_selection=lot_selection,
        requested_date=request.requested_date,
    )
    return request_to_response(withdrawal)


@router.get("/withdrawals/{request_id}", response_model=WithdrawalRequestResponse)
async def get_withdrawal_request(
    request_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get withdrawal request by ID."""
    optimizer = LiquidityOptimizer(db)
    withdrawal = await optimizer.get_request(UUID(request_id))
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    return request_to_response(withdrawal)


@router.get("/withdrawals/client/{client_id}", response_model=List[WithdrawalRequestResponse])
async def get_client_withdrawals(
    client_id: str,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Get all withdrawal requests for a client."""
    optimizer = LiquidityOptimizer(db)
    
    status_enum = WithdrawalStatus(status) if status else None
    withdrawals = await optimizer.get_client_requests(UUID(client_id), status_enum)
    return [request_to_response(w) for w in withdrawals]


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
    """Get a specific withdrawal plan."""
    optimizer = LiquidityOptimizer(db)
    plan = await optimizer.get_plan(UUID(plan_id))
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan_to_response(plan)


@router.post("/withdrawals/{request_id}/approve", response_model=WithdrawalRequestResponse)
async def approve_withdrawal(
    request_id: str,
    approval: ApproveRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Approve a withdrawal request."""
    optimizer = LiquidityOptimizer(db)
    
    plan_id = UUID(approval.plan_id) if approval.plan_id else None
    withdrawal = await optimizer.approve_request(
        request_id=UUID(request_id),
        approver_id=UUID(current_user["user_id"]),
        plan_id=plan_id,
    )
    return request_to_response(withdrawal)


@router.post("/withdrawals/{request_id}/reject", response_model=WithdrawalRequestResponse)
async def reject_withdrawal(
    request_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Reject/cancel a withdrawal request."""
    optimizer = LiquidityOptimizer(db)
    withdrawal = await optimizer.reject_request(UUID(request_id), reason)
    return request_to_response(withdrawal)


@router.post("/plans/{plan_id}/execute", response_model=PlanResponse)
async def execute_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark a plan for execution."""
    optimizer = LiquidityOptimizer(db)
    plan = await optimizer.execute_plan(UUID(plan_id))
    return plan_to_response(plan)


@router.post("/withdrawals/{request_id}/complete", response_model=WithdrawalRequestResponse)
async def complete_withdrawal(
    request_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user),
):
    """Mark a withdrawal request as completed."""
    optimizer = LiquidityOptimizer(db)
    withdrawal = await optimizer.complete_request(UUID(request_id))
    return request_to_response(withdrawal)


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
    """Get cash flows for a client."""
    optimizer = LiquidityOptimizer(db)
    cash_flows = await optimizer.get_cash_flows(
        UUID(client_id),
        start_date=start_date,
        end_date=end_date,
    )
    return [cashflow_to_response(cf) for cf in cash_flows]
