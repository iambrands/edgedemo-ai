from flask import Blueprint, request, jsonify, current_app
from services.options_analyzer import OptionsAnalyzer
from services.tradier_connector import TradierConnector
from services.ai_signals import AISignals
from utils.decorators import token_required
from utils.helpers import validate_symbol
from utils.performance import log_performance
from utils.redis_cache import cached
import logging
import requests
import traceback

logger = logging.getLogger(__name__)

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
    
    if not symbol:
        return jsonify({'error': 'Symbol required'}), 400
    
    # Log request (no auth required)
    try:
        current_app.logger.debug(f'Quote request for {symbol}')
    except:
        pass
    
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        try:
            current_app.logger.warning(f'Invalid symbol: {symbol}')
        except:
            pass
        return jsonify({
            'error': 'Invalid symbol',
            'message': 'Symbol must be between 1-10 characters and contain only letters'
        }), 400
    
    try:
        # Use Tradier directly
        try:
            tradier = TradierConnector()
        except AttributeError as e:
            logger.error(f"Tradier client initialization error: {str(e)}")
            return jsonify({
                'error': 'Service configuration error',
                'message': 'Trading service not available'
            }), 503
        except Exception as e:
            logger.error(f"Failed to initialize Tradier client: {str(e)}")
            return jsonify({
                'error': 'Service error',
                'message': 'Unable to initialize trading service'
            }), 503
        
        try:
            quote = tradier.get_quote(symbol)
        except requests.exceptions.RequestException as e:
            logger.error(f"Tradier API request failed: {str(e)}")
            return jsonify({
                'error': 'External API error',
                'message': 'Unable to fetch quote from trading service'
            }), 502
        except AttributeError as e:
            logger.error(f"Tradier client error: {str(e)}")
            return jsonify({
                'error': 'Service configuration error',
                'message': 'Trading service not available'
            }), 503
        
        if not quote:
            logger.warning(f"No quote data returned for {symbol}")
            return jsonify({
                'error': 'Quote not found',
                'message': f'No quote data available for {symbol}'
            }), 404
        
        try:
            logger.info(f'Tradier quote response: {quote}')
        except:
            pass
        
        try:
            if 'quotes' in quote and 'quote' in quote['quotes']:
                quote_data = quote['quotes']['quote']
                # Handle both dict and list responses
                if isinstance(quote_data, list):
                    if len(quote_data) > 0:
                        quote_data = quote_data[0]
                    else:
                        logger.warning(f"Empty quote list for {symbol}")
                        return jsonify({
                            'error': 'Quote not found',
                            'message': f'No quote data available for {symbol}'
                        }), 404
                
                try:
                    logger.info(f'Quote data: {quote_data}')
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
        except KeyError as e:
            logger.error(f"Unexpected Tradier response format: {str(e)}")
            return jsonify({
                'error': 'Data format error',
                'message': 'Received unexpected data from trading service'
            }), 500
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid quote data format: {str(e)}")
            return jsonify({
                'error': 'Data format error',
                'message': 'Invalid quote data format'
            }), 500
        
        logger.warning(f'Quote not available for {symbol}. Response: {quote}')
        return jsonify({
            'error': 'Quote not available',
            'message': f'No valid quote data for {symbol}'
        }), 404
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Tradier API request failed in quote: {str(e)}")
        return jsonify({
            'error': 'External API error',
            'message': 'Unable to fetch quote from trading service'
        }), 502
        
    except KeyError as e:
        logger.error(f"Unexpected Tradier response format in quote: {str(e)}")
        return jsonify({
            'error': 'Data format error',
            'message': 'Received unexpected data from trading service'
        }), 500
        
    except Exception as e:
        logger.error(f"Unexpected error in get_quote: {str(e)}")
        logger.exception(e)  # Log full stack trace
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }), 500

