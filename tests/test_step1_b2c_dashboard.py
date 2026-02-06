"""
Test 1F: Validate B2C dashboard and Academy bridge.
"""

from decimal import Decimal

import pytest

from backend.services.academy_bridge import AcademyBridge


class TestAcademyBridge:
    """Academy bridge maps portfolio issues to correct modules."""

    def test_academy_bridge_recommendations(self):
        """Academy bridge maps issues to Academy content."""
        bridge = AcademyBridge()

        risk_flags = [
            "High expense ratios detected",
            "Concentration risk in single account",
            "Allocation drift from target",
        ]

        recommendations = bridge.get_recommendations(risk_flags)

        assert len(recommendations) >= 1
        assert all(hasattr(r, "track") for r in recommendations)
        assert all(hasattr(r, "academy_url") for r in recommendations)

    def test_fee_education_recommended(self):
        """Fee-related issues map to fee education module."""
        bridge = AcademyBridge()

        recommendations = bridge.get_recommendations(["high expense ratios"])

        module_names = [r.module.lower() for r in recommendations]
        assert any("fee" in m for m in module_names)

    def test_diversification_recommended(self):
        """Concentration issues map to diversification module."""
        bridge = AcademyBridge()

        recommendations = bridge.get_recommendations(["concentration risk"])

        module_names = [r.module.lower() for r in recommendations]
        assert any("diversif" in m for m in module_names)


class TestB2CDashboardService:
    """B2C dashboard service structure (requires User with household_id)."""

    @pytest.mark.asyncio
    async def test_dashboard_service_imports(self):
        """B2C dashboard service can be instantiated."""
        from unittest.mock import MagicMock

        from backend.services.b2c_dashboard import B2CDashboardService

        mock_db = MagicMock()
        svc = B2CDashboardService(mock_db)
        assert svc is not None
        assert hasattr(svc, "get_dashboard")
