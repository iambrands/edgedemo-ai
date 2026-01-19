from flask import Blueprint, request, jsonify, current_app
from services.options_analyzer import OptionsAnalyzer
from services.tradier_connector import TradierConnector
from services.ai_signals import AISignals
from utils.decorators import token_required
from utils.helpers import validate_symbol
from utils.performance import log_performance
from utils.redis_cache import cached

options_bp = Blueprint('options', __name__)

def get_analyzer():
    return OptionsAnalyzer()

def get_tradier():
    return TradierConnector()

def get_ai_signals():
    return AISignals()

@options_bp.route('/quote', methods=['GET', 'OPTIONS'])
@options_bp.route('/quote/<symbol>', methods=['GET', 'OPTIONS'])
@log_performance(threshold=1.0)
@cached(timeout=5, key_prefix='quote')  # Cache quotes for 5 seconds
def get_quote(symbol=None):
    """Get current quote for a symbol - uses Tradier (PUBLIC ENDPOINT)"""
    # Handle query parameter or path parameter
    if symbol is None:
        symbol = request.args.get('symbol')
    
    # Log request (no auth required)
    try:
        current_app.logger.debug(f'Quote request for {symbol}')
    except:
        pass
    """Get current quote for a symbol - uses Tradier"""
    try:
        current_app.logger.debug(f'Quote request for {symbol} from user {current_user.id}')
    except:
        pass
    
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        try:
            current_app.logger.warning(f'Invalid symbol: {symbol}')
        except:
            pass
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        # DISABLED: Yahoo Finance - use Tradier directly
        # use_yahoo = current_app.config.get('USE_YAHOO_DATA', False)
        # 
        # # Try Yahoo Finance first if enabled
        # if use_yahoo:
        #     try:
        #         from services.yahoo_connector import YahooConnector
        #         yahoo = YahooConnector()
        #         quote = yahoo.get_quote(symbol)
        #         
        #         if 'quotes' in quote and 'quote' in quote['quotes']:
        #             quote_data = quote['quotes']['quote']
        #             current_price = quote_data.get('last')
        #             if current_price and current_price > 0:
        #                 return jsonify({
        #                     'symbol': symbol,
        #                     'current_price': float(current_price),
        #                     'change': quote_data.get('change', 0),
        #                     'change_percent': ((quote_data.get('change', 0) / quote_data.get('close', current_price)) * 100) if quote_data.get('close') else 0,
        #                     'volume': quote_data.get('volume', 0),
        #                     'high': None,
        #                     'low': None,
        #                     'open': None
        #                 }), 200
        #     except Exception as e:
        #         try:
        #             current_app.logger.warning(f'Yahoo Finance quote failed: {str(e)}')
        #         except:
        #             pass
        
        # Use Tradier directly
        from services.tradier_connector import TradierConnector
        tradier = TradierConnector()
        quote = tradier.get_quote(symbol)
        
        try:
            current_app.logger.info(f'Tradier quote response: {quote}')
        except:
            pass
        
        if 'quotes' in quote and 'quote' in quote['quotes']:
            quote_data = quote['quotes']['quote']
            try:
                current_app.logger.info(f'Quote data: {quote_data}')
            except:
                pass
            current_price = quote_data.get('last')
            if current_price and current_price > 0:
                return jsonify({
                    'symbol': symbol,
                    'current_price': float(current_price),
                    'change': quote_data.get('change', 0),
                    'change_percent': quote_data.get('change_percentage', 0),
                    'volume': quote_data.get('volume', 0),
                    'high': quote_data.get('high'),
                    'low': quote_data.get('low'),
                    'open': quote_data.get('open')
                }), 200
        
        try:
            current_app.logger.error(f'Quote not available for {symbol}. Response: {quote}')
        except:
            pass
        return jsonify({'error': 'Quote not available'}), 404
    except Exception as e:
        try:
            current_app.logger.error(f'Quote error: {str(e)}')
            import traceback
            current_app.logger.error(traceback.format_exc())
        except:
            pass
        return jsonify({'error': str(e)}), 500