@options_bp.route('/analyze', methods=['POST'])
@log_performance(threshold=5.0)
def analyze_options():
    """Analyze options chain with AI-powered explanations (PUBLIC ENDPOINT)"""
    from flask import current_app
    import traceback
    import signal
    import time
    import sys
    from datetime import datetime
    
    # Performance tracking
    start_time = time.time()
    perf_log = {
        'start': datetime.now().isoformat(),
        'steps': {}
    }
    
    # Force immediate console output (will appear in Railway logs)
    print("=" * 60, file=sys.stderr, flush=True)
    print(f"[CHAIN ANALYZER] Request started at {perf_log['start']}", file=sys.stderr, flush=True)
    print("=" * 60, file=sys.stderr, flush=True)
    
    try:
        current_app.logger.info("=" * 60)
        current_app.logger.info(f"[CHAIN ANALYZER] Request started at {perf_log['start']}")
    except:
        pass
    
    data = request.get_json()
    
    if not data or not data.get('symbol'):
        return jsonify({'error': 'Symbol required'}), 400
    
    symbol = data['symbol'].upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    expiration = data.get('expiration')
    if not expiration:
        return jsonify({'error': 'Expiration date required'}), 400
    
    # Get preference from request or default to 'balanced'
    preference = data.get('preference', 'balanced')
    if preference not in ['income', 'growth', 'balanced', 'aggressive', 'conservative']:
        preference = 'balanced'
    
    # PHASE 4: Check smart cache first
    cache_check_start = time.time()
    try:
        from services.smart_cache import SmartCache
        cached_result = SmartCache.get_cached_analysis(symbol, expiration, 'both', preference)
        cache_check_time = time.time() - cache_check_start
        perf_log['steps']['cache_check'] = round(cache_check_time, 3)
        
        if cached_result:
            total_time = time.time() - start_time
            perf_log['total'] = round(total_time, 3)
            try:
                current_app.logger.info(f'💾 Using cached analysis for {symbol} {expiration}')
                current_app.logger.info(f"[CHAIN ANALYZER] ⏱️ Cache check: {cache_check_time:.3f}s, Total: {total_time:.3f}s")
                current_app.logger.info("=" * 60)
            except:
                pass
            return jsonify({
                'symbol': symbol,
                'expiration': expiration,
                'preference': preference,
                'options': cached_result,
                'count': len(cached_result) if isinstance(cached_result, list) else 0,
                'cached': True,
                'performance': perf_log,
                'usage': current_user.get_analysis_usage() if current_user else None
            }), 200
    except Exception as e:
        cache_check_time = time.time() - cache_check_start
        perf_log['steps']['cache_check'] = round(cache_check_time, 3)
        try:
            current_app.logger.debug(f"Cache check failed (non-critical): {e}")
        except:
            pass
    
    # Try to get user if available, but don't require it
    current_user = None
    try:
        from flask_jwt_extended import get_jwt_identity
        from models.user import User
        user_id = get_jwt_identity()
        if user_id:
            current_user = User.query.get(int(user_id))
    except:
        pass
    
    # Check rate limit if user is authenticated (before cache check to avoid cache hits for rate-limited users)
    if current_user:
        try:
            if not current_user.can_analyze():
                usage = current_user.get_analysis_usage()
                return jsonify({
                    'error': 'Daily analysis limit reached',
                    'message': f"You've used all {usage['limit']} AI analyses for today. Resets at midnight EST.",
                    'usage': usage
                }), 429
        except AttributeError:
            # User model doesn't have rate limiting - skip check
            pass
    
    # Use user's risk tolerance if available, otherwise default
    user_risk_tolerance = 'moderate'
    if current_user and current_user.risk_tolerance:
        user_risk_tolerance = current_user.risk_tolerance
    
    try:
        # Force console output
        print(f'[CHAIN ANALYZER] Symbol: {symbol}, Expiration: {expiration}, Preference: {preference}', file=sys.stderr, flush=True)
        
        try:
            current_app.logger.info(f'[CHAIN ANALYZER] Symbol: {symbol}, Expiration: {expiration}, Preference: {preference}')
        except:
            pass
        
        analyzer_start = time.time()
        analyzer = get_analyzer()
        analyzer_init_time = time.time() - analyzer_start
        perf_log['steps']['analyzer_init'] = round(analyzer_init_time, 3)
        
        try:
            current_app.logger.info(f'[CHAIN ANALYZER] Analyzer created in {analyzer_init_time:.3f}s')
        except:
            pass
        
        # Add timeout protection - limit analysis to 20 seconds (reduced further)
        # Railway has a 30s timeout, so we need to finish well before that
        import threading
        import queue
        result_queue = queue.Queue()
        error_queue = queue.Queue()
        
        def run_analysis():
            try:
                analysis_start = time.time()
                # Limit the analysis to prevent timeouts
                results = analyzer.analyze_options_chain(
                    symbol=symbol,
                    expiration=expiration,
                    preference=preference,
                    user_risk_tolerance=user_risk_tolerance
                )
                analysis_time = time.time() - analysis_start
                perf_log['steps']['analysis'] = round(analysis_time, 3)
                
                # Count CALLs vs PUTs
                calls = [r for r in results if (r.get('contract_type') or '').lower() == 'call']
                puts = [r for r in results if (r.get('contract_type') or '').lower() == 'put']
                perf_log['results'] = {
                    'total': len(results),
                    'calls': len(calls),
                    'puts': len(puts),
                    'call_percent': round(len(calls) / len(results) * 100, 1) if results else 0,
                    'put_percent': round(len(puts) / len(results) * 100, 1) if results else 0
                }
                
                try:
                    current_app.logger.info(
                        f"[CHAIN ANALYZER] ⏱️ Analysis took: {analysis_time:.3f}s - "
                        f"{len(results)} results ({len(calls)} CALLs, {len(puts)} PUTs)"
                    )
                except:
                    pass
                
                result_queue.put(results)
            except Exception as e:
                error_queue.put(e)
        
        # Run analysis in a thread with timeout
        analysis_thread = threading.Thread(target=run_analysis, daemon=True)
        analysis_thread.start()
        analysis_thread.join(timeout=20)  # 20 second timeout (before Railway's 30s)
        
        if analysis_thread.is_alive():
            # Analysis timed out - return a helpful error
            current_app.logger.warning(f'Options analysis timed out for {symbol} {expiration}')
            return jsonify({
                'error': 'Analysis timed out',
                'message': 'The analysis is taking too long. This may be due to high API load or complex options chain.',
                'symbol': symbol,
                'expiration': expiration,
                'suggestion': 'Try a more liquid symbol (like SPY, QQQ) or a closer expiration date',
                'retry_after': 60
            }), 504  # Gateway Timeout
        
        if not error_queue.empty():
            error = error_queue.get()
            current_app.logger.error(f'Analysis error: {str(error)}', exc_info=True)
            return jsonify({
                'error': 'Analysis failed',
                'message': str(error),
                'symbol': symbol,
                'expiration': expiration
            }), 500
        
        if result_queue.empty():
            # No results returned
            current_app.logger.warning(f'No results returned for {symbol} {expiration}')
            return jsonify({
                'error': 'No options found',
                'message': 'No options found for this symbol and expiration',
                'symbol': symbol,
                'expiration': expiration,
                'suggestion': 'Try a different expiration date or symbol'
            }), 404
        
        results = result_queue.get()
        
        # TODO: Uncomment after running: flask db upgrade
        # Increment rate limit counter if user is authenticated
        # if current_user:
        #     try:
        #         current_user.increment_analysis_count()
        #     except AttributeError:
        #         # User model doesn't have rate limiting yet - skip
        #         pass
        
        # Cache the result with smart TTL
        cache_write_start = time.time()
        try:
            from services.smart_cache import SmartCache
            SmartCache.cache_analysis(symbol, expiration, 'both', preference, results)
            cache_write_time = time.time() - cache_write_start
            perf_log['steps']['cache_write'] = round(cache_write_time, 3)
        except Exception as e:
            cache_write_time = time.time() - cache_write_start
            perf_log['steps']['cache_write'] = round(cache_write_time, 3)
            try:
                current_app.logger.warning(f"Failed to cache analysis result: {e}")
            except:
                pass
        
        total_time = time.time() - start_time
        perf_log['total'] = round(total_time, 3)
        
        # Force console output
        print(f"[CHAIN ANALYZER] ✅ Total request time: {total_time:.3f}s", file=sys.stderr, flush=True)
        print(f"[CHAIN ANALYZER] Performance breakdown: {perf_log}", file=sys.stderr, flush=True)
        print("=" * 60, file=sys.stderr, flush=True)
        
        try:
            current_app.logger.info(f"[CHAIN ANALYZER] ✅ Total request time: {total_time:.3f}s")
            current_app.logger.info(f"[CHAIN ANALYZER] Performance breakdown: {perf_log}")
            current_app.logger.info("=" * 60)
        except:
            pass
        
        return jsonify({
            'symbol': symbol,
            'expiration': expiration,
            'preference': preference,
            'options': results,
            'count': len(results),
            'cached': False,
            'performance': perf_log,
            'usage': current_user.get_analysis_usage() if current_user else None
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

@options_bp.route('/quote', methods=['POST'])
def get_option_quote():
    """Get current market price for a specific option contract (PUBLIC ENDPOINT)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Request body must be JSON'
            }), 400
        
        symbol = data.get('symbol', '').upper()
        option_type = data.get('option_type', '').lower()
        strike = data.get('strike')
        expiration = data.get('expiration')
        
        if not symbol:
            return jsonify({
                'error': 'Missing parameter',
                'message': 'Symbol is required'
            }), 400
        if option_type not in ['call', 'put']:
            return jsonify({
                'error': 'Invalid parameter',
                'message': 'option_type must be "call" or "put"'
            }), 400
        if not strike:
            return jsonify({
                'error': 'Missing parameter',
                'message': 'Strike price is required'
            }), 400
        if not expiration:
            return jsonify({
                'error': 'Missing parameter',
                'message': 'Expiration date is required'
            }), 400
        
        try:
            strike_float = float(strike)
        except (ValueError, TypeError):
            return jsonify({
                'error': 'Invalid parameter',
                'message': 'Strike price must be a valid number'
            }), 400
        
        # Validate symbol
        if not validate_symbol(symbol):
            return jsonify({
                'error': 'Invalid symbol',
                'message': 'Symbol must be between 1-10 characters and contain only letters'
            }), 400
        
        logger.info(
            f'[OPTION QUOTE] Request: {symbol} {option_type} ${strike_float} exp {expiration}'
        )
        
        # Get quote from Tradier
        try:
            tradier = get_tradier()
        except AttributeError as e:
            logger.error(f"Tradier client initialization error: {str(e)}")
            return jsonify({
                'error': 'Service configuration error',
                'message': 'Trading service not available'
            }), 503
        except Exception as e:
            logger.error(f"Failed to initialize Tradier client: {str(e)}")
            return jsonify({
                'error': 'Service error',
                'message': 'Unable to initialize trading service'
            }), 503
        
        try:
            quote = tradier.get_option_quote(
                symbol=symbol,
                option_type=option_type,
                strike=strike_float,
                expiration=expiration
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"Tradier API request failed: {str(e)}")
            return jsonify({
                'error': 'External API error',
                'message': 'Unable to fetch option quote from trading service'
            }), 502
        except AttributeError as e:
            logger.error(f"Tradier client error: {str(e)}")
            return jsonify({
                'error': 'Service configuration error',
                'message': 'Trading service not available'
            }), 503
        
        if not quote:
            logger.warning(
                f'Option not found: {symbol} {option_type} ${strike_float} exp {expiration}'
            )
            return jsonify({
                'success': False,
                'error': 'Option not found',
                'message': f'No quote data available for {symbol} {option_type} ${strike_float} {expiration}'
            }), 404
        
        try:
            logger.info(
                f'[OPTION QUOTE] Success: {symbol} {option_type} ${strike_float} - '
                f'mid=${quote.get("mid", 0):.2f}, bid=${quote.get("bid", 0):.2f}, ask=${quote.get("ask", 0):.2f}'
            )
        except:
            pass
        
        return jsonify({
            'success': True,
            'symbol': quote.get('symbol'),
            'option_type': quote.get('option_type'),
            'strike': quote.get('strike'),
            'expiration': quote.get('expiration'),
            'last': quote.get('last', 0),
            'bid': quote.get('bid', 0),
            'ask': quote.get('ask', 0),
            'mid': quote.get('mid', 0),
            'volume': quote.get('volume', 0),
            'open_interest': quote.get('open_interest', 0),
            'greeks': quote.get('greeks', {})
        }), 200
        
    except KeyError as e:
        logger.error(f"Unexpected response format in option quote: {str(e)}")
        return jsonify({
            'error': 'Data format error',
            'message': 'Received unexpected data from trading service'
        }), 500
        
    except ValueError as e:
        logger.error(f"Invalid data in option quote: {str(e)}")
        return jsonify({
            'error': 'Invalid data',
            'message': str(e)
        }), 400
        
    except Exception as e:
        logger.error(f"Unexpected error in get_option_quote: {str(e)}")
        logger.exception(e)  # Log full stack trace
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }), 500

@options_bp.route('/expirations', methods=['GET'])
@options_bp.route('/expirations/<symbol>', methods=['GET'])
def get_expirations(symbol=None):
    """Get available expiration dates for symbol (PUBLIC ENDPOINT)"""
    try:
        # Handle query parameter or path parameter
        if symbol is None:
            symbol = request.args.get('symbol')
        
        if not symbol:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Symbol is required'
            }), 400
        
        symbol = symbol.upper()
        if not validate_symbol(symbol):
            logger.error(f'Invalid symbol: {symbol}')
            return jsonify({
                'error': 'Invalid symbol',
                'message': 'Symbol must be between 1-10 characters and contain only letters'
            }), 400
        
        try:
            import time
            start_time = time.time()
            
            tradier = get_tradier()
        except AttributeError as e:
            logger.error(f"Tradier client initialization error: {str(e)}")
            return jsonify({
                'error': 'Service configuration error',
                'message': 'Trading service not available'
            }), 503
        except Exception as e:
            logger.error(f"Failed to initialize Tradier client: {str(e)}")
            return jsonify({
                'error': 'Service error',
                'message': 'Unable to initialize trading service'
            }), 503
        
        try:
            expirations = tradier.get_options_expirations(symbol, use_cache=True)
        except requests.exceptions.RequestException as e:
            logger.error(f"Tradier API request failed: {str(e)}")
            return jsonify({
                'error': 'External API error',
                'message': 'Unable to fetch expiration dates from trading service'
            }), 502
        except AttributeError as e:
            logger.error(f"Tradier client error: {str(e)}")
            return jsonify({
                'error': 'Service configuration error',
                'message': 'Trading service not available'
            }), 503
        
        if not expirations:
            logger.warning(f"No expirations returned for {symbol}")
            return jsonify({
                'error': 'Expirations not found',
                'message': f'No expiration dates available for {symbol}'
            }), 404
        
        if not isinstance(expirations, list):
            logger.error(f"Unexpected expirations format for {symbol}: {type(expirations)}")
            return jsonify({
                'error': 'Data format error',
                'message': 'Received unexpected data from trading service'
            }), 500
        
        elapsed = time.time() - start_time
        logger.info(f'✅ Expirations for {symbol}: {len(expirations)} dates (took {elapsed:.2f}s)')
        
        return jsonify({
            'symbol': symbol,
            'expirations': expirations,
            'cached': elapsed < 0.1  # If very fast, likely from cache
        }), 200
        
    except KeyError as e:
        logger.error(f"Unexpected Tradier response format: {str(e)}")
        return jsonify({
            'error': 'Data format error',
            'message': 'Received unexpected data from trading service'
        }), 500
        
    except Exception as e:
        logger.error(f"Unexpected error in get_expirations: {str(e)}")
        logger.exception(e)  # Log full stack trace
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }), 500

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

