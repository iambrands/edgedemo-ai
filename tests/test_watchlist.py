"""Tests for watchlist functionality"""
import pytest

class TestWatchlist:
    """Test watchlist management"""
    
    def test_add_stock(self, client, auth_headers):
        """Test adding stock to watchlist"""
        response = client.post('/api/watchlist', json={
            'symbol': 'TSLA',
            'notes': 'Test stock',
            'tags': 'tech,ev'
        }, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json
        assert 'stock' in data
        assert data['stock']['symbol'] == 'TSLA'
    
    def test_get_watchlist(self, client, auth_headers, test_stock):
        """Test getting watchlist"""
        response = client.get('/api/watchlist', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'stocks' in data
        assert len(data['stocks']) > 0
    
    def test_update_stock(self, client, auth_headers, test_stock):
        """Test updating stock in watchlist"""
        response = client.put(f'/api/watchlist/{test_stock.id}', json={
            'notes': 'Updated notes',
            'tags': 'updated,tech'
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json
        assert data['stock']['notes'] == 'Updated notes'
    
    def test_delete_stock(self, client, auth_headers, test_stock):
        """Test deleting stock from watchlist"""
        response = client.delete(f'/api/watchlist/{test_stock.id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = client.get('/api/watchlist', headers=auth_headers)
        stock_ids = [s['id'] for s in get_response.json['stocks']]
        assert test_stock.id not in stock_ids

