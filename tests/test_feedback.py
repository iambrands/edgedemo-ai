"""Tests for feedback functionality"""
import pytest

class TestFeedback:
    """Test feedback submission"""
    
    def test_submit_feedback(self, client, auth_headers):
        """Test submitting feedback"""
        response = client.post('/api/feedback', json={
            'feedback_type': 'bug',
            'title': 'Test Bug',
            'message': 'This is a test bug report',
            'page_url': '/dashboard'
        }, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json
        assert 'feedback' in data
        assert data['feedback']['feedback_type'] == 'bug'
        assert data['feedback']['title'] == 'Test Bug'
    
    def test_submit_feedback_missing_fields(self, client, auth_headers):
        """Test submitting feedback with missing required fields"""
        response = client.post('/api/feedback', json={
            'feedback_type': 'bug'
            # Missing title and message
        }, headers=auth_headers)
        
        assert response.status_code == 400
    
    def test_submit_feedback_invalid_type(self, client, auth_headers):
        """Test submitting feedback with invalid type"""
        response = client.post('/api/feedback', json={
            'feedback_type': 'invalid_type',
            'title': 'Test',
            'message': 'Test message'
        }, headers=auth_headers)
        
        assert response.status_code == 400
    
    def test_get_user_feedback(self, client, auth_headers):
        """Test getting user's feedback"""
        # First submit some feedback
        client.post('/api/feedback', json={
            'feedback_type': 'feature',
            'title': 'Test Feature',
            'message': 'Test message'
        }, headers=auth_headers)
        
        # Then get it
        response = client.get('/api/feedback', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'feedback' in data
        assert len(data['feedback']) > 0

