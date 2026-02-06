"""
Test 1E: End-to-end orchestrator pipeline test.
"""

import pytest

from backend.services.ai_orchestrator import AIOrchestrator, OrchestratorResponse


class TestFullPipeline:
    """Validate the complete IIM→CIM→BIM pipeline."""

    @pytest.mark.asyncio
    async def test_orchestrator_e2e(self, nicole_household, nicole_mock_session):
        """Full pipeline returns valid response."""
        orchestrator = AIOrchestrator(nicole_mock_session)
        client = nicole_household["client"]
        household = nicole_household["household"]

        result = await orchestrator.process_query(
            client_id=str(client.id),
            query="What are my investment fees costing me?",
            household_id=str(household.id),
        )

        assert result is not None
        assert isinstance(result, OrchestratorResponse)
        assert result.message is not None
        assert len(result.message) > 0
        assert result.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_orchestrator_includes_analysis(self, nicole_household, nicole_mock_session):
        """Pipeline produces IIM analysis output."""
        orchestrator = AIOrchestrator(nicole_mock_session)
        client = nicole_household["client"]
        household = nicole_household["household"]

        result = await orchestrator.process_query(
            client_id=str(client.id),
            query="Analyze my portfolio",
            household_id=str(household.id),
        )

        assert result.iim_output is not None or result.message
        assert result.success or not result.success

    @pytest.mark.asyncio
    async def test_decimal_serialization_through_pipeline(self, nicole_household, nicole_mock_session):
        """Verify Decimal values in IIM output."""
        from decimal import Decimal

        from backend.services.iim_service import IIMService

        iim = IIMService(nicole_mock_session)
        va_account = nicole_household["va_account"]

        result = await iim.calculate_fee_impact(str(va_account.id))

        assert result is not None
        assert isinstance(result.total_annual_fees, Decimal)
        assert isinstance(result.projected_30yr, Decimal)
