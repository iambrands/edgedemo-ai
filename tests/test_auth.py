"""Tests for authentication endpoints"""
import pytest
from models.user import User
import bcrypt

class TestAuth:
    """Test authentication functionality"""
    
    def test_register_success(self, client):
        """Test successful user registration"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123'
        })
        assert response.status_code == 201
        data = response.json
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['username'] == 'newuser'
        assert data['user']['paper_balance'] == 100000.0
    
    def test_register_duplicate_username(self, client, test_user):
        """Test registration with duplicate username"""
        response = client.post('/api/auth/register', json={
            'username': 'testuser',
            'email': 'different@example.com',
            'password': 'password123'
        })
        assert response.status_code == 400
        assert 'already exists' in response.json.get('error', '').lower()
    
    def test_register_duplicate_email(self, client, test_user):
        """Test registration with duplicate email"""
        response = client.post('/api/auth/register', json={
            'username': 'differentuser',
            'email': 'test@example.com',
            'password': 'password123'
        })
        assert response.status_code == 400
    
    def test_register_invalid_data(self, client):
        """Test registration with invalid data"""
        response = client.post('/api/auth/register', json={
            'username': 'ab',  # Too short
            'email': 'invalid-email',
            'password': '123'  # Too short
        })
        assert response.status_code == 400
    
    def test_login_success(self, client, test_user):
        """Test successful login"""
        response = client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        assert response.status_code == 200
        data = response.json
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['username'] == 'testuser'
    
    def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password"""
        response = client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'password123'
        })
        assert response.status_code == 401
    
    def test_get_user_info(self, client, auth_headers):
        """Test getting current user info"""
        response = client.get('/api/auth/user', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'user' in data
        assert data['user']['username'] == 'testuser'
    
    def test_get_user_info_no_auth(self, client):
        """Test getting user info without authentication"""
        response = client.get('/api/auth/user')
        assert response.status_code == 401

