"""
Main alternative asset service.

CRUD operations, capital calls, distributions, valuations,
document management, performance recalculation, and client summary.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.alternative_asset import (
    AlternativeAssetType,
    AlternativeDocument,
    AlternativeInvestment,
    AlternativeTransaction,
    AlternativeValuation,
    CapitalCall,
    DocumentType,
    InvestmentStatus,
    TransactionType,
    ValuationSource,
)

from .performance_calculator import PerformanceCalculator

logger = logging.getLogger(__name__)


class AlternativeAssetService:
    """Main service for alternative asset operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.calc = PerformanceCalculator()

    # ─────────────────────────────────────────────────────────────
    # Investment CRUD
    # ─────────────────────────────────────────────────────────────

    async def create_investment(
        self,
        advisor_id: UUID,
        client_id: UUID,
        data: Dict[str, Any],
    ) -> AlternativeInvestment:
        """Create a new alternative investment."""
        commitment = Decimal(str(data["total_commitment"]))

        investment = AlternativeInvestment(
            advisor_id=advisor_id,
            client_id=client_id,
            name=data["name"],
            asset_type=AlternativeAssetType(data["asset_type"]),
            status=InvestmentStatus(data.get("status", "committed")),
            account_id=data.get("account_id"),
            fund_name=data.get("fund_name"),
            sponsor_name=data.get("sponsor_name"),
            fund_manager=data.get("fund_manager"),
            vintage_year=data.get("vintage_year"),
            investment_date=data.get("investment_date"),
            maturity_date=data.get("maturity_date"),
            total_commitment=commitment,
            uncalled_capital=commitment,
            investment_strategy=data.get("investment_strategy"),
            geography=data.get("geography"),
            sector_focus=data.get("sector_focus"),
            management_fee_rate=(
                Decimal(str(data["management_fee_rate"]))
                if data.get("management_fee_rate") is not None
                else None
            ),
            carried_interest_rate=(
                Decimal(str(data["carried_interest_rate"]))
                if data.get("carried_interest_rate") is not None
                else None
            ),
            preferred_return=(
                Decimal(str(data["preferred_return"]))
                if data.get("preferred_return") is not None
                else None
            ),
            tax_entity_type=data.get("tax_entity_type"),
            ein=data.get("ein"),
            fiscal_year_end=data.get("fiscal_year_end"),
            # Real estate fields
            property_address=data.get("property_address"),
            property_type=data.get("property_type"),
            square_footage=data.get("square_footage"),
            # Collectibles fields
            item_description=data.get("item_description"),
            provenance=data.get("provenance"),
            storage_location=data.get("storage_location"),
            insurance_policy=data.get("insurance_policy"),
            insurance_value=(
                Decimal(str(data["insurance_value"]))
                if data.get("insurance_value") is not None
                else None
            ),
            notes=data.get("notes"),
            tags=data.get("tags", []),
            custom_fields=data.get("custom_fields"),
            subscription_doc_url=data.get("subscription_doc_url"),
        )

        self.db.add(investment)
        await self.db.commit()
        await self.db.refresh(investment)
        return investment

    async def get_investment(
        self,
        investment_id: UUID,
        include_related: bool = True,
    ) -> Optional[AlternativeInvestment]:
        """Get an investment by ID, optionally eager-loading children."""
        query = select(AlternativeInvestment).where(
            AlternativeInvestment.id == investment_id
        )
        if include_related:
            query = query.options(
                selectinload(AlternativeInvestment.transactions),
                selectinload(AlternativeInvestment.valuations),
                selectinload(AlternativeInvestment.capital_calls),
                selectinload(AlternativeInvestment.documents),
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_investments(
        self,
        advisor_id: UUID,
        client_id: Optional[UUID] = None,
        asset_type: Optional[AlternativeAssetType] = None,
        status: Optional[InvestmentStatus] = None,
    ) -> List[AlternativeInvestment]:
        """List investments for an advisor with optional filters."""
        query = select(AlternativeInvestment).where(
            AlternativeInvestment.advisor_id == advisor_id
        )

        if client_id:
            query = query.where(AlternativeInvestment.client_id == client_id)
        if asset_type:
            query = query.where(AlternativeInvestment.asset_type == asset_type)
        if status:
            query = query.where(AlternativeInvestment.status == status)

        query = query.order_by(AlternativeInvestment.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_investment(
        self,
        investment_id: UUID,
        data: Dict[str, Any],
    ) -> AlternativeInvestment:
        """Update an investment's fields."""
        investment = await self.get_investment(investment_id, include_related=False)
        if not investment:
            raise ValueError("Investment not found")

        decimal_fields = {
            "total_commitment",
            "management_fee_rate",
            "carried_interest_rate",
            "preferred_return",
            "insurance_value",
        }
        enum_fields = {
            "asset_type": AlternativeAssetType,
            "status": InvestmentStatus,
        }

        for key, value in data.items():
            if not hasattr(investment, key) or value is None:
                continue
            if key in decimal_fields:
                value = Decimal(str(value))
            elif key in enum_fields:
                value = enum_fields[key](value)
            setattr(investment, key, value)

        await self.db.commit()
        await self.db.refresh(investment)
        return investment

    async def delete_investment(self, investment_id: UUID) -> None:
        """Delete an investment and its related records (cascade)."""
        investment = await self.get_investment(investment_id, include_related=False)
        if not investment:
            raise ValueError("Investment not found")
        await self.db.delete(investment)
        await self.db.commit()

    # ─────────────────────────────────────────────────────────────
    # Capital Calls
    # ─────────────────────────────────────────────────────────────

    async def create_capital_call(
        self,
        investment_id: UUID,
        data: Dict[str, Any],
    ) -> CapitalCall:
        """Create a capital call notice."""
        investment = await self.get_investment(investment_id, include_related=False)
        if not investment:
            raise ValueError("Investment not found")

        # Determine call number
        count_result = await self.db.execute(
            select(func.count(CapitalCall.id)).where(
                CapitalCall.investment_id == investment_id
            )
        )
        call_count = count_result.scalar() or 0

        call_amount = Decimal(str(data["call_amount"]))

        call = CapitalCall(
            investment_id=investment_id,
            call_number=call_count + 1,
            notice_date=data["notice_date"],
            due_date=data["due_date"],
            call_amount=call_amount,
            management_fee_portion=(
                Decimal(str(data["management_fee_portion"]))
                if data.get("management_fee_portion") is not None
                else None
            ),
            investment_portion=(
                Decimal(str(data["investment_portion"]))
                if data.get("investment_portion") is not None
                else None
            ),
            other_expenses=(
                Decimal(str(data["other_expenses"]))
                if data.get("other_expenses") is not None
                else None
            ),
            cumulative_called=investment.called_capital + call_amount,
            remaining_commitment=investment.uncalled_capital - call_amount,
            percentage_called=(
                (investment.called_capital + call_amount)
                / investment.total_commitment
                * 100
            ),
            wire_instructions=data.get("wire_instructions"),
            notice_url=data.get("notice_url"),
            notes=data.get("notes"),
        )

        self.db.add(call)
        await self.db.commit()
        await self.db.refresh(call)
        return call

    async def pay_capital_call(
        self,
        call_id: UUID,
        paid_date: date,
        paid_amount: Optional[Decimal] = None,
    ) -> CapitalCall:
        """Mark a capital call as paid and record the transaction."""
        result = await self.db.execute(
            select(CapitalCall).where(CapitalCall.id == call_id)
        )
        call = result.scalar_one_or_none()
        if not call:
            raise ValueError("Capital call not found")

        if call.status == "paid":
            raise ValueError("Capital call already paid")

        actual_amount = paid_amount if paid_amount is not None else call.call_amount

        # Update call
        call.status = "paid"
        call.paid_date = paid_date
        call.paid_amount = actual_amount

        # Create transaction (negative = outflow)
        transaction = AlternativeTransaction(
            investment_id=call.investment_id,
            transaction_type=TransactionType.CAPITAL_CALL,
            transaction_date=paid_date,
            amount=-actual_amount,
            capital_call_id=call.id,
            status="completed",
        )
        self.db.add(transaction)

        # Update investment totals
        investment = await self.get_investment(
            call.investment_id, include_related=False
        )
        if investment:
            investment.called_capital += actual_amount
            investment.uncalled_capital -= actual_amount
            investment.cost_basis += actual_amount
            investment.adjusted_cost_basis += actual_amount

            if investment.status == InvestmentStatus.COMMITTED:
                investment.status = InvestmentStatus.ACTIVE

        await self.db.commit()
        await self.db.refresh(call)
        return call

    async def get_pending_capital_calls(
        self,
        advisor_id: UUID,
        days_ahead: int = 30,
    ) -> List[CapitalCall]:
        """Get pending capital calls due within a window."""
        cutoff = date.today() + timedelta(days=days_ahead)

        result = await self.db.execute(
            select(CapitalCall)
            .join(AlternativeInvestment)
            .where(
                and_(
                    AlternativeInvestment.advisor_id == advisor_id,
                    CapitalCall.status == "pending",
                    CapitalCall.due_date <= cutoff,
                )
            )
            .order_by(CapitalCall.due_date.asc())
        )
        return list(result.scalars().all())

    async def get_capital_calls(
        self,
        investment_id: UUID,
    ) -> List[CapitalCall]:
        """List all capital calls for an investment."""
        result = await self.db.execute(
            select(CapitalCall)
            .where(CapitalCall.investment_id == investment_id)
            .order_by(CapitalCall.due_date.desc())
        )
        return list(result.scalars().all())

    # ─────────────────────────────────────────────────────────────
    # Distributions
    # ─────────────────────────────────────────────────────────────

    async def record_distribution(
        self,
        investment_id: UUID,
        data: Dict[str, Any],
    ) -> AlternativeTransaction:
        """Record a distribution from an investment."""
        investment = await self.get_investment(investment_id, include_related=False)
        if not investment:
            raise ValueError("Investment not found")

        amount = Decimal(str(data["amount"]))

        transaction = AlternativeTransaction(
            investment_id=investment_id,
            transaction_type=TransactionType(
                data.get("transaction_type", "distribution")
            ),
            transaction_date=data["transaction_date"],
            amount=amount,
            return_of_capital=(
                Decimal(str(data["return_of_capital"]))
                if data.get("return_of_capital") is not None
                else None
            ),
            capital_gains_short=(
                Decimal(str(data["capital_gains_short"]))
                if data.get("capital_gains_short") is not None
                else None
            ),
            capital_gains_long=(
                Decimal(str(data["capital_gains_long"]))
                if data.get("capital_gains_long") is not None
                else None
            ),
            ordinary_income=(
                Decimal(str(data["ordinary_income"]))
                if data.get("ordinary_income") is not None
                else None
            ),
            qualified_dividends=(
                Decimal(str(data["qualified_dividends"]))
                if data.get("qualified_dividends") is not None
                else None
            ),
            reference_number=data.get("reference_number"),
            notes=data.get("notes"),
            status="completed",
        )

        self.db.add(transaction)

        # Update investment totals
        investment.distributions_received += amount

        # Adjust cost basis for return of capital
        if data.get("return_of_capital") is not None:
            roc = Decimal(str(data["return_of_capital"]))
            investment.adjusted_cost_basis -= roc

        await self.db.commit()
        await self.db.refresh(transaction)

        # Recalculate performance
        await self.recalculate_performance(investment_id)

        return transaction

    async def get_transactions(
        self,
        investment_id: UUID,
    ) -> List[AlternativeTransaction]:
        """List all transactions for an investment."""
        result = await self.db.execute(
            select(AlternativeTransaction)
            .where(AlternativeTransaction.investment_id == investment_id)
            .order_by(AlternativeTransaction.transaction_date.desc())
        )
        return list(result.scalars().all())

    # ─────────────────────────────────────────────────────────────
    # Valuations
    # ─────────────────────────────────────────────────────────────

    async def record_valuation(
        self,
        investment_id: UUID,
        data: Dict[str, Any],
    ) -> AlternativeValuation:
        """Record a new valuation and update current NAV."""
        investment = await self.get_investment(investment_id, include_related=False)
        if not investment:
            raise ValueError("Investment not found")

        nav = Decimal(str(data["nav"]))

        valuation = AlternativeValuation(
            investment_id=investment_id,
            valuation_date=data["valuation_date"],
            nav=nav,
            source=ValuationSource(data.get("source", "fund_statement")),
            source_document=data.get("source_document"),
            period_return=(
                Decimal(str(data["period_return"]))
                if data.get("period_return") is not None
                else None
            ),
            ytd_return=(
                Decimal(str(data["ytd_return"]))
                if data.get("ytd_return") is not None
                else None
            ),
            unrealized_gain=(
                Decimal(str(data["unrealized_gain"]))
                if data.get("unrealized_gain") is not None
                else None
            ),
            realized_gain=(
                Decimal(str(data["realized_gain"]))
                if data.get("realized_gain") is not None
                else None
            ),
            irr=(
                Decimal(str(data["irr"]))
                if data.get("irr") is not None
                else None
            ),
            tvpi=(
                Decimal(str(data["tvpi"]))
                if data.get("tvpi") is not None
                else None
            ),
            dpi=(
                Decimal(str(data["dpi"]))
                if data.get("dpi") is not None
                else None
            ),
            notes=data.get("notes"),
        )

        self.db.add(valuation)

        # Update investment current NAV
        investment.current_nav = nav
        investment.nav_date = data["valuation_date"]

        await self.db.commit()
        await self.db.refresh(valuation)

        # Recalculate performance
        await self.recalculate_performance(investment_id)

        return valuation

    async def get_valuation_history(
        self,
        investment_id: UUID,
        limit: int = 12,
    ) -> List[AlternativeValuation]:
        """Get recent valuation history for an investment."""
        result = await self.db.execute(
            select(AlternativeValuation)
            .where(AlternativeValuation.investment_id == investment_id)
            .order_by(AlternativeValuation.valuation_date.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    # ─────────────────────────────────────────────────────────────
    # Performance Calculation
    # ─────────────────────────────────────────────────────────────

    async def recalculate_performance(
        self,
        investment_id: UUID,
    ) -> AlternativeInvestment:
        """Recalculate all performance metrics for an investment."""
        investment = await self.get_investment(investment_id)
        if not investment:
            raise ValueError("Investment not found")

        # Build cash flow list from transactions
        cash_flows: List[Tuple[date, Decimal]] = []
        for txn in investment.transactions:
            cash_flows.append((txn.transaction_date, txn.amount))

        nav_date = investment.nav_date or date.today()
        metrics = self.calc.calculate_all_metrics(
            cash_flows=cash_flows,
            current_nav=investment.current_nav,
            nav_date=nav_date,
            total_distributions=investment.distributions_received,
            total_called=investment.called_capital,
        )

        # Update investment with computed metrics
        investment.irr = metrics["irr"]
        investment.tvpi = metrics["tvpi"]
        investment.dpi = metrics["dpi"]
        investment.rvpi = metrics["rvpi"]
        investment.moic = metrics["moic"]

        await self.db.commit()
        return investment

    # ─────────────────────────────────────────────────────────────
    # Documents
    # ─────────────────────────────────────────────────────────────

    async def add_document(
        self,
        investment_id: UUID,
        data: Dict[str, Any],
    ) -> AlternativeDocument:
        """Add a document to an investment."""
        document = AlternativeDocument(
            investment_id=investment_id,
            document_type=DocumentType(data["document_type"]),
            name=data["name"],
            description=data.get("description"),
            document_date=data.get("document_date"),
            tax_year=data.get("tax_year"),
            period_start=data.get("period_start"),
            period_end=data.get("period_end"),
            file_url=data["file_url"],
            file_size=data.get("file_size"),
            file_type=data.get("file_type"),
            # K-1 fields
            k1_box_1=(
                Decimal(str(data["k1_box_1"]))
                if data.get("k1_box_1") is not None
                else None
            ),
            k1_box_2=(
                Decimal(str(data["k1_box_2"]))
                if data.get("k1_box_2") is not None
                else None
            ),
            k1_box_3=(
                Decimal(str(data["k1_box_3"]))
                if data.get("k1_box_3") is not None
                else None
            ),
            k1_box_4a=(
                Decimal(str(data["k1_box_4a"]))
                if data.get("k1_box_4a") is not None
                else None
            ),
            k1_box_5=(
                Decimal(str(data["k1_box_5"]))
                if data.get("k1_box_5") is not None
                else None
            ),
            k1_box_6a=(
                Decimal(str(data["k1_box_6a"]))
                if data.get("k1_box_6a") is not None
                else None
            ),
            k1_box_6b=(
                Decimal(str(data["k1_box_6b"]))
                if data.get("k1_box_6b") is not None
                else None
            ),
            k1_box_8=(
                Decimal(str(data["k1_box_8"]))
                if data.get("k1_box_8") is not None
                else None
            ),
            k1_box_9a=(
                Decimal(str(data["k1_box_9a"]))
                if data.get("k1_box_9a") is not None
                else None
            ),
            k1_box_11=(
                Decimal(str(data["k1_box_11"]))
                if data.get("k1_box_11") is not None
                else None
            ),
            k1_box_13=data.get("k1_box_13"),
            k1_box_19=(
                Decimal(str(data["k1_box_19"]))
                if data.get("k1_box_19") is not None
                else None
            ),
            k1_box_20=data.get("k1_box_20"),
            notes=data.get("notes"),
        )

        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def list_documents(
        self,
        investment_id: UUID,
        document_type: Optional[DocumentType] = None,
    ) -> List[AlternativeDocument]:
        """List documents for an investment."""
        query = select(AlternativeDocument).where(
            AlternativeDocument.investment_id == investment_id
        )
        if document_type:
            query = query.where(AlternativeDocument.document_type == document_type)
        query = query.order_by(AlternativeDocument.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_k1s_by_year(
        self,
        advisor_id: UUID,
        tax_year: int,
        client_id: Optional[UUID] = None,
    ) -> List[AlternativeDocument]:
        """Get all K-1s for a tax year."""
        query = (
            select(AlternativeDocument)
            .join(AlternativeInvestment)
            .where(
                and_(
                    AlternativeInvestment.advisor_id == advisor_id,
                    AlternativeDocument.document_type == DocumentType.K1,
                    AlternativeDocument.tax_year == tax_year,
                )
            )
        )
        if client_id:
            query = query.where(AlternativeInvestment.client_id == client_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    # ─────────────────────────────────────────────────────────────
    # Summary & Aggregation
    # ─────────────────────────────────────────────────────────────

    async def get_client_summary(
        self,
        client_id: UUID,
        advisor_id: UUID,
    ) -> Dict[str, Any]:
        """Get aggregated summary for a client's alternative investments."""
        investments = await self.list_investments(advisor_id, client_id)

        if not investments:
            return {
                "total_investments": 0,
                "total_commitment": 0,
                "total_called": 0,
                "total_uncalled": 0,
                "total_nav": 0,
                "total_distributions": 0,
                "nav_by_type": {},
                "commitment_by_type": {},
                "pending_capital_calls": 0,
                "pending_call_amount": 0,
            }

        total_commitment = sum(i.total_commitment for i in investments)
        total_called = sum(i.called_capital for i in investments)
        total_uncalled = sum(i.uncalled_capital for i in investments)
        total_nav = sum(i.current_nav for i in investments)
        total_distributions = sum(i.distributions_received for i in investments)

        nav_by_type: Dict[str, float] = {}
        commitment_by_type: Dict[str, float] = {}
        for inv in investments:
            at = inv.asset_type.value
            nav_by_type[at] = nav_by_type.get(at, 0) + float(inv.current_nav)
            commitment_by_type[at] = commitment_by_type.get(at, 0) + float(
                inv.total_commitment
            )

        # Pending capital calls
        calls = await self.get_pending_capital_calls(advisor_id)
        inv_ids = {i.id for i in investments}
        client_calls = [c for c in calls if c.investment_id in inv_ids]

        return {
            "total_investments": len(investments),
            "total_commitment": float(total_commitment),
            "total_called": float(total_called),
            "total_uncalled": float(total_uncalled),
            "total_nav": float(total_nav),
            "total_distributions": float(total_distributions),
            "nav_by_type": nav_by_type,
            "commitment_by_type": commitment_by_type,
            "pending_capital_calls": len(client_calls),
            "pending_call_amount": float(
                sum(c.call_amount for c in client_calls)
            )
            if client_calls
            else 0,
        }
