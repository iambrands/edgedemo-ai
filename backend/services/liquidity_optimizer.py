"""
Liquidity Optimizer Service.
AI-powered tax-optimized withdrawal planning with multiple strategy options.
"""

import json
import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import anthropic
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.liquidity import (
    LiquidityProfile, WithdrawalRequest, WithdrawalPlan, WithdrawalLineItem,
    TaxLot, CashFlow, WithdrawalPriority, LotSelectionMethod, WithdrawalStatus
)
from backend.models.account import Account
from backend.models.position import Position

logger = logging.getLogger(__name__)


class LiquidityOptimizer:
    """
    AI-powered liquidity and withdrawal optimization service.
    
    Provides tax-optimized withdrawal planning with multiple strategies:
    - Tax-Optimized (AI-powered)
    - Allocation Preserving (pro-rata)
    - Tax Loss Harvesting (maximize loss harvesting)
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
            logger.warning("ANTHROPIC_API_KEY not set - AI features disabled")

    # ==================== PROFILE MANAGEMENT ====================

    async def get_or_create_profile(self, client_id: UUID) -> LiquidityProfile:
        """Get or create liquidity profile for a client."""
        result = await self.db.execute(
            select(LiquidityProfile).where(LiquidityProfile.client_id == client_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            profile = LiquidityProfile(client_id=client_id)
            self.db.add(profile)
            await self.db.commit()
            await self.db.refresh(profile)

        return profile

    async def update_profile(
        self, client_id: UUID, updates: Dict[str, Any]
    ) -> LiquidityProfile:
        """Update liquidity profile settings."""
        profile = await self.get_or_create_profile(client_id)

        for key, value in updates.items():
            if hasattr(profile, key):
                setattr(profile, key, value)

        profile.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_profile(self, client_id: UUID) -> Optional[LiquidityProfile]:
        """Get liquidity profile for a client."""
        result = await self.db.execute(
            select(LiquidityProfile).where(LiquidityProfile.client_id == client_id)
        )
        return result.scalar_one_or_none()

    # ==================== TAX LOT MANAGEMENT ====================

    async def sync_tax_lots(
        self, account_id: UUID, lots_data: List[Dict]
    ) -> List[TaxLot]:
        """Sync tax lots from broker data."""
        # Verify account exists
        result = await self.db.execute(
            select(Account).where(Account.id == account_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise ValueError(f"Account {account_id} not found")

        # Deactivate existing lots
        existing_result = await self.db.execute(
            select(TaxLot).where(TaxLot.account_id == account_id)
        )
        existing_lots = existing_result.scalars().all()
        for lot in existing_lots:
            lot.is_active = False

        synced_lots = []
        for lot_data in lots_data:
            # Find existing lot by broker_lot_id
            broker_lot_id = lot_data.get("lot_id")
            lot = None
            if broker_lot_id:
                result = await self.db.execute(
                    select(TaxLot).where(
                        TaxLot.account_id == account_id,
                        TaxLot.broker_lot_id == broker_lot_id
                    )
                )
                lot = result.scalar_one_or_none()

            if not lot:
                lot = TaxLot(account_id=account_id)
                self.db.add(lot)

            # Update lot data
            lot.broker_lot_id = broker_lot_id
            lot.symbol = lot_data.get("symbol", "")
            lot.shares = Decimal(str(lot_data.get("shares", 0)))
            lot.cost_basis_per_share = Decimal(str(lot_data.get("cost_basis_per_share", 0)))
            lot.total_cost_basis = lot.shares * lot.cost_basis_per_share

            acquisition_date = lot_data.get("acquisition_date")
            if acquisition_date and isinstance(acquisition_date, str):
                lot.acquisition_date = datetime.fromisoformat(acquisition_date).date()
            elif acquisition_date:
                lot.acquisition_date = acquisition_date

            lot.acquisition_method = lot_data.get("acquisition_method", "purchase")

            current_price = lot_data.get("current_price")
            if current_price is not None:
                lot.current_price = Decimal(str(current_price))
                lot.current_value = lot.shares * lot.current_price
                lot.unrealized_gain_loss = lot.current_value - lot.total_cost_basis

            # Calculate holding period
            if lot.acquisition_date:
                days_held = (datetime.utcnow().date() - lot.acquisition_date).days
                lot.days_held = days_held
                lot.is_short_term = days_held < 366

            lot.is_active = True
            lot.updated_at = datetime.utcnow()
            synced_lots.append(lot)

        await self.db.commit()
        return synced_lots

    async def get_lots_for_symbol(
        self, account_id: UUID, symbol: str
    ) -> List[TaxLot]:
        """Get all active tax lots for a symbol in an account."""
        result = await self.db.execute(
            select(TaxLot)
            .where(
                TaxLot.account_id == account_id,
                TaxLot.symbol == symbol,
                TaxLot.is_active == True,
                TaxLot.shares > 0
            )
            .order_by(TaxLot.acquisition_date)
        )
        return list(result.scalars().all())

    async def get_account_lots(self, account_id: UUID) -> List[TaxLot]:
        """Get all active tax lots for an account."""
        result = await self.db.execute(
            select(TaxLot)
            .where(TaxLot.account_id == account_id, TaxLot.is_active == True)
            .order_by(TaxLot.symbol, TaxLot.acquisition_date)
        )
        return list(result.scalars().all())

    # ==================== WITHDRAWAL OPTIMIZATION ====================

    async def create_withdrawal_request(
        self,
        client_id: UUID,
        amount: float,
        requested_by: UUID,
        purpose: Optional[str] = None,
        priority: Optional[WithdrawalPriority] = None,
        lot_selection: Optional[LotSelectionMethod] = None,
        requested_date: Optional[datetime] = None
    ) -> WithdrawalRequest:
        """Create a new withdrawal request and generate optimized plans."""

        profile = await self.get_or_create_profile(client_id)

        request = WithdrawalRequest(
            liquidity_profile_id=profile.id,
            client_id=client_id,
            requested_amount=Decimal(str(amount)),
            requested_date=requested_date or (datetime.utcnow() + timedelta(days=3)),
            purpose=purpose,
            priority=priority or profile.default_priority,
            lot_selection=lot_selection or profile.default_lot_selection,
            status=WithdrawalStatus.DRAFT,
            requested_by=requested_by
        )
        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)

        # Generate optimized plans
        await self._generate_withdrawal_plans(request, profile)

        return request

    async def _generate_withdrawal_plans(
        self,
        request: WithdrawalRequest,
        profile: LiquidityProfile
    ) -> List[WithdrawalPlan]:
        """Generate multiple withdrawal plan options."""

        # Get client's accounts
        accounts_result = await self.db.execute(
            select(Account).where(Account.client_id == request.client_id)
        )
        accounts = list(accounts_result.scalars().all())

        # Get positions for each account
        positions_by_account: Dict[UUID, List[Position]] = {}
        for account in accounts:
            positions_result = await self.db.execute(
                select(Position).where(Position.account_id == account.id)
            )
            positions_by_account[account.id] = list(positions_result.scalars().all())

        plans = []

        # Plan 1: Tax-Optimized (use AI)
        tax_plan = await self._generate_tax_optimized_plan(
            request, profile, accounts, positions_by_account
        )
        tax_plan.is_recommended = True
        plans.append(tax_plan)

        # Plan 2: Preserve Allocation (pro-rata across all positions)
        allocation_plan = await self._generate_allocation_preserving_plan(
            request, profile, accounts, positions_by_account
        )
        plans.append(allocation_plan)

        # Plan 3: Maximum Tax Loss Harvesting (if applicable)
        if (
            profile.ytd_short_term_gains > 0
            or profile.ytd_long_term_gains > 0
        ):
            tlh_plan = await self._generate_loss_harvesting_plan(
                request, profile, accounts, positions_by_account
            )
            plans.append(tlh_plan)

        # Set recommended plan
        request.optimized_plan_id = tax_plan.id
        await self.db.commit()

        return plans

    async def _generate_tax_optimized_plan(
        self,
        request: WithdrawalRequest,
        profile: LiquidityProfile,
        accounts: List[Account],
        positions_by_account: Dict[UUID, List[Position]]
    ) -> WithdrawalPlan:
        """Use AI to generate tax-optimized withdrawal plan."""

        # Prepare data for AI
        portfolio_data = self._prepare_portfolio_data(accounts, positions_by_account)

        # Create plan first (we'll update with AI results)
        plan = WithdrawalPlan(
            request_id=request.id,
            plan_name="Tax-Optimized",
            total_amount=request.requested_amount,
            ai_generated=True
        )
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)

        # If no AI client, return basic plan
        if not self.client:
            logger.warning("No AI client available, returning basic tax-optimized plan")
            plan.ai_reasoning = "AI optimization not available - using basic strategy"
            await self.db.commit()
            return plan

        prompt = f"""Analyze this portfolio and create a tax-optimized withdrawal plan for ${float(request.requested_amount):,.2f}.

