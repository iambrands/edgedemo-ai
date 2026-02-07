"""
Scans portfolios for tax-loss harvesting opportunities.
Identifies positions with unrealized losses that meet harvesting thresholds.
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.custodian import (
    AggregatedPosition,
    AggregatedTransaction,
    CustodianAccount,
    CustodianConnection,
    CustodianTransactionType,
)
from backend.models.tax_harvest import (
    HarvestOpportunity,
    HarvestStatus,
    HarvestTaxLot,
    HarvestingSettings,
    SecurityRelationship,
    SecurityRelationType,
    TaxLotStatus,
    WashSaleStatus,
    WashSaleTransaction,
)

logger = logging.getLogger(__name__)


class HarvestScanner:
    """Scans portfolios for tax-loss harvesting opportunities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def scan_portfolio(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID] = None,
        account_id: Optional[UUID] = None,
    ) -> List[HarvestOpportunity]:
        """
        Scan portfolio for harvesting opportunities.
        Returns new opportunities that meet thresholds.
        """
        settings = await self._get_settings(advisor_id, client_id, account_id)

        positions = await self._get_positions_with_losses(
            advisor_id, client_id, account_id, settings
        )

        opportunities: List[HarvestOpportunity] = []
        for position in positions:
            # Skip if already has an active opportunity
            if await self._has_active_opportunity(position.id):
                continue

            # Analyse tax lots with losses
            tax_lots = await self._get_tax_lots(position.id)
            if not tax_lots:
                continue

            harvest_details = self._calculate_harvest_details(tax_lots, settings)
            if not harvest_details:
                continue

            wash_sale_analysis = await self._analyze_wash_sale_risk(
                position.account_id, position.symbol, position.cusip
            )

            opportunity = await self._create_opportunity(
                advisor_id=advisor_id,
                position=position,
                tax_lots=tax_lots,
                harvest_details=harvest_details,
                wash_sale_analysis=wash_sale_analysis,
                settings=settings,
                client_id=client_id,
            )
            opportunities.append(opportunity)

        return opportunities

    # ─────────────────────────────────────────────────────────────
    # Settings resolution (account → client → advisor defaults)
    # ─────────────────────────────────────────────────────────────

    async def _get_settings(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID],
        account_id: Optional[UUID],
    ) -> HarvestingSettings:
        """Get most specific settings available."""
        for cid, aid in [
            (client_id, account_id),
            (client_id, None),
            (None, None),
        ]:
            result = await self.db.execute(
                select(HarvestingSettings).where(
                    and_(
                        HarvestingSettings.advisor_id == advisor_id,
                        HarvestingSettings.client_id == cid,
                        HarvestingSettings.account_id == aid,
                        HarvestingSettings.is_active.is_(True),
                    )
                )
            )
            settings = result.scalar_one_or_none()
            if settings:
                return settings

        # Fallback to sensible defaults (not persisted)
        return HarvestingSettings(
            advisor_id=advisor_id,
            min_loss_amount=Decimal("100"),
            min_loss_percentage=Decimal("0.05"),
            min_tax_savings=Decimal("50"),
            short_term_tax_rate=Decimal("0.37"),
            long_term_tax_rate=Decimal("0.20"),
        )

    # ─────────────────────────────────────────────────────────────
    # Position scanning
    # ─────────────────────────────────────────────────────────────

    async def _get_positions_with_losses(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID],
        account_id: Optional[UUID],
        settings: HarvestingSettings,
    ) -> List[AggregatedPosition]:
        """Get positions with unrealized losses meeting thresholds."""
        query = (
            select(AggregatedPosition)
            .join(CustodianAccount)
            .join(CustodianConnection)
            .where(
                and_(
                    CustodianConnection.advisor_id == advisor_id,
                    AggregatedPosition.unrealized_gain_loss.isnot(None),
                    AggregatedPosition.unrealized_gain_loss < 0,
                    AggregatedPosition.unrealized_gain_loss
                    <= -settings.min_loss_amount,
                )
            )
        )

        if client_id:
            query = query.where(CustodianAccount.client_id == client_id)
        if account_id:
            query = query.where(CustodianAccount.id == account_id)

        # Exclude tax-advantaged accounts
        if settings.excluded_account_types:
            query = query.where(
                ~CustodianAccount.account_type.in_(
                    settings.excluded_account_types
                )
            )

        # Exclude specific symbols
        if settings.excluded_symbols:
            query = query.where(
                ~AggregatedPosition.symbol.in_(settings.excluded_symbols)
            )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _has_active_opportunity(self, position_id: UUID) -> bool:
        """Check if position already has an active harvest opportunity."""
        result = await self.db.execute(
            select(HarvestOpportunity).where(
                and_(
                    HarvestOpportunity.position_id == position_id,
                    HarvestOpportunity.status.in_(
                        [
                            HarvestStatus.IDENTIFIED,
                            HarvestStatus.RECOMMENDED,
                            HarvestStatus.APPROVED,
                            HarvestStatus.EXECUTING,
                        ]
                    ),
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def _get_tax_lots(self, position_id: UUID) -> List[HarvestTaxLot]:
        """Get open tax lots for a position with losses."""
        result = await self.db.execute(
            select(HarvestTaxLot)
            .where(
                and_(
                    HarvestTaxLot.position_id == position_id,
                    HarvestTaxLot.status == TaxLotStatus.OPEN,
                    HarvestTaxLot.unrealized_gain_loss.isnot(None),
                    HarvestTaxLot.unrealized_gain_loss < 0,
                )
            )
            .order_by(HarvestTaxLot.unrealized_gain_loss.asc())  # most loss first
        )
        return list(result.scalars().all())

    # ─────────────────────────────────────────────────────────────
    # Harvest calculations
    # ─────────────────────────────────────────────────────────────

    def _calculate_harvest_details(
        self,
        tax_lots: List[HarvestTaxLot],
        settings: HarvestingSettings,
    ) -> Optional[Dict[str, Any]]:
        """Calculate harvest details from tax lots."""
        total_loss = Decimal("0")
        short_term_loss = Decimal("0")
        long_term_loss = Decimal("0")
        total_quantity = Decimal("0")
        total_cost_basis = Decimal("0")
        total_market_value = Decimal("0")
        lot_ids: List[str] = []

        for lot in tax_lots:
            if lot.unrealized_gain_loss and lot.unrealized_gain_loss < 0:
                loss = abs(lot.unrealized_gain_loss)
                total_loss += loss

                if lot.is_long_term:
                    long_term_loss += loss
                else:
                    short_term_loss += loss

                total_quantity += lot.remaining_quantity
                total_cost_basis += (
                    lot.adjusted_cost_basis or lot.total_cost_basis
                )
                total_market_value += lot.current_value or Decimal("0")
                lot_ids.append(str(lot.id))

        if total_loss < settings.min_loss_amount:
            return None

        st_savings = short_term_loss * settings.short_term_tax_rate
        lt_savings = long_term_loss * settings.long_term_tax_rate
        total_tax_savings = st_savings + lt_savings

        if total_tax_savings < settings.min_tax_savings:
            return None

        return {
            "total_loss": total_loss,
            "short_term_loss": short_term_loss,
            "long_term_loss": long_term_loss,
            "total_quantity": total_quantity,
            "total_cost_basis": total_cost_basis,
            "total_market_value": total_market_value,
            "estimated_tax_savings": total_tax_savings,
            "lot_ids": lot_ids,
        }

    # ─────────────────────────────────────────────────────────────
    # Wash-sale analysis
    # ─────────────────────────────────────────────────────────────

    async def _analyze_wash_sale_risk(
        self,
        account_id: UUID,
        symbol: str,
        cusip: Optional[str],
    ) -> Dict[str, Any]:
        """Analyse wash sale risk for a potential harvest."""
        today = date.today()
        window_start = today - timedelta(days=30)
        window_end = today + timedelta(days=30)

        identical_securities = await self._get_identical_securities(
            symbol, cusip
        )
        watch_symbols = [symbol] + [
            s["symbol"] for s in identical_securities
        ]

        blocking_transactions = await self._get_blocking_transactions(
            account_id, watch_symbols, window_start, today
        )

        active_windows = await self._get_active_wash_windows(
            account_id, watch_symbols
        )

        risk_amount = Decimal("0")
        for txn in blocking_transactions:
            risk_amount += abs(Decimal(str(txn.get("amount", 0))))

        return {
            "status": (
                WashSaleStatus.IN_WINDOW
                if blocking_transactions
                else WashSaleStatus.CLEAR
            ),
            "window_start": window_start,
            "window_end": window_end,
            "watch_symbols": watch_symbols,
            "blocking_transactions": blocking_transactions,
            "active_windows": active_windows,
            "risk_amount": risk_amount,
        }

    async def _get_identical_securities(
        self,
        symbol: str,
        cusip: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Get substantially identical securities."""
        result = await self.db.execute(
            select(SecurityRelationship).where(
                and_(
                    or_(
                        SecurityRelationship.symbol_a == symbol,
                        SecurityRelationship.symbol_b == symbol,
                    ),
                    SecurityRelationship.relation_type
                    == SecurityRelationType.SUBSTANTIALLY_IDENTICAL,
                    SecurityRelationship.is_active.is_(True),
                )
            )
        )
        relationships = result.scalars().all()

        identical: List[Dict[str, Any]] = []
        for rel in relationships:
            other_symbol = (
                rel.symbol_b if rel.symbol_a == symbol else rel.symbol_a
            )
            identical.append(
                {
                    "symbol": other_symbol,
                    "cusip": (
                        rel.cusip_b
                        if rel.symbol_a == symbol
                        else rel.cusip_a
                    ),
                    "confidence": float(rel.confidence_score),
                }
            )

        return identical

    async def _get_blocking_transactions(
        self,
        account_id: UUID,
        symbols: List[str],
        start_date: date,
        end_date: date,
    ) -> List[Dict[str, Any]]:
        """Get purchases that would trigger wash sale."""
        result = await self.db.execute(
            select(AggregatedTransaction).where(
                and_(
                    AggregatedTransaction.account_id == account_id,
                    AggregatedTransaction.symbol.in_(symbols),
                    AggregatedTransaction.transaction_type
                    == CustodianTransactionType.BUY,
                    AggregatedTransaction.trade_date
                    >= datetime.combine(start_date, datetime.min.time()),
                    AggregatedTransaction.trade_date
                    <= datetime.combine(end_date, datetime.max.time()),
                )
            )
        )
        transactions = result.scalars().all()

        return [
            {
                "id": str(t.id),
                "symbol": t.symbol,
                "date": (
                    t.trade_date.date().isoformat()
                    if hasattr(t.trade_date, "date")
                    else str(t.trade_date)
                ),
                "quantity": float(t.quantity) if t.quantity else 0,
                "amount": float(t.net_amount),
            }
            for t in transactions
        ]

    async def _get_active_wash_windows(
        self,
        account_id: UUID,
        symbols: List[str],
    ) -> List[Dict[str, Any]]:
        """Get active wash sale windows from prior sales."""
        today = date.today()

        result = await self.db.execute(
            select(WashSaleTransaction).where(
                and_(
                    WashSaleTransaction.account_id == account_id,
                    WashSaleTransaction.symbol.in_(symbols),
                    WashSaleTransaction.window_end >= today,
                    WashSaleTransaction.status == WashSaleStatus.IN_WINDOW,
                )
            )
        )
        windows = result.scalars().all()

        return [
            {
                "symbol": w.symbol,
                "sale_date": w.sale_date.isoformat(),
                "window_end": w.window_end.isoformat(),
                "loss_amount": float(w.loss_amount),
            }
            for w in windows
        ]

    # ─────────────────────────────────────────────────────────────
    # Opportunity creation
    # ─────────────────────────────────────────────────────────────

    async def _create_opportunity(
        self,
        advisor_id: UUID,
        position: AggregatedPosition,
        tax_lots: List[HarvestTaxLot],
        harvest_details: Dict[str, Any],
        wash_sale_analysis: Dict[str, Any],
        settings: HarvestingSettings,
        client_id: Optional[UUID],
    ) -> HarvestOpportunity:
        """Create a harvest opportunity record."""
        # Resolve client / household from the custodian account
        result = await self.db.execute(
            select(CustodianAccount).where(
                CustodianAccount.id == position.account_id
            )
        )
        account = result.scalar_one()

        opportunity = HarvestOpportunity(
            advisor_id=advisor_id,
            client_id=client_id or account.client_id,
            household_id=account.household_id,
            account_id=position.account_id,
            position_id=position.id,
            symbol=position.symbol,
            cusip=position.cusip,
            security_name=position.security_name,
            quantity_to_harvest=harvest_details["total_quantity"],
            current_price=position.price,
            cost_basis=harvest_details["total_cost_basis"],
            market_value=harvest_details["total_market_value"],
            unrealized_loss=harvest_details["total_loss"],
            estimated_tax_savings=harvest_details["estimated_tax_savings"],
            tax_rate_used=(
                settings.short_term_tax_rate + settings.long_term_tax_rate
            )
            / 2,
            short_term_loss=harvest_details["short_term_loss"],
            long_term_loss=harvest_details["long_term_loss"],
            tax_lot_ids=harvest_details["lot_ids"],
            status=(
                HarvestStatus.WASH_SALE_RISK
                if wash_sale_analysis["blocking_transactions"]
                else HarvestStatus.IDENTIFIED
            ),
            wash_sale_status=wash_sale_analysis["status"],
            wash_sale_risk_amount=wash_sale_analysis["risk_amount"],
            wash_sale_blocking_transactions=wash_sale_analysis[
                "blocking_transactions"
            ],
            wash_sale_window_start=wash_sale_analysis["window_start"],
            wash_sale_window_end=wash_sale_analysis["window_end"],
            identified_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=7),
        )

        self.db.add(opportunity)
        await self.db.commit()
        await self.db.refresh(opportunity)

        return opportunity
