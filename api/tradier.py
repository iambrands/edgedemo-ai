"""
Tradier API endpoints for testing connections
"""
from flask import Blueprint, jsonify, request, current_app
from utils.decorators import token_required
from services.tradier_connector import TradierConnector
import logging

logger = logging.getLogger(__name__)

tradier_bp = Blueprint('tradier', __name__, url_prefix='/api/tradier')

@tradier_bp.route('/test-connection', methods=['POST'])
@token_required
def test_connection(current_user):
    """Test Tradier API connection with provided credentials."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body required'
            }), 400
        
        api_key = data.get('api_key')
        account_id = data.get('account_id')
        environment = data.get('environment', 'sandbox')
        
        if not api_key or not account_id:
            return jsonify({
                'success': False,
                'message': 'API key and account ID are required'
            }), 400
        
        # Create a temporary Tradier connector with test credentials
        test_connector = TradierConnector()
        test_connector.api_key = api_key
        test_connector.account_id = account_id
        test_connector.environment = environment
        
        # Test connection by getting account info
        try:
            # Try to get account balances
            account_info = test_connector.get_account_balances()
            
            if account_info:
                logger.info(f"✅ Tradier connection test successful for user {current_user.id}")
                return jsonify({
                    'success': True,
                    'message': 'Connection test successful',
                    'account_id': account_id,
                    'environment': environment
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': 'Connection test failed - no account data returned'
                }), 400
                
        except Exception as e:
            logger.error(f"Tradier connection test failed: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Connection test failed: {str(e)}'
            }), 400
        
    except Exception as e:
        logger.error(f"Error testing Tradier connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to test connection: {str(e)}'
        }), 500