PORTFOLIO DATA:
{json.dumps(portfolio_data, indent=2, default=str)}

CLIENT TAX SITUATION:
- Federal bracket: {float(profile.federal_tax_bracket or Decimal('0.24')):.0%}
- State rate: {float(profile.state_tax_rate or Decimal('0')):.0%}
- Short-term cap gains rate: {float(profile.capital_gains_rate_short):.0%}
- Long-term cap gains rate: {float(profile.capital_gains_rate_long):.0%}
- YTD short-term gains: ${float(profile.ytd_short_term_gains):,.2f}
- YTD long-term gains: ${float(profile.ytd_long_term_gains):,.2f}
- YTD short-term losses: ${float(profile.ytd_short_term_losses):,.2f}
- YTD long-term losses: ${float(profile.ytd_long_term_losses):,.2f}
- Loss carryforward: ${float(profile.loss_carryforward):,.2f}

CONSTRAINTS:
- Min cash reserve: ${float(profile.min_cash_reserve):,.2f}
- Max single position liquidation: {float(profile.max_single_position_liquidation_pct):.0%}
- Avoid wash sales: {profile.avoid_wash_sales}

Create a withdrawal plan that minimizes tax impact. Consider:
1. Use cash/money market first
2. Harvest losses to offset gains
3. Prefer long-term gains over short-term
4. Consider account type (taxable vs tax-advantaged)
5. Maintain target allocation as much as possible

