"""Tests for service layer functionality"""
import pytest
from services.risk_manager import RiskManager
from services.trade_executor import TradeExecutor
from services.position_monitor import PositionMonitor
from utils.helpers import sanitize_input, sanitize_symbol, sanitize_float, sanitize_int

class TestServices:
    """Test service layer functionality"""
    
    def test_sanitize_input(self):
        """Test input sanitization"""
        # Test HTML escaping
        assert sanitize_input('<script>alert("xss")</script>') == '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        
        # Test max length
        long_string = 'a' * 300
        assert len(sanitize_input(long_string, max_length=100)) <= 100
        
        # Test whitespace trimming
        assert sanitize_input('  test  ') == 'test'
    
    def test_sanitize_symbol(self):
        """Test symbol sanitization"""
        assert sanitize_symbol('AAPL') == 'AAPL'
        assert sanitize_symbol('aapl') == 'AAPL'  # Uppercase
        
        # AAPL123 is invalid (numbers not allowed in standard symbols)
        # The validate_symbol function uses regex that only allows letters and dots
        result = sanitize_symbol('AAPL123')
        # Should return empty string for invalid symbols
        assert result == '' or result is None
        
        # Invalid symbols should be rejected or sanitized
        invalid = sanitize_symbol('<script>')
        # Symbol validation should reject or sanitize - check it doesn't contain script tags
        assert invalid == '' or invalid is None or '<' not in invalid
    
    def test_sanitize_float(self):
        """Test float sanitization"""
        assert sanitize_float('5.5') == 5.5
        assert sanitize_float(5.5) == 5.5
        assert sanitize_float('5.5', min_val=0.0, max_val=10.0) == 5.5
        assert sanitize_float('15.5', min_val=0.0, max_val=10.0) is None  # Out of range
        assert sanitize_float('invalid') is None
    
    def test_sanitize_int(self):
        """Test int sanitization"""
        assert sanitize_int('5') == 5
        assert sanitize_int(5) == 5
        assert sanitize_int('5', min_val=0, max_val=10) == 5
        assert sanitize_int('15', min_val=0, max_val=10) is None  # Out of range
        assert sanitize_int('invalid') is None
    
    def test_risk_manager_get_limits(self, app):
        """Test risk manager getting limits"""
        with app.app_context():
            from models.user import User
            user = User.query.first()
            if user:
                risk_manager = RiskManager()
                limits = risk_manager.get_risk_limits(user.id)
                assert 'max_position_size_percent' in limits
                assert 'max_dte' in limits
                assert limits['max_dte'] > 0