@options_bp.route('/analyze', methods=['POST'])
@token_required
@log_performance(threshold=5.0)
def analyze_options(current_user):
    """Analyze options chain with AI-powered explanations"""
    from flask import current_app
    import traceback
    import signal
    
    data = request.get_json()
    
    if not data or not data.get('symbol'):
        return jsonify({'error': 'Symbol required'}), 400
    
    symbol = data['symbol'].upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    expiration = data.get('expiration')
    if not expiration:
        return jsonify({'error': 'Expiration date required'}), 400
    
    preference = data.get('preference', current_user.default_strategy)
    if preference not in ['income', 'growth', 'balanced']:
        preference = 'balanced'
    
    try:
        current_app.logger.info(f'Starting options analysis for {symbol}, expiration {expiration}')
        user_risk_tolerance = current_user.risk_tolerance or 'moderate'
        
        analyzer = get_analyzer()
        current_app.logger.info(f'Analyzer created, calling analyze_options_chain...')
        
        # Add timeout protection - limit analysis to 60 seconds total
        import threading
        import queue
        result_queue = queue.Queue()
        error_queue = queue.Queue()
        
        def run_analysis():
            try:
                results = analyzer.analyze_options_chain(
                    symbol=symbol,
                    expiration=expiration,
                    preference=preference,
                    user_risk_tolerance=user_risk_tolerance
                )
                result_queue.put(results)
            except Exception as e:
                error_queue.put(e)
        
        # Run analysis in a thread with timeout
        analysis_thread = threading.Thread(target=run_analysis, daemon=True)
        analysis_thread.start()
        analysis_thread.join(timeout=60)  # 60 second timeout
        
        if analysis_thread.is_alive():
            # Analysis timed out
            current_app.logger.warning(f'Options analysis timed out for {symbol} {expiration}')
            return jsonify({
                'error': 'Analysis timed out. Please try with a different expiration or symbol.',
                'symbol': symbol,
                'expiration': expiration
            }), 504  # Gateway Timeout
        
        if not error_queue.empty():
            error = error_queue.get()
            raise error
        
        if result_queue.empty():
            # No results returned
            current_app.logger.warning(f'No results returned for {symbol} {expiration}')
            return jsonify({
                'error': 'No options found for this symbol and expiration',
                'symbol': symbol,
                'expiration': expiration
            }), 404
        
        results = result_queue.get()
        current_app.logger.info(f'Analysis complete, returning {len(results)} results')
        
        return jsonify({
            'symbol': symbol,
            'expiration': expiration,
            'preference': preference,
            'options': results,
            'count': len(results)
        }), 200
    except Exception as e:
        current_app.logger.error(f'Error in analyze_options: {str(e)}')
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@options_bp.route('/chain/<symbol>/<expiration>', methods=['GET'])
@token_required
def get_options_chain(current_user, symbol, expiration):
    """Get options chain for symbol and expiration"""
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        tradier = get_tradier()
        chain = tradier.get_options_chain(symbol, expiration)
        return jsonify({
            'symbol': symbol,
            'expiration': expiration,
            'chain': chain
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@options_bp.route('/expirations', methods=['GET'])
@options_bp.route('/expirations/<symbol>', methods=['GET'])
def get_expirations(current_user, symbol):
    """Get available expiration dates for symbol"""
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        try:
            current_app.logger.error(f'Invalid symbol: {symbol}')
        except:
            pass
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        import time
        start_time = time.time()
        
        tradier = get_tradier()
        expirations = tradier.get_options_expirations(symbol, use_cache=True)
        
        elapsed = time.time() - start_time
        try:
            current_app.logger.info(f'✅ Expirations for {symbol}: {len(expirations) if isinstance(expirations, list) else 0} dates (took {elapsed:.2f}s)')
        except:
            pass
        return jsonify({
            'symbol': symbol,
            'expirations': expirations,
            'cached': elapsed < 0.1  # If very fast, likely from cache
        }), 200
    except Exception as e:
        try:
            current_app.logger.error(f'Error getting expirations: {str(e)}')
            import traceback
            current_app.logger.error(traceback.format_exc())
        except:
            pass
        return jsonify({'error': str(e)}), 500

@options_bp.route('/signals/<symbol>', methods=['GET'])
@token_required
def get_signals(current_user, symbol):
    """Get AI-generated signals for symbol"""
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    preference = request.args.get('preference', current_user.default_strategy)
    if preference not in ['income', 'growth', 'balanced']:
        preference = 'balanced'
    
    try:
        ai_signals = get_ai_signals()
        signals = ai_signals.generate_signals(symbol, preference)
        return jsonify({
            'symbol': symbol,
            'signals': signals,
            'count': len(signals)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