Return JSON:
{{
    "reasoning": "Explanation of the strategy...",
    "line_items": [
        {{
            "account_id": "uuid-string",
            "symbol": "AAPL",
            "shares_to_sell": 10.5,
            "estimated_proceeds": 1575.00,
            "cost_basis": 1200.00,
            "gain_loss": 375.00,
            "is_short_term": false,
            "lot_preference": "HIFO"
        }}
    ],
    "estimated_tax_cost": 56.25,
    "alternatives_considered": ["Sell VTI instead - higher tax cost", "..."]
}}

Return ONLY valid JSON."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            content_text = response.content[0].text

            # Parse JSON from response
            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0]
            elif "```" in content_text:
                content_text = content_text.split("```")[1].split("```")[0]

            ai_result = json.loads(content_text.strip())

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            ai_result = {"reasoning": "AI parsing failed", "line_items": []}
        except Exception as e:
            logger.error(f"AI call failed: {e}")
            ai_result = {"reasoning": f"AI call failed: {str(e)}", "line_items": []}

        # Update plan with AI results
        plan.ai_reasoning = ai_result.get("reasoning")
        plan.ai_alternatives_considered = ai_result.get("alternatives_considered")
        plan.estimated_tax_cost = Decimal(str(ai_result.get("estimated_tax_cost", 0)))

        # Create line items
        total_st_gains = Decimal("0")
        total_lt_gains = Decimal("0")
        total_st_losses = Decimal("0")
        total_lt_losses = Decimal("0")

        for idx, item in enumerate(ai_result.get("line_items", [])):
            gain_loss = Decimal(str(item.get("gain_loss", 0)))
            is_short = item.get("is_short_term", False)

            if gain_loss > 0:
                if is_short:
                    total_st_gains += gain_loss
                else:
                    total_lt_gains += gain_loss
            else:
                if is_short:
                    total_st_losses += abs(gain_loss)
                else:
                    total_lt_losses += abs(gain_loss)

            # Parse account_id (may be string UUID)
            account_id_str = item.get("account_id")
            account_id = None
            if account_id_str:
                try:
                    account_id = UUID(account_id_str) if isinstance(account_id_str, str) else account_id_str
                except ValueError:
                    pass

            line_item = WithdrawalLineItem(
                plan_id=plan.id,
                account_id=account_id,
                symbol=item.get("symbol", "UNKNOWN"),
                shares_to_sell=Decimal(str(item.get("shares_to_sell", 0))),
                estimated_proceeds=Decimal(str(item.get("estimated_proceeds", 0))),
                cost_basis=Decimal(str(item.get("cost_basis", 0))) if item.get("cost_basis") else None,
                estimated_gain_loss=gain_loss,
                is_short_term=is_short,
                sequence=idx
            )
            self.db.add(line_item)

        plan.estimated_short_term_gains = total_st_gains
        plan.estimated_long_term_gains = total_lt_gains
        plan.estimated_short_term_losses = total_st_losses
        plan.estimated_long_term_losses = total_lt_losses

        await self.db.commit()
        return plan

    async def _generate_allocation_preserving_plan(
        self,
        request: WithdrawalRequest,
        profile: LiquidityProfile,
        accounts: List[Account],
        positions_by_account: Dict[UUID, List[Position]]
    ) -> WithdrawalPlan:
        """Generate plan that maintains current allocation (pro-rata)."""

        plan = WithdrawalPlan(
            request_id=request.id,
            plan_name="Preserve Allocation",
            total_amount=request.requested_amount,
            ai_generated=False
        )
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)

        # Calculate total portfolio value
        total_value = Decimal("0")
        for account_id, positions in positions_by_account.items():
            total_value += sum(p.market_value or Decimal("0") for p in positions)

        if total_value == 0:
            return plan

        # Withdrawal percentage
        withdrawal_pct = request.requested_amount / total_value

        # Create pro-rata line items
        sequence = 0
        for account_id, positions in positions_by_account.items():
            for position in positions:
                if not position.market_value or position.market_value <= 0:
                    continue

                shares_to_sell = (position.quantity or Decimal("0")) * withdrawal_pct
                proceeds = (position.market_value or Decimal("0")) * withdrawal_pct

                if shares_to_sell > Decimal("0.001"):  # Minimum threshold
                    line_item = WithdrawalLineItem(
                        plan_id=plan.id,
                        account_id=account_id,
                        position_id=position.id,
                        symbol=position.ticker or position.security_name[:20],
                        shares_to_sell=shares_to_sell,
                        estimated_proceeds=proceeds,
                        sequence=sequence
                    )
                    self.db.add(line_item)
                    sequence += 1

        await self.db.commit()
        return plan

    async def _generate_loss_harvesting_plan(
        self,
        request: WithdrawalRequest,
        profile: LiquidityProfile,
        accounts: List[Account],
        positions_by_account: Dict[UUID, List[Position]]
    ) -> WithdrawalPlan:
        """Generate plan that maximizes tax loss harvesting."""

        plan = WithdrawalPlan(
            request_id=request.id,
            plan_name="Tax Loss Harvest",
            total_amount=request.requested_amount,
            ai_generated=False
        )
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)

        # Find positions with losses
        loss_positions: List[Dict[str, Any]] = []
        for account_id, positions in positions_by_account.items():
            for position in positions:
                market_value = position.market_value or Decimal("0")
                cost_basis = position.cost_basis or market_value
                gain_loss = market_value - cost_basis
                if gain_loss < 0:
                    loss_positions.append({
                        "account_id": account_id,
                        "position": position,
                        "loss": gain_loss
                    })

        # Sort by loss (largest loss first)
        loss_positions.sort(key=lambda x: x["loss"])

        # Create line items prioritizing losses
        remaining = request.requested_amount
        sequence = 0
        total_losses = Decimal("0")

        for pos in loss_positions:
            if remaining <= 0:
                break

            position = pos["position"]
            market_value = position.market_value or Decimal("0")
            proceeds = min(market_value, remaining)
            shares_pct = proceeds / market_value if market_value > 0 else Decimal("0")
            shares_to_sell = (position.quantity or Decimal("0")) * shares_pct
            loss = pos["loss"] * shares_pct

            line_item = WithdrawalLineItem(
                plan_id=plan.id,
                account_id=pos["account_id"],
                position_id=position.id,
                symbol=position.ticker or position.security_name[:20],
                shares_to_sell=shares_to_sell,
                estimated_proceeds=proceeds,
                estimated_gain_loss=loss,
                sequence=sequence
            )
            self.db.add(line_item)

            remaining -= proceeds
            total_losses += abs(loss)
            sequence += 1

        # Rough 50/50 split estimate between short/long term
        plan.estimated_short_term_losses = total_losses / 2
        plan.estimated_long_term_losses = total_losses / 2

        await self.db.commit()
        return plan

    def _prepare_portfolio_data(
        self,
        accounts: List[Account],
        positions_by_account: Dict[UUID, List[Position]]
    ) -> Dict[str, Any]:
        """Prepare portfolio data for AI analysis."""

        data: Dict[str, Any] = {"accounts": []}

        for account in accounts:
            account_data = {
                "id": str(account.id),
                "name": account.account_number_masked or f"Account {str(account.id)[:8]}",
                "type": account.account_type,
                "tax_type": account.tax_type,
                "custodian": account.custodian,
                "holdings": []
            }

            for position in positions_by_account.get(account.id, []):
                cost_basis = position.cost_basis or position.market_value or Decimal("0")
                market_value = position.market_value or Decimal("0")
                gain_loss = market_value - cost_basis

                account_data["holdings"].append({
                    "symbol": position.ticker or position.security_name[:20],
                    "shares": float(position.quantity or 0),
                    "current_price": float(position.market_price or 0),
                    "market_value": float(market_value),
                    "cost_basis": float(cost_basis),
                    "unrealized_gain_loss": float(gain_loss),
                    "asset_class": position.asset_class
                })

            data["accounts"].append(account_data)

        return data

    # ==================== PLAN MANAGEMENT ====================

    async def get_request(self, request_id: UUID) -> Optional[WithdrawalRequest]:
        """Get withdrawal request by ID."""
        result = await self.db.execute(
            select(WithdrawalRequest)
            .options(selectinload(WithdrawalRequest.plans))
            .where(WithdrawalRequest.id == request_id)
        )
        return result.scalar_one_or_none()

    async def get_client_requests(
        self,
        client_id: UUID,
        status: Optional[WithdrawalStatus] = None
    ) -> List[WithdrawalRequest]:
        """Get all withdrawal requests for a client."""
        query = select(WithdrawalRequest).where(
            WithdrawalRequest.client_id == client_id
        )
        if status:
            query = query.where(WithdrawalRequest.status == status)
        query = query.order_by(desc(WithdrawalRequest.created_at))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_all_requests(
        self,
        status: Optional[WithdrawalStatus] = None,
        limit: int = 50
    ) -> List[WithdrawalRequest]:
        """List all withdrawal requests with optional status filter."""
        query = select(WithdrawalRequest)
        if status:
            query = query.where(WithdrawalRequest.status == status)
        query = query.order_by(desc(WithdrawalRequest.created_at)).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_plan(self, plan_id: UUID) -> Optional[WithdrawalPlan]:
        """Get withdrawal plan by ID."""
        result = await self.db.execute(
            select(WithdrawalPlan)
            .options(selectinload(WithdrawalPlan.line_items))
            .where(WithdrawalPlan.id == plan_id)
        )
        return result.scalar_one_or_none()

    async def get_plans_for_request(self, request_id: UUID) -> List[WithdrawalPlan]:
        """Get all plans for a withdrawal request."""
        result = await self.db.execute(
            select(WithdrawalPlan)
            .options(selectinload(WithdrawalPlan.line_items))
            .where(WithdrawalPlan.request_id == request_id)
        )
        return list(result.scalars().all())

    async def approve_request(
        self,
        request_id: UUID,
        approver_id: UUID,
        plan_id: Optional[UUID] = None
    ) -> WithdrawalRequest:
        """Approve a withdrawal request with selected plan."""
        request = await self.get_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        if plan_id:
            request.optimized_plan_id = plan_id

        request.status = WithdrawalStatus.APPROVED
        request.approved_by = approver_id
        request.approved_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(request)
        return request

    async def reject_request(
        self,
        request_id: UUID,
        reason: Optional[str] = None
    ) -> WithdrawalRequest:
        """Reject/cancel a withdrawal request."""
        request = await self.get_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        request.status = WithdrawalStatus.CANCELLED
        if reason:
            request.notes = (request.notes or "") + f"\nCancelled: {reason}"

        await self.db.commit()
        await self.db.refresh(request)
        return request

    async def execute_plan(self, plan_id: UUID) -> WithdrawalPlan:
        """Mark plan as executing (actual execution via broker integration)."""
        plan = await self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        # Get the request
        request = await self.get_request(plan.request_id)
        if request:
            request.status = WithdrawalStatus.EXECUTING
            await self.db.commit()

        # TODO: Integrate with broker API to execute trades
        logger.info(f"Plan {plan_id} marked for execution - broker integration pending")

        return plan

    async def complete_request(
        self,
        request_id: UUID,
        actual_amounts: Optional[Dict[str, Decimal]] = None
    ) -> WithdrawalRequest:
        """Mark request as completed after execution."""
        request = await self.get_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        request.status = WithdrawalStatus.COMPLETED
        request.completed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(request)
        return request

    # ==================== CASH FLOW MANAGEMENT ====================

    async def add_cash_flow(
        self,
        client_id: UUID,
        flow_type: str,
        amount: float,
        expected_date: datetime,
        description: Optional[str] = None,
        account_id: Optional[UUID] = None,
        is_recurring: bool = False,
        recurrence_pattern: Optional[str] = None
    ) -> CashFlow:
        """Add a projected cash flow."""
        from backend.models.liquidity import CashFlowType

        profile = await self.get_or_create_profile(client_id)

        cash_flow = CashFlow(
            liquidity_profile_id=profile.id,
            account_id=account_id,
            flow_type=CashFlowType(flow_type),
            description=description,
            amount=Decimal(str(amount)),
            expected_date=expected_date.date() if isinstance(expected_date, datetime) else expected_date,
            is_recurring=is_recurring,
            recurrence_pattern=recurrence_pattern,
            is_projected=True
        )
        self.db.add(cash_flow)
        await self.db.commit()
        await self.db.refresh(cash_flow)
        return cash_flow

    async def get_cash_flows(
        self,
        client_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[CashFlow]:
        """Get cash flows for a client within a date range."""
        profile = await self.get_profile(client_id)
        if not profile:
            return []

        query = select(CashFlow).where(CashFlow.liquidity_profile_id == profile.id)

        if start_date:
            query = query.where(CashFlow.expected_date >= start_date.date())
        if end_date:
            query = query.where(CashFlow.expected_date <= end_date.date())

        query = query.order_by(CashFlow.expected_date)
        result = await self.db.execute(query)
        return list(result.scalars().all())
