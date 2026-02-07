"""
Main model portfolio service.

CRUD operations, holdings management, marketplace listing,
subscription management, and account assignment.
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.model_portfolio_marketplace import (
    AccountModelAssignment,
    AssetClassType,
    MarketplaceModelHolding,
    MarketplaceModelPortfolio,
    ModelPerformanceHistory,
    ModelStatus,
    ModelSubscription,
    ModelVisibility,
)

from .drift_calculator import DriftCalculator
from .rebalance_service import RebalanceService

logger = logging.getLogger(__name__)


class ModelPortfolioService:
    """Main service for model portfolio operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.rebalance = RebalanceService(db)
        self.drift_calc = DriftCalculator(db)

    # ─────────────────────────────────────────────────────────────
    # Model CRUD
    # ─────────────────────────────────────────────────────────────

    async def create_model(
        self, advisor_id: UUID, data: Dict[str, Any]
    ) -> MarketplaceModelPortfolio:
        """Create a new model portfolio."""
        model = MarketplaceModelPortfolio(
            advisor_id=advisor_id,
            name=data["name"],
            ticker=data.get("ticker"),
            description=data.get("description"),
            category=data.get("category", "balanced"),
            risk_level=data.get("risk_level", 5),
            investment_style=data.get("investment_style"),
            target_return=(
                Decimal(str(data["target_return"]))
                if data.get("target_return")
                else None
            ),
            target_volatility=(
                Decimal(str(data["target_volatility"]))
                if data.get("target_volatility")
                else None
            ),
            benchmark_symbol=data.get("benchmark_symbol"),
            rebalance_frequency=data.get(
                "rebalance_frequency", "quarterly"
            ),
            drift_threshold_pct=Decimal(
                str(data.get("drift_threshold_pct", 5))
            ),
            tax_loss_harvesting_enabled=data.get(
                "tax_loss_harvesting_enabled", False
            ),
            tags=data.get("tags", []),
            status=ModelStatus.DRAFT,
            visibility=ModelVisibility.PRIVATE,
            inception_date=date.today(),
        )

        self.db.add(model)
        await self.db.commit()
        await self.db.refresh(model)
        return model

    async def update_model(
        self, model_id: UUID, data: Dict[str, Any]
    ) -> MarketplaceModelPortfolio:
        """Update a model portfolio."""
        model = await self.get_model(model_id)
        if not model:
            raise ValueError("Model not found")

        for key, value in data.items():
            if not hasattr(model, key) or value is None:
                continue
            if key in (
                "target_return",
                "target_volatility",
                "drift_threshold_pct",
            ):
                value = Decimal(str(value))
            elif key == "status":
                value = ModelStatus(value)
            elif key == "visibility":
                value = ModelVisibility(value)
            setattr(model, key, value)

        await self.db.commit()
        return model

    async def get_model(
        self,
        model_id: UUID,
        include_holdings: bool = True,
    ) -> Optional[MarketplaceModelPortfolio]:
        """Get a model portfolio by ID."""
        query = select(MarketplaceModelPortfolio).where(
            MarketplaceModelPortfolio.id == model_id
        )
        if include_holdings:
            query = query.options(
                selectinload(MarketplaceModelPortfolio.holdings)
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_models(
        self,
        advisor_id: UUID,
        status: Optional[ModelStatus] = None,
        include_subscribed: bool = True,
    ) -> List[MarketplaceModelPortfolio]:
        """List models owned by or subscribed to by an advisor."""

        # Own models
        query = select(MarketplaceModelPortfolio).where(
            MarketplaceModelPortfolio.advisor_id == advisor_id
        )
        if status:
            query = query.where(
                MarketplaceModelPortfolio.status == status
            )
        result = await self.db.execute(
            query.options(
                selectinload(MarketplaceModelPortfolio.holdings)
            )
        )
        own_models = list(result.scalars().all())

        if not include_subscribed:
            return own_models

        # Subscribed models
        sub_query = (
            select(MarketplaceModelPortfolio)
            .join(ModelSubscription)
            .where(
                and_(
                    ModelSubscription.subscriber_advisor_id
                    == advisor_id,
                    ModelSubscription.status == "active",
                )
            )
            .options(
                selectinload(MarketplaceModelPortfolio.holdings)
            )
        )
        if status:
            sub_query = sub_query.where(
                MarketplaceModelPortfolio.status == status
            )
        sub_result = await self.db.execute(sub_query)
        subscribed_models = list(sub_result.scalars().all())

        # Combine & deduplicate
        model_ids = {m.id for m in own_models}
        for m in subscribed_models:
            if m.id not in model_ids:
                own_models.append(m)
        return own_models

    async def delete_model(self, model_id: UUID) -> bool:
        """Delete a model portfolio."""
        model = await self.get_model(
            model_id, include_holdings=False
        )
        if not model:
            return False
        await self.db.delete(model)
        await self.db.commit()
        return True

    # ─────────────────────────────────────────────────────────────
    # Holdings Management
    # ─────────────────────────────────────────────────────────────

    async def add_holding(
        self, model_id: UUID, data: Dict[str, Any]
    ) -> MarketplaceModelHolding:
        """Add a holding to a model."""
        holding = MarketplaceModelHolding(
            model_id=model_id,
            symbol=data["symbol"].upper(),
            security_name=data["security_name"],
            security_type=data.get("security_type", "etf"),
            asset_class=AssetClassType(
                data.get("asset_class", "us_equity")
            ),
            sub_asset_class=data.get("sub_asset_class"),
            target_weight_pct=Decimal(
                str(data["target_weight_pct"])
            ),
            min_weight_pct=(
                Decimal(str(data["min_weight_pct"]))
                if data.get("min_weight_pct")
                else None
            ),
            max_weight_pct=(
                Decimal(str(data["max_weight_pct"]))
                if data.get("max_weight_pct")
                else None
            ),
            expense_ratio=(
                Decimal(str(data["expense_ratio"]))
                if data.get("expense_ratio")
                else None
            ),
        )

        self.db.add(holding)
        await self.db.commit()
        await self.db.refresh(holding)
        return holding

    async def update_holding(
        self, holding_id: UUID, data: Dict[str, Any]
    ) -> MarketplaceModelHolding:
        """Update a model holding."""
        result = await self.db.execute(
            select(MarketplaceModelHolding).where(
                MarketplaceModelHolding.id == holding_id
            )
        )
        holding = result.scalar_one_or_none()
        if not holding:
            raise ValueError("Holding not found")

        for key, value in data.items():
            if not hasattr(holding, key) or value is None:
                continue
            if key in (
                "target_weight_pct",
                "min_weight_pct",
                "max_weight_pct",
                "expense_ratio",
            ):
                value = Decimal(str(value))
            elif key == "asset_class":
                value = AssetClassType(value)
            setattr(holding, key, value)

        await self.db.commit()
        return holding

    async def remove_holding(self, holding_id: UUID) -> bool:
        """Remove a holding from a model."""
        result = await self.db.execute(
            select(MarketplaceModelHolding).where(
                MarketplaceModelHolding.id == holding_id
            )
        )
        holding = result.scalar_one_or_none()
        if not holding:
            return False
        await self.db.delete(holding)
        await self.db.commit()
        return True

    async def validate_holdings(
        self, model_id: UUID
    ) -> Dict[str, Any]:
        """Validate model holdings sum to 100%."""
        result = await self.db.execute(
            select(
                func.sum(MarketplaceModelHolding.target_weight_pct)
            ).where(MarketplaceModelHolding.model_id == model_id)
        )
        total = result.scalar() or Decimal("0")

        return {
            "total_weight": float(total),
            "is_valid": abs(total - Decimal("100"))
            < Decimal("0.01"),
            "difference": float(Decimal("100") - total),
        }

    # ─────────────────────────────────────────────────────────────
    # Marketplace
    # ─────────────────────────────────────────────────────────────

    async def list_marketplace(
        self,
        category: Optional[str] = None,
        risk_level_min: Optional[int] = None,
        risk_level_max: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[MarketplaceModelPortfolio]:
        """List models available in the marketplace."""
        query = select(MarketplaceModelPortfolio).where(
            and_(
                MarketplaceModelPortfolio.visibility
                == ModelVisibility.MARKETPLACE,
                MarketplaceModelPortfolio.status
                == ModelStatus.ACTIVE,
            )
        )

        if category:
            query = query.where(
                MarketplaceModelPortfolio.category == category
            )
        if risk_level_min is not None:
            query = query.where(
                MarketplaceModelPortfolio.risk_level
                >= risk_level_min
            )
        if risk_level_max is not None:
            query = query.where(
                MarketplaceModelPortfolio.risk_level
                <= risk_level_max
            )
        if search:
            query = query.where(
                or_(
                    MarketplaceModelPortfolio.name.ilike(
                        f"%{search}%"
                    ),
                    MarketplaceModelPortfolio.description.ilike(
                        f"%{search}%"
                    ),
                )
            )

        query = query.options(
            selectinload(MarketplaceModelPortfolio.holdings)
        ).order_by(
            MarketplaceModelPortfolio.total_subscribers.desc()
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def publish_to_marketplace(
        self,
        model_id: UUID,
        subscription_fee_monthly: Optional[Decimal] = None,
        subscription_fee_annual: Optional[Decimal] = None,
    ) -> MarketplaceModelPortfolio:
        """Publish a model to the marketplace."""
        model = await self.get_model(model_id)
        if not model:
            raise ValueError("Model not found")

        validation = await self.validate_holdings(model_id)
        if not validation["is_valid"]:
            raise ValueError(
                f"Holdings must sum to 100%. "
                f"Current: {validation['total_weight']}%"
            )

        model.visibility = ModelVisibility.MARKETPLACE
        model.status = ModelStatus.ACTIVE
        model.subscription_fee_monthly = subscription_fee_monthly
        model.subscription_fee_annual = subscription_fee_annual

        await self.db.commit()
        return model

    # ─────────────────────────────────────────────────────────────
    # Subscriptions
    # ─────────────────────────────────────────────────────────────

    async def subscribe(
        self, model_id: UUID, advisor_id: UUID
    ) -> ModelSubscription:
        """Subscribe an advisor to a model portfolio."""
        existing = await self.db.execute(
            select(ModelSubscription).where(
                and_(
                    ModelSubscription.model_id == model_id,
                    ModelSubscription.subscriber_advisor_id
                    == advisor_id,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already subscribed to this model")

        subscription = ModelSubscription(
            model_id=model_id,
            subscriber_advisor_id=advisor_id,
            status="active",
        )
        self.db.add(subscription)

        # Increment subscriber count
        model = await self.get_model(
            model_id, include_holdings=False
        )
        if model:
            model.total_subscribers += 1

        await self.db.commit()
        await self.db.refresh(subscription)
        return subscription

    async def unsubscribe(self, subscription_id: UUID) -> bool:
        """Cancel a subscription."""
        result = await self.db.execute(
            select(ModelSubscription).where(
                ModelSubscription.id == subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return False

        subscription.status = "cancelled"
        subscription.cancelled_at = datetime.utcnow()

        model = await self.get_model(
            subscription.model_id, include_holdings=False
        )
        if model and model.total_subscribers > 0:
            model.total_subscribers -= 1

        await self.db.commit()
        return True

    # ─────────────────────────────────────────────────────────────
    # Account Assignment
    # ─────────────────────────────────────────────────────────────

    async def assign_model_to_account(
        self,
        subscription_id: UUID,
        account_id: UUID,
        assigned_by: UUID,
        client_id: Optional[UUID] = None,
    ) -> AccountModelAssignment:
        """Assign a model to a client account."""
        result = await self.db.execute(
            select(ModelSubscription).where(
                ModelSubscription.id == subscription_id
            )
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            raise ValueError("Subscription not found")

        assignment = AccountModelAssignment(
            subscription_id=subscription_id,
            account_id=account_id,
            model_id=subscription.model_id,
            client_id=client_id,
            assigned_by=assigned_by,
        )
        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)
        return assignment

    async def get_account_assignments(
        self,
        advisor_id: UUID,
        model_id: Optional[UUID] = None,
    ) -> List[AccountModelAssignment]:
        """Get active account assignments for an advisor."""
        query = (
            select(AccountModelAssignment)
            .join(ModelSubscription)
            .where(
                and_(
                    ModelSubscription.subscriber_advisor_id
                    == advisor_id,
                    AccountModelAssignment.is_active.is_(True),
                )
            )
        )
        if model_id:
            query = query.where(
                AccountModelAssignment.model_id == model_id
            )

        result = await self.db.execute(query)
        return result.scalars().all()
