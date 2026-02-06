"""
End-to-end test: IIM analysis -> CIM validation -> BIM response.
Uses mocked DB session — full pipeline with Nicole Wilson data would need seeded DB.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from backend.services.ai_orchestrator import AIOrchestrator, OrchestratorResponse


@pytest.mark.asyncio
async def test_orchestrator_returns_response():
    """Orchestrator returns valid response structure."""
    mock_session = AsyncMock()
    orchestrator = AIOrchestrator(mock_session)

    result = await orchestrator.process_query(
        client_id="00000000-0000-0000-0000-000000000001",
        query="Analyze my portfolio",
    )

    assert isinstance(result, OrchestratorResponse)
    assert result.message is not None
    assert len(result.message) > 0
    assert result.latency_ms >= 0


@pytest.mark.asyncio
async def test_orchestrator_latency_reasonable():
    """Pipeline completes in reasonable time (no LLM calls in this test path)."""
    mock_session = AsyncMock()
    orchestrator = AIOrchestrator(mock_session)

    result = await orchestrator.process_query(
        client_id="00000000-0000-0000-0000-000000000001",
        query="What are my fees?",
    )

    assert result.latency_ms < 10000
