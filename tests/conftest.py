"""Pytest configuration and fixtures"""
import pytest
import os
import sys
from flask import Flask
from app import create_app, db
from models.user import User
from models.position import Position
from models.trade import Trade
from models.automation import Automation
from models.stock import Stock
from models.feedback import Feedback
import bcrypt

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture(scope='function')
def app():
    """Create application for testing"""
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['SECRET_KEY'] = 'test-secret-key'
    os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret-key'
    os.environ['USE_MOCK_DATA'] = 'true'
    
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture(scope='function')
def test_user(app):
    """Create a test user"""
    with app.app_context():
        user = User(
            username='testuser',
            email='test@example.com',
            password_hash=bcrypt.hashpw('testpass123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            paper_balance=100000.0,
            risk_tolerance='moderate',
            default_strategy='balanced'
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user

@pytest.fixture(scope='function')
def auth_headers(client, test_user):
    """Get authentication headers for test user"""
    response = client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'testpass123'
    })
    token = response.json.get('access_token')
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture(scope='function')
def test_position(app, test_user):
    """Create a test position"""
    with app.app_context():
        position = Position(
            user_id=test_user.id,
            symbol='AAPL',
            contract_type='call',
            quantity=1,
            entry_price=5.50,
            current_price=6.00,
            strike_price=150.0,
            expiration_date='2025-12-31',
            status='open'
        )
        db.session.add(position)
        db.session.commit()
        db.session.refresh(position)
        return position

@pytest.fixture(scope='function')
def test_automation(app, test_user):
    """Create a test automation"""
    with app.app_context():
        automation = Automation(
            user_id=test_user.id,
            name='Test Automation',
            symbol='AAPL',
            strategy_type='long_call',
            is_active=True,
            profit_target_1=25.0,
            stop_loss_percent=10.0,
            exit_at_stop_loss=True,
            min_confidence=0.50
        )
        db.session.add(automation)
        db.session.commit()
        db.session.refresh(automation)
        return automation

@pytest.fixture(scope='function')
def test_stock(app, test_user):
    """Create a test stock in watchlist"""
    with app.app_context():
        stock = Stock(
            user_id=test_user.id,
            symbol='AAPL',
            notes='Test stock'
        )
        db.session.add(stock)
        db.session.commit()
        db.session.refresh(stock)
        return stock

