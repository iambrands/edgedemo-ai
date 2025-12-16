"""Tests for trade execution and positions"""
import pytest
from models.position import Position
from models.trade import Trade

class TestTrades:
    """Test trade execution functionality"""
    
    def test_get_positions_empty(self, client, auth_headers):
        """Test getting positions when user has none"""
        response = client.get('/api/trades/positions', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'positions' in data
        assert len(data['positions']) == 0
    
    def test_get_positions_with_data(self, client, auth_headers, test_position):
        """Test getting positions when user has positions"""
        response = client.get('/api/trades/positions', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'positions' in data
        assert len(data['positions']) > 0
        assert data['positions'][0]['symbol'] == 'AAPL'
    
    def test_execute_buy_trade(self, client, auth_headers, app):
        """Test executing a buy trade"""
        with app.app_context():
            initial_balance = client.get('/api/auth/user', headers=auth_headers).json['user']['paper_balance']
            
            response = client.post('/api/trades/execute', json={
                'symbol': 'AAPL',
                'action': 'buy',
                'quantity': 1,
                'contract_type': 'call',
                'strike': 150.0,
                'expiration_date': '2025-12-31',
                'price': 5.50
            }, headers=auth_headers)
            
            assert response.status_code == 200
            data = response.json
            assert 'trade' in data
            assert data['trade']['action'] == 'buy'
            
            # Check balance decreased
            new_balance = client.get('/api/auth/user', headers=auth_headers).json['user']['paper_balance']
            assert new_balance < initial_balance
    
    def test_execute_trade_insufficient_balance(self, client, auth_headers, app):
        """Test executing trade with insufficient balance"""
        with app.app_context():
            # Set balance to very low
            from models.user import User
            user = User.query.filter_by(username='testuser').first()
            user.paper_balance = 1.0
            from app import db
            db.session.commit()
            
            response = client.post('/api/trades/execute', json={
                'symbol': 'AAPL',
                'action': 'buy',
                'quantity': 10,
                'contract_type': 'call',
                'strike': 150.0,
                'expiration_date': '2025-12-31',
                'price': 100.0  # Very expensive
            }, headers=auth_headers)
            
            assert response.status_code == 400
            assert 'balance' in response.json.get('error', '').lower()
    
    def test_execute_trade_invalid_symbol(self, client, auth_headers):
        """Test executing trade with invalid symbol"""
        response = client.post('/api/trades/execute', json={
            'symbol': 'INVALID123',
            'action': 'buy',
            'quantity': 1,
            'contract_type': 'call',
            'strike': 150.0,
            'expiration_date': '2025-12-31'
        }, headers=auth_headers)
        
        # Should either fail validation or return error
        assert response.status_code in [400, 500]
    
    def test_get_trade_history(self, client, auth_headers):
        """Test getting trade history"""
        response = client.get('/api/trades/history', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'trades' in data
    
    def test_refresh_position(self, client, auth_headers, test_position):
        """Test refreshing position data"""
        response = client.post(f'/api/trades/positions/{test_position.id}/refresh', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'position' in data
        assert 'message' in data
    
    def test_close_position(self, client, auth_headers, test_position, app):
        """Test closing a position"""
        with app.app_context():
            response = client.post(f'/api/trades/positions/{test_position.id}/close', 
                                 json={'exit_price': 6.50}, 
                                 headers=auth_headers)
            assert response.status_code == 200
            data = response.json
            assert 'trade' in data
            assert data['trade']['action'] == 'sell'

