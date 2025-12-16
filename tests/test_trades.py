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
    
    def test_get_positions_with_data(self, client, auth_headers, app, test_user):
        """Test getting positions when user has positions"""
        from datetime import date
        with app.app_context():
            from models.position import Position
            from app import db
            # Create a position for the test user
            position = Position(
                user_id=test_user.id,
                symbol='AAPL',
                contract_type='call',
                quantity=1,
                entry_price=5.50,
                current_price=6.00,
                strike_price=150.0,
                expiration_date=date(2025, 12, 31),  # Use date object, not string
                status='open'
            )
            db.session.add(position)
            db.session.commit()
        
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
            
            # Trade execution returns 201 on success
            assert response.status_code in [200, 201]
            data = response.json
            assert 'trade' in data or 'trade_id' in data
            if 'trade' in data:
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
    
    def test_refresh_position(self, client, auth_headers, app, test_user):
        """Test refreshing position data"""
        from datetime import date
        with app.app_context():
            from models.position import Position
            from app import db
            # Create a position for the test user
            position = Position(
                user_id=test_user.id,
                symbol='AAPL',
                contract_type='call',
                quantity=1,
                entry_price=5.50,
                current_price=6.00,
                strike_price=150.0,
                expiration_date=date(2025, 12, 31),  # Use date object, not string
                status='open'
            )
            db.session.add(position)
            db.session.commit()
            position_id = position.id
        
        response = client.post(f'/api/trades/positions/{position_id}/refresh', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'position' in data
        assert 'message' in data
    
    def test_close_position(self, client, auth_headers, app, test_user):
        """Test closing a position"""
        from datetime import date
        with app.app_context():
            from models.position import Position
            from app import db
            # Create a position for the test user
            position = Position(
                user_id=test_user.id,
                symbol='AAPL',
                contract_type='call',
                quantity=1,
                entry_price=5.50,
                current_price=6.00,
                strike_price=150.0,
                expiration_date=date(2025, 12, 31),  # Use date object, not string
                status='open'
            )
            db.session.add(position)
            db.session.commit()
            position_id = position.id
        
        response = client.post(f'/api/trades/positions/{position_id}/close', 
                             json={'exit_price': 6.50}, 
                             headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'trade' in data
        assert data['trade']['action'] == 'sell'

