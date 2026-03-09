"""Unit tests for IMM-01 Redis data freshness logic."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_get_data_freshness_no_redis():
    """Returns safe defaults when Redis unavailable."""
    with patch("backend.services.redis_client.get_redis", return_value=None):
        from backend.services.iim_service import IIMService
        mock_db = AsyncMock()
        iim = IIMService(mock_db)
        result = await iim.get_data_freshness("test-advisor-id")
        assert "last_sync" in result
        assert "stale" in result
        assert "age_seconds" in result
        assert result["age_seconds"] == 0


@pytest.mark.asyncio
async def test_data_freshness_stale_threshold():
    """Data older than 90 seconds is considered stale."""
    import time
    mock_redis = AsyncMock()
    old_ts = str(int(time.time()) - 120)
    mock_redis.get = AsyncMock(return_value=old_ts)

    with patch("backend.services.redis_client.get_redis", return_value=mock_redis):
        from backend.services.iim_service import IIMService
        mock_db = AsyncMock()
        iim = IIMService(mock_db)
        result = await iim.get_data_freshness("test-advisor-id")
        assert result["stale"] is True
        assert result["age_seconds"] >= 120


@pytest.mark.asyncio
async def test_data_freshness_fresh():
    """Data within 90 seconds is not stale."""
    import time
    mock_redis = AsyncMock()
    fresh_ts = str(int(time.time()) - 10)
    mock_redis.get = AsyncMock(return_value=fresh_ts)

    with patch("backend.services.redis_client.get_redis", return_value=mock_redis):
        from backend.services.iim_service import IIMService
        mock_db = AsyncMock()
        iim = IIMService(mock_db)
        result = await iim.get_data_freshness("test-advisor-id")
        assert result["stale"] is False
        assert result["age_seconds"] < 90
