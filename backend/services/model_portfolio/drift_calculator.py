"""
Portfolio drift calculation engine.

Compares actual account holdings against target model allocations and
computes the trades required to bring the account back to target.
"""

import logging
from decimal import Decimal
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.custodian import AggregatedPosition
from backend.models.model_portfolio_marketplace import (
    MarketplaceModelHolding,
)

logger = logging.getLogger(__name__)


class DriftCalculator:
    """Calculates portfolio drift from target allocations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def calculate_drift(
        self,
        model_id: UUID,
        account_id: UUID,
    ) -> Dict[str, Any]:
        """Calculate drift between account holdings and model targets."""

        # Load model holdings
        model_result = await self.db.execute(
            select(MarketplaceModelHolding).where(
                MarketplaceModelHolding.model_id == model_id
            )
        )
        model_holdings = {
            h.symbol: h for h in model_result.scalars().all()
        }

        # Load account positions
        positions_result = await self.db.execute(
            select(AggregatedPosition).where(
                AggregatedPosition.account_id == account_id
            )
        )
        positions = {
            p.symbol: p for p in positions_result.scalars().all()
        }

        # Total account value
        total_value = sum(
            Decimal(str(p.market_value or 0))
            for p in positions.values()
        )

        if total_value == 0:
            return {
                "total_drift_pct": Decimal("0"),
                "max_holding_drift_pct": Decimal("0"),
                "drift_details": {},
                "account_value": Decimal("0"),
            }

        drift_details: Dict[str, Dict[str, Any]] = {}
        max_drift = Decimal("0")
        total_drift = Decimal("0")

        all_symbols = set(model_holdings.keys()) | set(
            positions.keys()
        )

        for symbol in all_symbols:
            model_holding = model_holdings.get(symbol)
            position = positions.get(symbol)

            target_pct = (
                Decimal(str(model_holding.target_weight_pct))
                if model_holding
                else Decimal("0")
            )

            if position and position.market_value:
                current_pct = (
                    Decimal(str(position.market_value))
                    / total_value
                    * 100
                )
            else:
                current_pct = Decimal("0")

            drift_pct = current_pct - target_pct
            abs_drift = abs(drift_pct)

            drift_details[symbol] = {
                "current_pct": float(current_pct),
                "target_pct": float(target_pct),
                "drift_pct": float(drift_pct),
                "current_value": (
                    float(position.market_value) if position else 0
                ),
                "target_value": float(
                    total_value * target_pct / 100
                ),
                "in_model": model_holding is not None,
                "in_account": position is not None,
            }

            if abs_drift > max_drift:
                max_drift = abs_drift
            total_drift += abs_drift

        return {
            "total_drift_pct": total_drift / 2,
            "max_holding_drift_pct": max_drift,
            "drift_details": drift_details,
            "account_value": total_value,
        }

    # ─────────────────────────────────────────────────────────────
    # Trade Calculation
    # ─────────────────────────────────────────────────────────────

    def calculate_trades_required(
        self,
        drift_details: Dict[str, Dict[str, Any]],
        account_value: Decimal,
        cash_available: Decimal = Decimal("0"),
        min_trade_value: Decimal = Decimal("100"),
    ) -> List[Dict[str, Any]]:
        """Calculate trades needed to rebalance to targets."""
        trades: List[Dict[str, Any]] = []

        # Pass 1 — sells (overweight positions)
        for symbol, details in drift_details.items():
            if details["drift_pct"] > 0 and details["in_account"]:
                sell_value = Decimal(
                    str(details["current_value"])
                ) - Decimal(str(details["target_value"]))
                if sell_value >= min_trade_value:
                    trades.append(
                        {
                            "symbol": symbol,
                            "action": "sell",
                            "value": float(sell_value),
                            "reason": (
                                f"Overweight by "
                                f"{details['drift_pct']:.2f}%"
                            ),
                        }
                    )

        # Proceeds from sells
        sell_proceeds = sum(
            t["value"] for t in trades if t["action"] == "sell"
        )
        available_cash = float(cash_available) + sell_proceeds

        # Pass 2 — buys (underweight positions)
        for symbol, details in drift_details.items():
            if details["drift_pct"] < 0 and details["in_model"]:
                buy_value = Decimal(
                    str(details["target_value"])
                ) - Decimal(str(details["current_value"]))
                if (
                    buy_value >= min_trade_value
                    and float(buy_value) <= available_cash
                ):
                    trades.append(
                        {
                            "symbol": symbol,
                            "action": "buy",
                            "value": float(buy_value),
                            "reason": (
                                f"Underweight by "
                                f"{abs(details['drift_pct']):.2f}%"
                            ),
                        }
                    )
                    available_cash -= float(buy_value)

        return trades
