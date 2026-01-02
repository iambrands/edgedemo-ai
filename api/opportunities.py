from flask import Blueprint, request, jsonify, current_app
from utils.decorators import token_required
from services.opportunity_scanner import OpportunityScanner
from services.signal_generator import SignalGenerator
from services.market_movers import MarketMoversService
from services.ai_symbol_recommender import AISymbolRecommender
from models.stock import Stock

opportunities_bp = Blueprint('opportunities', __name__)

def get_db():
    """Get db instance from current app context"""
    return current_app.extensions['sqlalchemy']

@opportunities_bp.route('/today', methods=['GET'])
@token_required
def get_today_opportunities(current_user):
    """Get today's top trading opportunities for the user"""
    try:
        db = get_db()
        scanner = OpportunityScanner()
        signal_generator = SignalGenerator()
        
        # Get user's watchlist
        watchlist = db.session.query(Stock).filter_by(user_id=current_user.id).all()
        symbols_to_scan = [stock.symbol for stock in watchlist]
        
        # If watchlist is empty, use popular symbols as fallback
        if not symbols_to_scan:
            symbols_to_scan = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL']
            try:
                current_app.logger.info(f"User {current_user.id} has empty watchlist, using popular symbols")
            except:
                pass
        
        opportunities = []
        max_opportunities = 5  # Limit to top 5
        
        # Scan each symbol for opportunities
        for symbol in symbols_to_scan[:20]:  # Limit to first 20 symbols to avoid timeout
            try:
                # Generate signals for this symbol
                signals = signal_generator.generate_signals(
                    symbol,
                    {
                        'min_confidence': 0.40,  # Lower threshold for discovery (was 0.50)
                        'strategy_type': 'balanced'
                    }
                )
                
                if 'error' in signals:
                    try:
                        current_app.logger.debug(f"Error generating signals for {symbol}: {signals.get('error')}")
                    except:
                        pass
                    continue
                
                signal_data = signals.get('signals', {})
                
                # Lower threshold to 60% to show more opportunities (was 70%+)
                confidence = signal_data.get('confidence', 0)
                if signal_data.get('recommended', False) or confidence >= 0.60:
                    # Get basic quote info
                    from services.tradier_connector import TradierConnector
                    tradier = TradierConnector()
                    quote = tradier.get_quote(symbol)
                    current_price = None
                    if 'quotes' in quote and 'quote' in quote['quotes']:
                        current_price = quote['quotes']['quote'].get('last', 0)
                    
                    # Get IV metrics if available
                    iv_metrics = signals.get('iv_metrics', {})
                    iv_rank = iv_metrics.get('iv_rank', 0) if iv_metrics else 0
                    
                    opportunity = {
                        'symbol': symbol,
                        'current_price': current_price,
                        'signal_direction': signal_data.get('direction', 'neutral'),
                        'confidence': signal_data.get('confidence', 0),
                        'action': signal_data.get('action', 'hold'),
                        'reason': signal_data.get('reason', ''),
                        'iv_rank': iv_rank,
                        'technical_indicators': {
                            'rsi': signals.get('technical_analysis', {}).get('indicators', {}).get('rsi'),
                            'trend': signal_data.get('trend', 'neutral')
                        },
                        'timestamp': signals.get('timestamp')
                    }
                    
                    opportunities.append(opportunity)
                    
                    # Stop if we have enough
                    if len(opportunities) >= max_opportunities:
                        break
                        
            except Exception as e:
                current_app.logger.warning(f"Error scanning {symbol} for opportunities: {e}")
                continue
        
        # Sort by confidence (highest first)
        opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        return jsonify({
            'opportunities': opportunities[:max_opportunities],
            'count': len(opportunities[:max_opportunities]),
            'source': 'watchlist' if watchlist else 'popular_symbols'
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error getting today's opportunities: {e}", exc_info=True)
        except:
            pass
        return jsonify({'error': 'Failed to load opportunities', 'details': str(e)}), 500

@opportunities_bp.route('/quick-scan', methods=['POST'])
@token_required
def quick_scan(current_user):
    """Quick scan of popular symbols for trading opportunities"""
    try:
        signal_generator = SignalGenerator()
        
        # Popular symbols to scan
        popular_symbols = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX']
        
        opportunities = []
        max_opportunities = 5
        
        # Scan each symbol
        for symbol in popular_symbols:
            try:
                # Generate signals with lower threshold for discovery
                signals = signal_generator.generate_signals(
                    symbol,
                    {
                        'min_confidence': 0.45,  # Lower threshold for quick scan
                        'strategy_type': 'balanced'
                    }
                )
                
                if 'error' in signals:
                    continue
                
                signal_data = signals.get('signals', {})
                confidence = signal_data.get('confidence', 0)
                
                # Lower threshold to show more opportunities (was 0.55)
                if signal_data.get('recommended', False) or confidence >= 0.45:
                    # Get quote info
                    from services.tradier_connector import TradierConnector
                    tradier = TradierConnector()
                    quote = tradier.get_quote(symbol)
                    current_price = None
                    price_change = None
                    if 'quotes' in quote and 'quote' in quote['quotes']:
                        quote_data = quote['quotes']['quote']
                        current_price = quote_data.get('last', 0)
                        price_change = quote_data.get('change', 0)
                    
                    # Get IV metrics
                    iv_metrics = signals.get('iv_metrics', {})
                    iv_rank = iv_metrics.get('iv_rank', 0) if iv_metrics else 0
                    
                    opportunity = {
                        'symbol': symbol,
                        'current_price': current_price,
                        'price_change': price_change,
                        'signal_direction': signal_data.get('direction', 'neutral'),
                        'confidence': confidence,
                        'action': signal_data.get('action', 'hold'),
                        'reason': signal_data.get('reason', ''),
                        'iv_rank': iv_rank,
                        'technical_indicators': {
                            'rsi': signals.get('technical_analysis', {}).get('indicators', {}).get('rsi'),
                            'trend': signal_data.get('trend', 'neutral')
                        },
                        'timestamp': signals.get('timestamp')
                    }
                    
                    opportunities.append(opportunity)
                    
                    # Stop if we have enough
                    if len(opportunities) >= max_opportunities:
                        break
                        
            except Exception as e:
                current_app.logger.warning(f"Error scanning {symbol} in quick scan: {e}")
                continue
        
        # Sort by confidence (highest first)
        opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        return jsonify({
            'opportunities': opportunities[:max_opportunities],
            'count': len(opportunities[:max_opportunities]),
            'source': 'quick_scan'
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error in quick scan: {e}", exc_info=True)
        except:
            pass
        return jsonify({'error': 'Failed to perform quick scan', 'details': str(e)}), 500

@opportunities_bp.route('/market-movers', methods=['GET'])
@token_required
def get_market_movers(current_user):
    """Get market movers - high volume/volatility stocks"""
    try:
        limit = request.args.get('limit', 10, type=int)
        movers_service = MarketMoversService()
        movers = movers_service.get_market_movers(limit=limit)
        
        return jsonify({
            'movers': movers,
            'count': len(movers)
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error getting market movers: {e}", exc_info=True)
        except:
            pass
        return jsonify({'error': 'Failed to load market movers', 'details': str(e)}), 500

@opportunities_bp.route('/ai-suggestions', methods=['GET'])
@token_required
def get_ai_suggestions(current_user):
    """Get AI-powered personalized symbol recommendations"""
    try:
        limit = request.args.get('limit', 8, type=int)
        recommender = AISymbolRecommender()
        recommendations = recommender.get_personalized_recommendations(
            current_user.id, 
            limit=limit
        )
        
        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations)
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error getting AI suggestions: {e}", exc_info=True)
        except:
            pass
        return jsonify({'error': 'Failed to load AI suggestions', 'details': str(e)}), 500

