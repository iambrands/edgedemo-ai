from flask import Blueprint, request, jsonify, current_app
from utils.decorators import token_required
from services.opportunity_scanner import OpportunityScanner
from services.signal_generator import SignalGenerator
from services.market_movers import MarketMoversService
from services.ai_symbol_recommender import AISymbolRecommender
from services.opportunity_insights import OpportunityInsights
from models.stock import Stock
from datetime import datetime

opportunities_bp = Blueprint('opportunities', __name__)

def get_db():
    """Get db instance from current app context"""
    return current_app.extensions['sqlalchemy']

@opportunities_bp.route('/today', methods=['GET'])
@token_required
def get_today_opportunities(current_user):
    """Get today's top trading opportunities - optimized for speed"""
    try:
        db = get_db()
        
        # Get user's watchlist
        watchlist = db.session.query(Stock).filter_by(user_id=current_user.id).all()
        watchlist_symbols = [stock.symbol for stock in watchlist]
        
        # Use hardcoded list of 10 high-volume symbols (same as Market Movers for consistency)
        # If user has watchlist, prioritize those, but limit to 10 for speed
        curated_symbols = [
            'SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL'
        ]
        
        # Combine watchlist with curated symbols, prioritize watchlist
        if watchlist_symbols:
            # Use watchlist symbols first, then fill with curated if needed
            symbols_to_scan = (watchlist_symbols + curated_symbols)[:10]
            source = 'watchlist'
        else:
            symbols_to_scan = curated_symbols[:10]
            source = 'popular_symbols'
            try:
                current_app.logger.info(f"User {current_user.id} has empty watchlist, using curated symbols")
            except:
                pass
        
        opportunities = []
        from services.tradier_connector import TradierConnector
        tradier = TradierConnector()
        
        # Fast scan - just get quotes and calculate basic signals
        for symbol in symbols_to_scan:
            try:
                # Get quote (fast API call)
                quote = tradier.get_quote(symbol)
                if 'quotes' not in quote or 'quote' not in quote['quotes']:
                    continue
                
                quote_data = quote['quotes']['quote']
                current_price = quote_data.get('last', 0)
                change = quote_data.get('change', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                
                if not current_price or current_price <= 0:
                    continue
                
                # Fast signal calculation based on price movement and volume
                # Skip slow technical analysis and IV rank for speed
                confidence = 0.60  # Default moderate confidence
                signal_direction = 'neutral'
                reason = 'Active trading opportunity'
                
                # Boost confidence based on price movement
                if abs(change_percent) > 2:
                    confidence = 0.70
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Strong price movement ({change_percent:.2f}%)'
                elif abs(change_percent) > 1:
                    confidence = 0.65
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Moderate price movement ({change_percent:.2f}%)'
                
                # Boost confidence for high volume
                if volume and volume > 10000000:  # 10M+ volume
                    confidence = min(0.75, confidence + 0.05)
                    reason += ' with high volume'
                
                # Get insights (earnings, IV, unusual activity) - async would be better but keep simple for now
                insights = None
                try:
                    insights_service = OpportunityInsights()
                    insights = insights_service.get_symbol_insights(symbol, current_user.id)
                except Exception as e:
                    try:
                        current_app.logger.warning(f"Error getting insights for {symbol}: {e}")
                    except:
                        pass
                
                opportunity = {
                    'symbol': symbol,
                    'current_price': current_price,
                    'signal_direction': signal_direction,
                    'confidence': confidence,
                    'action': 'buy' if signal_direction == 'bullish' else 'sell' if signal_direction == 'bearish' else 'hold',
                    'reason': reason,
                    'iv_rank': 0,  # Not calculated for speed
                    'technical_indicators': {
                        'rsi': None,  # Not calculated for speed
                        'trend': signal_direction
                    },
                    'insights': insights,  # Add insights (earnings, IV context, unusual activity)
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                opportunities.append(opportunity)
                        
            except Exception as e:
                try:
                    current_app.logger.warning(f"Error scanning {symbol} for opportunities: {e}")
                except:
                    pass
                continue
        
        # Sort by confidence (highest first)
        opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        # Return top 5
        max_opportunities = 5
        return jsonify({
            'opportunities': opportunities[:max_opportunities],
            'count': len(opportunities[:max_opportunities]),
            'source': source
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
    """Quick scan of popular symbols - optimized for speed"""
    try:
        # Use same curated list as main opportunities endpoint
        popular_symbols = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL']
        
        opportunities = []
        from services.tradier_connector import TradierConnector
        tradier = TradierConnector()
        
        # Fast scan - just get quotes (same logic as /today endpoint)
        for symbol in popular_symbols:
            try:
                quote = tradier.get_quote(symbol)
                if 'quotes' not in quote or 'quote' not in quote['quotes']:
                    continue
                
                quote_data = quote['quotes']['quote']
                current_price = quote_data.get('last', 0)
                change = quote_data.get('change', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                
                if not current_price or current_price <= 0:
                    continue
                
                # Fast signal calculation
                confidence = 0.60
                signal_direction = 'neutral'
                reason = 'Quick scan opportunity'
                
                if abs(change_percent) > 2:
                    confidence = 0.70
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Strong movement ({change_percent:.2f}%)'
                elif abs(change_percent) > 1:
                    confidence = 0.65
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Moderate movement ({change_percent:.2f}%)'
                
                if volume and volume > 10000000:
                    confidence = min(0.75, confidence + 0.05)
                    reason += ' with high volume'
                
                # Get insights
                insights = None
                try:
                    insights_service = OpportunityInsights()
                    insights = insights_service.get_symbol_insights(symbol, current_user.id)
                except Exception as e:
                    try:
                        current_app.logger.warning(f"Error getting insights for {symbol}: {e}")
                    except:
                        pass
                
                opportunity = {
                    'symbol': symbol,
                    'current_price': current_price,
                    'price_change': change,
                    'signal_direction': signal_direction,
                    'confidence': confidence,
                    'action': 'buy' if signal_direction == 'bullish' else 'sell' if signal_direction == 'bearish' else 'hold',
                    'reason': reason,
                    'iv_rank': 0,
                    'technical_indicators': {
                        'rsi': None,
                        'trend': signal_direction
                    },
                    'insights': insights,  # Add insights
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                opportunities.append(opportunity)
                        
            except Exception as e:
                try:
                    current_app.logger.warning(f"Error scanning {symbol} in quick scan: {e}")
                except:
                    pass
                continue
        
        # Sort by confidence (highest first)
        opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        max_opportunities = 5
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
        include_insights = request.args.get('include_insights', 'false').lower() == 'true'
        
        current_app.logger.info(f"📈 Getting market movers (limit={limit}) for user {current_user.id}")
        
        movers_service = MarketMoversService()
        movers = movers_service.get_market_movers(limit=limit)
        
        # Optionally add insights (can be slow, so make it optional)
        if include_insights:
            try:
                insights_service = OpportunityInsights()
                for mover in movers:
                    symbol = mover.get('symbol')
                    if symbol:
                        try:
                            mover['insights'] = insights_service.get_symbol_insights(symbol, current_user.id)
                        except Exception as e:
                            try:
                                current_app.logger.warning(f"Error getting insights for {symbol}: {e}")
                            except:
                                pass
            except Exception as e:
                try:
                    current_app.logger.warning(f"Error adding insights to market movers: {e}")
                except:
                    pass
        
        current_app.logger.info(f"✅ Found {len(movers)} market movers")
        if movers:
            current_app.logger.info(f"   Top movers: {[m.get('symbol') for m in movers[:5]]}")
        else:
            current_app.logger.warning("⚠️ No market movers found - all symbols may have failed or none met criteria")
        
        return jsonify({
            'movers': movers,
            'count': len(movers)
        }), 200
        
    except Exception as e:
        import traceback
        try:
            current_app.logger.error(f"❌ Error getting market movers: {e}\n{traceback.format_exc()}", exc_info=True)
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

