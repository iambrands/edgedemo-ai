"""Tests for automation functionality"""
import pytest

class TestAutomations:
    """Test automation management"""
    
    def test_create_automation(self, client, auth_headers):
        """Test creating an automation"""
        response = client.post('/api/automations', json={
            'name': 'Test Automation',
            'symbol': 'AAPL',
            'strategy_type': 'long_call',
            'profit_target_1': 25.0,
            'stop_loss_percent': 10.0,
            'exit_at_stop_loss': True,
            'min_confidence': 0.50
        }, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json
        assert 'automation' in data
        assert data['automation']['name'] == 'Test Automation'
        assert data['automation']['symbol'] == 'AAPL'
    
    def test_get_automations(self, client, auth_headers, test_automation):
        """Test getting user's automations"""
        response = client.get('/api/automations', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert 'automations' in data
        assert len(data['automations']) > 0
    
    def test_update_automation(self, client, auth_headers, test_automation):
        """Test updating an automation"""
        response = client.put(f'/api/automations/{test_automation.id}', json={
            'name': 'Updated Automation',
            'profit_target_1': 30.0
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json
        assert data['automation']['name'] == 'Updated Automation'
        assert data['automation']['profit_target_1'] == 30.0
    
    def test_delete_automation(self, client, auth_headers, test_automation):
        """Test deleting an automation"""
        response = client.delete(f'/api/automations/{test_automation.id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = client.get('/api/automations', headers=auth_headers)
        automation_ids = [a['id'] for a in get_response.json['automations']]
        assert test_automation.id not in automation_ids
    
    def test_toggle_automation(self, client, auth_headers, test_automation):
        """Test toggling automation active status"""
        initial_status = test_automation.is_active
        
        response = client.post(f'/api/automations/{test_automation.id}/toggle', headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert data['automation']['is_active'] != initial_status

