"""Tests for opportunity discovery features"""
import pytest

class TestOpportunities:
    """Test opportunity discovery endpoints"""
    
    def test_get_today_opportunities(self, client, auth_headers):
        """Test getting today's opportunities"""
        response = client.get('/api/opportunities/today', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'opportunities' in data
        # May be empty if no opportunities found
    
    def test_quick_scan(self, client, auth_headers):
        """Test quick scan feature"""
        response = client.get('/api/opportunities/quick-scan', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'opportunities' in data
    
    def test_get_market_movers(self, client, auth_headers):
        """Test getting market movers"""
        response = client.get('/api/opportunities/market-movers', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'movers' in data
    
    def test_get_ai_suggestions(self, client, auth_headers):
        """Test getting AI-powered suggestions"""
        response = client.get('/api/opportunities/ai-suggestions', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'recommendations' in data

