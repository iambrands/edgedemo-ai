"""
Performance calculation engine for alternative investments.

Calculates IRR, TVPI, DPI, RVPI, MOIC using pure-Python numerics
(no scipy/numpy dependency).
"""

import logging
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class PerformanceCalculator:
    """Calculates alternative investment performance metrics."""

    # ─────────────────────────────────────────────────────────────
    # IRR
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def calculate_irr(
        cash_flows: List[Tuple[date, Decimal]],
        current_nav: Decimal,
        nav_date: date,
    ) -> Optional[Decimal]:
        """
        Calculate Internal Rate of Return.

        Parameters
        ----------
        cash_flows : list of (date, Decimal)
            Negative amounts = outflows (capital calls).
            Positive amounts = inflows (distributions).
        current_nav : Decimal
            Residual net asset value (treated as a positive terminal cash flow).
        nav_date : date
            As-of date for the residual NAV.

        Returns
        -------
        Decimal or None
            Annualised IRR, or None if it cannot be computed.
        """
        if not cash_flows:
            return None

        # Append current NAV as the final positive cash flow
        all_flows: List[Tuple[date, float]] = [
            (d, float(a)) for d, a in cash_flows
        ] + [(nav_date, float(current_nav))]

        if len(all_flows) < 2:
            return None

        # Convert dates to year fractions from the first date
        first_date = min(d for d, _ in all_flows)
        years = [(d - first_date).days / 365.0 for d, _ in all_flows]
        amounts = [a for _, a in all_flows]

        # If all amounts are zero (or only one direction), no valid IRR
        has_neg = any(a < 0 for a in amounts)
        has_pos = any(a > 0 for a in amounts)
        if not (has_neg and has_pos):
            return None

        # NPV at a given annual rate
        def npv(rate: float) -> float:
            return sum(
                cf / ((1.0 + rate) ** yr) for cf, yr in zip(amounts, years)
            )

        # Derivative of NPV
        def npv_deriv(rate: float) -> float:
            return sum(
                -yr * cf / ((1.0 + rate) ** (yr + 1.0))
                for cf, yr in zip(amounts, years)
            )

        # ── Newton-Raphson ──────────────────────────────────────
        rate = 0.1  # initial guess
        try:
            for _ in range(200):
                val = npv(rate)
                deriv = npv_deriv(rate)
                if abs(deriv) < 1e-14:
                    break
                new_rate = rate - val / deriv
                # Clamp to avoid divergence
                new_rate = max(-0.999, min(new_rate, 100.0))
                if abs(new_rate - rate) < 1e-10:
                    if abs(npv(new_rate)) < 1e-6:
                        return Decimal(str(round(new_rate, 6)))
                    break
                rate = new_rate

            # Check if Newton converged
            if abs(npv(rate)) < 1e-4:
                return Decimal(str(round(rate, 6)))
        except (ZeroDivisionError, OverflowError, ValueError):
            pass

        # ── Bisection fallback ──────────────────────────────────
        try:
            lo, hi = -0.99, 10.0
            npv_lo = npv(lo)
            npv_hi = npv(hi)

            if npv_lo * npv_hi > 0:
                return None  # no sign change

            for _ in range(300):
                mid = (lo + hi) / 2.0
                npv_mid = npv(mid)
                if abs(npv_mid) < 1e-8 or (hi - lo) < 1e-12:
                    return Decimal(str(round(mid, 6)))
                if npv_mid * npv_lo < 0:
                    hi = mid
                else:
                    lo = mid
                    npv_lo = npv_mid

            return Decimal(str(round((lo + hi) / 2.0, 6)))
        except (ZeroDivisionError, OverflowError, ValueError):
            logger.warning("IRR calculation failed for %d cash flows", len(all_flows))
            return None

    # ─────────────────────────────────────────────────────────────
    # TVPI
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def calculate_tvpi(
        current_nav: Decimal,
        total_distributions: Decimal,
        total_called: Decimal,
    ) -> Optional[Decimal]:
        """
        Total Value to Paid-In Capital.

        TVPI = (NAV + Distributions) / Paid-In Capital
        """
        if total_called <= 0:
            return None
        return (current_nav + total_distributions) / total_called

    # ─────────────────────────────────────────────────────────────
    # DPI
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def calculate_dpi(
        total_distributions: Decimal,
        total_called: Decimal,
    ) -> Optional[Decimal]:
        """
        Distributions to Paid-In Capital.

        DPI = Distributions / Paid-In Capital
        """
        if total_called <= 0:
            return None
        return total_distributions / total_called

    # ─────────────────────────────────────────────────────────────
    # RVPI
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def calculate_rvpi(
        current_nav: Decimal,
        total_called: Decimal,
    ) -> Optional[Decimal]:
        """
        Residual Value to Paid-In Capital.

        RVPI = NAV / Paid-In Capital
        """
        if total_called <= 0:
            return None
        return current_nav / total_called

    # ─────────────────────────────────────────────────────────────
    # MOIC
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def calculate_moic(
        current_nav: Decimal,
        total_distributions: Decimal,
        total_called: Decimal,
    ) -> Optional[Decimal]:
        """
        Multiple on Invested Capital.

        MOIC = (NAV + Distributions) / Total Invested
        """
        if total_called <= 0:
            return None
        return (current_nav + total_distributions) / total_called

    # ─────────────────────────────────────────────────────────────
    # Combined
    # ─────────────────────────────────────────────────────────────

    def calculate_all_metrics(
        self,
        cash_flows: List[Tuple[date, Decimal]],
        current_nav: Decimal,
        nav_date: date,
        total_distributions: Decimal,
        total_called: Decimal,
    ) -> Dict[str, Optional[Decimal]]:
        """Calculate all performance metrics at once."""
        return {
            "irr": self.calculate_irr(cash_flows, current_nav, nav_date),
            "tvpi": self.calculate_tvpi(current_nav, total_distributions, total_called),
            "dpi": self.calculate_dpi(total_distributions, total_called),
            "rvpi": self.calculate_rvpi(current_nav, total_called),
            "moic": self.calculate_moic(current_nav, total_distributions, total_called),
        }
