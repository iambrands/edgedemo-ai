from flask import Flask, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from config import config
from datetime import datetime
import os
import sys
import atexit
import logging

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

logger = logging.getLogger(__name__)

def check_tradier_client():
    """Verify Tradier client is properly initialized."""
    try:
        from services.tradier_connector import TradierConnector
        
        # Try to initialize the client
        try:
            tradier = TradierConnector()
        except Exception as e:
            logger.error(f"Failed to create Tradier client instance: {str(e)}")
            return False
        
        # Check if API key is set
        if not hasattr(tradier, 'api_key'):
            logger.error("Tradier client missing api_key attribute")
            return False
            
        if not tradier.api_key:
            logger.error("Tradier API key not set")
            return False
            
        logger.info("✅ Tradier client initialized successfully")
        return True
        
    except ImportError as e:
        logger.error(f"Failed to import Tradier client: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error checking Tradier client: {str(e)}")
        return False

def create_app(config_name=None):
    """Application factory pattern"""
    # Don't set static_folder in Flask init - we'll handle React Router manually
    app = Flask(__name__)
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Enable development mode if DISABLE_AUTH is set
    if app.config.get('DISABLE_AUTH', False):
        app.logger.warning('⚠️  AUTHENTICATION DISABLED - Development mode enabled')
    
    # Initialize extensions
    # Flask-SQLAlchemy 3.x supports SQLALCHEMY_ENGINE_OPTIONS in config
    # The engine options are automatically applied when the engine is created
    # DO NOT access db.engine here - it will trigger a connection attempt
    db.init_app(app)
    
    # Verify engine options are set (for debugging)
    if app.config.get('SQLALCHEMY_ENGINE_OPTIONS'):
        app.logger.info(f"Database engine options configured: {list(app.config['SQLALCHEMY_ENGINE_OPTIONS'].keys())}")
        if 'connect_args' in app.config['SQLALCHEMY_ENGINE_OPTIONS']:
            app.logger.info(f"Connection args: {app.config['SQLALCHEMY_ENGINE_OPTIONS']['connect_args']}")
    
    # Initialize Flask-Migrate (doesn't connect to DB during init)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # CORS configuration - configurable via environment variable
    cors_origins = app.config.get('CORS_ORIGINS', ['http://localhost:4000'])
    CORS(app, 
         resources={r"/api/*": {
             "origins": cors_origins,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }},
         supports_credentials=True)
    
    # Only add CORS headers manually if Flask-CORS didn't already set them
    @app.after_request
    def after_request(response):
        # Get the origin from the request
        origin = request.headers.get('Origin')
        
        # If origin is in allowed list, set it
        if origin and origin in cors_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        elif 'Access-Control-Allow-Origin' not in response.headers:
            # Fallback to first allowed origin
            default_origin = cors_origins[0] if cors_origins else 'http://localhost:4000'
            response.headers['Access-Control-Allow-Origin'] = default_origin
        
        # Ensure other CORS headers are set
        if 'Access-Control-Allow-Headers' not in response.headers:
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        if 'Access-Control-Allow-Methods' not in response.headers:
            response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS,PATCH'
        if 'Access-Control-Allow-Credentials' not in response.headers:
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        return response
    
    # Register blueprints
    from api.auth import auth_bp
    from api.options import options_bp
    from api.watchlist import watchlist_bp
    from api.trades import trades_bp
    from api.automations import automations_bp
    from api.risk import risk_bp
    from api.iv import iv_bp
    from api.automation_engine import automation_engine_bp
    from api.alerts import alerts_bp
    from api.performance import performance_bp
    from api.earnings import earnings_bp
    from api.options_flow import options_flow_bp
    from api.tax import tax_bp
    from api.feedback import feedback_bp
    from api.opportunities import opportunities_bp
    from api.account import account_bp
    from api.automation_diagnostics import automation_diagnostics_bp
    from api.opportunity_insights import opportunity_insights_bp
    from api.health import health_bp
    from api.admin import admin_bp
    from api.admin_status import admin_status_bp
    from api.spreads import spreads_bp
    from api.user import user_bp
    from api.tradier import tradier_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(options_bp, url_prefix='/api/options')
    app.register_blueprint(watchlist_bp, url_prefix='/api/watchlist')
    app.register_blueprint(trades_bp, url_prefix='/api/trades')
    app.register_blueprint(automations_bp, url_prefix='/api/automations')
    app.register_blueprint(risk_bp, url_prefix='/api/risk')
    app.register_blueprint(iv_bp, url_prefix='/api/iv')
    app.register_blueprint(automation_engine_bp, url_prefix='/api/automation_engine')
    app.register_blueprint(automation_diagnostics_bp, url_prefix='/api/automation_diagnostics')
    app.register_blueprint(opportunity_insights_bp, url_prefix='/api/opportunity_insights')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(performance_bp, url_prefix='/api/performance')
    app.register_blueprint(earnings_bp, url_prefix='/api/earnings')
    app.register_blueprint(options_flow_bp, url_prefix='/api/options-flow')
    app.register_blueprint(tax_bp, url_prefix='/api/tax')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(opportunities_bp, url_prefix='/api/opportunities')
    app.register_blueprint(account_bp, url_prefix='/api/account')
    app.register_blueprint(health_bp)  # No prefix - /health endpoints
    app.register_blueprint(spreads_bp, url_prefix='/api/spreads')
    app.register_blueprint(admin_bp, url_prefix='/api')  # /api/admin/* endpoints
    app.register_blueprint(admin_status_bp, url_prefix='/api')  # /api/admin/status endpoint
    app.register_blueprint(user_bp)  # /api/user/* endpoints
    app.register_blueprint(tradier_bp)  # /api/tradier/* endpoints
    
    # Log blueprint registration for debugging
    try:
        app.logger.info(f"✅ Registered blueprint: {admin_bp.name} at /api/admin/*")
        app.logger.info(f"✅ Registered blueprint: {admin_status_bp.name} at /api/admin/status")
        print(f"✅ Registered blueprint: {admin_bp.name} at /api/admin/*", file=sys.stderr, flush=True)
        print(f"✅ Registered blueprint: {admin_status_bp.name} at /api/admin/status", file=sys.stderr, flush=True)
    except Exception as e:
        app.logger.error(f"Error logging blueprint registration: {e}")
        print(f"⚠️ Error logging blueprint registration: {e}", file=sys.stderr, flush=True)
    
    # Debug route to list all registered routes
    @app.route('/debug/routes')
    def list_routes():
        """Debug: List all registered routes"""
        try:
            routes = []
            for rule in app.url_map.iter_rules():
                # Skip static routes
                if rule.endpoint == 'static':
                    continue
                try:
                    # Safely extract route info
                    rule_info = {
                        'endpoint': str(rule.endpoint),
                        'methods': [str(m) for m in rule.methods if m not in ['OPTIONS', 'HEAD']],
                        'path': str(rule)
                    }
                    routes.append(rule_info)
                except Exception as rule_error:
                    # Skip problematic routes
                    app.logger.warning(f"Error processing route {rule}: {rule_error}")
                    continue
            
            # Filter admin routes safely
            admin_routes = []
            for r in routes:
                try:
                    if 'admin' in str(r.get('path', '')).lower():
                        admin_routes.append(r)
                except:
                    continue
            
            return jsonify({
                'total_routes': len(routes),
                'admin_routes': admin_routes,
                'analyze_routes': [r for r in admin_routes if 'analyze' in str(r.get('path', '')).lower()],
                'message': 'Routes retrieved successfully'
            }), 200
        except Exception as e:
            app.logger.error(f"Error listing routes: {e}", exc_info=True)
            import traceback
            return jsonify({
                'error': str(e),
                'traceback': traceback.format_exc()
            }), 500
    
    # Start automatic position monitoring on app startup
    # This ensures positions are checked and closed when thresholds are hit
    def start_position_monitoring():
        """Start automatic position monitoring in background"""
        try:
            import threading
            import time
            from services.position_monitor import PositionMonitor
            
            def monitor_positions_loop():
                """Background loop to check positions every 5 minutes"""
                # Wait for app to fully initialize
                time.sleep(10)
                
                app.logger.info("🛡️ Starting automatic position monitoring (checks every 5 minutes)...")
                
                position_monitor = PositionMonitor()
                check_interval = 300  # 5 minutes
                
                while True:
                    try:
                        with app.app_context():
                            # Check all positions for exit conditions
                            results = position_monitor.monitor_all_positions()
                            
                            if results['exits_triggered'] > 0:
                                app.logger.info(f"✅ Auto-closed {results['exits_triggered']} position(s) based on exit conditions")
                            
                            if results['errors']:
                                app.logger.warning(f"⚠️ Position monitoring errors: {results['errors']}")
                            
                            # Log status every hour
                            if results['monitored'] > 0:
                                app.logger.debug(f"Monitored {results['monitored']} positions")
                            
                    except Exception as e:
                        app.logger.error(f"Error in position monitoring loop: {e}", exc_info=True)
                    
                    # Wait before next check
                    time.sleep(check_interval)
            
            # Start monitoring in background thread
            monitor_thread = threading.Thread(target=monitor_positions_loop, daemon=True)
            monitor_thread.start()
            app.logger.info("✅ Automatic position monitoring started")
            
        except Exception as e:
            app.logger.error(f"Error starting position monitoring: {e}", exc_info=True)
    
    # Initialize APScheduler for background price updates
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.start()
    
    def update_position_prices():
        """Scheduled task to update position prices in background"""
        try:
            with app.app_context():
                from services.position_monitor import PositionMonitor
                from models.position import Position
                
                db = app.extensions['sqlalchemy']
                positions = db.session.query(Position).filter_by(status='open').all()
                
                if not positions:
                    return
                
                app.logger.info(f"💰 Scheduled price update: Processing {len(positions)} positions")
                
                monitor = PositionMonitor()
                updated_count = 0
                
                failed_count = 0
                expired_count = 0
                
                for position in positions:
                    try:
                        # Check if option has expired
                        if position.expiration_date:
                            exp_date = position.expiration_date
                            today = datetime.utcnow().date()
                            
                            if exp_date < today:
                                # Close expired position
                                app.logger.info(
                                    f"⏰ Closing expired position: {position.symbol} "
                                    f"(expired {position.expiration_date})"
                                )
                                try:
                                    position.status = 'closed'
                                    position.exit_price = 0.0
                                    position.exit_date = datetime.utcnow()
                                    position.unrealized_pnl = -position.entry_price * position.quantity * 100
                                    position.unrealized_pnl_percent = -100.0
                                    expired_count += 1
                                    continue
                                except Exception as e:
                                    app.logger.error(f"Error closing expired position {position.id}: {e}")
                                    failed_count += 1
                                    continue
                        
                        old_price = position.current_price
                        old_updated = position.last_updated
                        monitor.update_position_data(position, force_update=False)
                        db.session.refresh(position)
                        new_price = position.current_price
                        new_updated = position.last_updated  # Get updated timestamp
                        
                        # Validate price was actually updated
                        if new_price and new_price > 0:
                            if old_price != new_price:
                                updated_count += 1
                                app.logger.debug(
                                    f"   Position {position.id} ({position.symbol}): "
                                    f"${old_price:.2f} → ${new_price:.2f}"
                                )
                            elif new_updated and old_updated and new_updated > old_updated:
                                # Price unchanged but timestamp updated - still counts as success
                                updated_count += 1
                                app.logger.debug(
                                    f"   Position {position.id} ({position.symbol}): "
                                    f"Price unchanged (${new_price:.2f}) but timestamp updated"
                                )
                            else:
                                # Price unchanged and timestamp not updated - might be an issue
                                app.logger.warning(
                                    f"⚠️ Position {position.id} ({position.symbol}): "
                                    f"Price update did not change timestamp (old: {old_updated}, new: {new_updated})"
                                )
                                updated_count += 1  # Still count as attempt
                        else:
                            # Price update failed - no valid price returned
                            failed_count += 1
                            app.logger.warning(
                                f"⚠️ Position {position.id} ({position.symbol}): "
                                f"Price update returned invalid price: {new_price}"
                            )
                            
                    except Exception as e:
                        app.logger.error(
                            f"❌ Failed to update position {position.id} ({position.symbol}): {e}",
                            exc_info=True
                        )
                        db.session.rollback()
                        failed_count += 1
                        continue
                
                # Commit all changes
                try:
                    db.session.commit()
                except Exception as e:
                    app.logger.error(f"Error committing position updates: {e}", exc_info=True)
                    db.session.rollback()
                
                # Log results
                total = len(positions)
                success_count = updated_count + expired_count
                app.logger.info(
                    f"✅ Updated {success_count}/{total} positions "
                    f"(updated: {updated_count}, expired: {expired_count}, failed: {failed_count})"
                )
                
        except Exception as e:
            app.logger.error(f"Error in scheduled price update task: {e}", exc_info=True)
    
    # Schedule price updates every 2 minutes
    # This runs in the background and doesn't affect the frontend UI
    scheduler.add_job(
        func=update_position_prices,
        trigger=IntervalTrigger(minutes=2),
        id='update_position_prices',
        name='Update position prices',
        replace_existing=True
    )
    app.logger.info("✅ Scheduled price update task started (runs every 2 minutes)")
    
    # Schedule expired position cleanup daily at 4:05 PM ET (after market close)
    def cleanup_expired_positions_job():
        """Scheduled task to cleanup expired positions"""
        try:
            with app.app_context():
                from services.cleanup_service import cleanup_expired_positions, get_expiring_today
                
                app.logger.info("🧹 Starting scheduled expired position cleanup...")
                count = cleanup_expired_positions()
                app.logger.info(f"✅ Cleanup complete: {count} positions closed")
                
                # Also check for positions expiring today
                expiring = get_expiring_today()
                if expiring:
                    app.logger.warning(
                        f"⚠️⚠️⚠️ {len(expiring)} POSITIONS EXPIRE TODAY - MANUAL REVIEW RECOMMENDED"
                    )
        except Exception as e:
            app.logger.error(f"Error in expired position cleanup: {e}", exc_info=True)
    
    scheduler.add_job(
        func=cleanup_expired_positions_job,
        trigger=CronTrigger(hour=16, minute=5, timezone='America/New_York'),
        id='cleanup_expired_positions',
        name='Cleanup expired positions',
        replace_existing=True
    )
    app.logger.info("✅ Scheduled expired position cleanup (daily at 4:05 PM ET)")
    
    # Schedule cache cleanup for expired options contracts daily at midnight
    def cleanup_expired_cache_job():
        """Scheduled task to clear expired cache entries"""
        try:
            with app.app_context():
                from utils.redis_cache import get_redis_cache
                
                cache = get_redis_cache()
                if cache.use_redis and cache.redis_client:
                    app.logger.info("🧹 Starting scheduled cache cleanup...")
                    cleared = 0
                    try:
                        # Clear expired options chain cache entries
                        pattern = "cache:options_chain:*:*"
                        for key in cache.redis_client.scan_iter(match=pattern, count=100):
                            # Parse expiration from key: "cache:options_chain:AAPL:2026-01-23"
                            parts = key.split(':')
                            if len(parts) >= 4:
                                try:
                                    exp_date = datetime.strptime(parts[3], '%Y-%m-%d').date()
                                    if exp_date < datetime.utcnow().date():
                                        cache.redis_client.delete(key)
                                        cleared += 1
                                except ValueError:
                                    continue
                        
                        if cleared > 0:
                            app.logger.info(f"🧹 Cleared {cleared} expired cache entries")
                        else:
                            app.logger.debug("✅ No expired cache entries to clear")
                    except Exception as e:
                        app.logger.error(f"Error clearing expired cache: {e}", exc_info=True)
        except Exception as e:
            app.logger.error(f"Error in cache cleanup job: {e}", exc_info=True)
    
    scheduler.add_job(
        func=cleanup_expired_cache_job,
        trigger=CronTrigger(hour=0, minute=0, timezone='America/New_York'),
        id='cleanup_expired_cache',
        name='Cleanup expired cache',
        replace_existing=True
    )
    app.logger.info("✅ Scheduled cache cleanup (daily at midnight ET)")
    
    # Schedule precompute service for popular symbols (every 5 minutes during market hours)
    def precompute_popular_symbols_job():
        """Scheduled task to pre-compute analysis for popular symbols"""
        try:
            with app.app_context():
                from services.precompute_service import PrecomputeService
                
                service = PrecomputeService()
                service.precompute_popular_symbols()
        except Exception as e:
            app.logger.error(f"Error in precompute job: {e}", exc_info=True)
    
    scheduler.add_job(
        func=precompute_popular_symbols_job,
        trigger=IntervalTrigger(minutes=5),
        id='precompute_popular_symbols',
        name='Precompute popular symbols',
        replace_existing=True
    )
    app.logger.info("✅ Scheduled precompute service (every 5 minutes during market hours)")
    
    # PHASE 5: Cache warming on startup and periodically
    def warm_cache_on_startup():
        """
        Warm cache on application startup to avoid cold start delays.
        Uses the new CacheWarmer service for comprehensive warming.
        """
        try:
            with app.app_context():
                from services.cache_warmer import CacheWarmer
                
                warmer = CacheWarmer()
                results = warmer.warm_all()
                
                app.logger.info(
                    f"✅ Cache warming complete: "
                    f"{results['quotes']} quotes, {results['chains']} chains, "
                    f"{results['expirations']} expirations in {results['duration_seconds']}s"
                )
        except Exception as e:
            app.logger.error(f"❌ Cache warming failed: {e}", exc_info=True)
            # Don't crash app if warming fails
    
    # Run cache warming in background thread (don't block startup)
    import threading
    def delayed_cache_warm():
        import time
        time.sleep(10)  # Wait 10 seconds for app to fully initialize
        warm_cache_on_startup()
    
    threading.Thread(target=delayed_cache_warm, daemon=True).start()
    
    # Schedule periodic cache warming during market hours (every 5 minutes)
    def periodic_cache_warm():
        """Warm cache periodically during market hours."""
        try:
            with app.app_context():
                from services.cache_warmer import CacheWarmer
                from datetime import datetime
                import pytz
                
                # Only warm during market hours
                now = datetime.now(pytz.timezone('US/Eastern'))
                is_market_hours = (
                    now.weekday() < 5 and  # Monday-Friday
                    9 <= now.hour < 16
                )
                
                if is_market_hours:
                    warmer = CacheWarmer()
                    # Only warm quotes (fast) during periodic runs
                    warmer.warm_quotes()
        except Exception as e:
            app.logger.error(f"Periodic cache warming failed: {e}", exc_info=True)
    
    scheduler.add_job(
        func=periodic_cache_warm,
        trigger=IntervalTrigger(minutes=5),
        id='periodic_cache_warm',
        name='Periodic cache warming',
        replace_existing=True
    )
    app.logger.info("✅ Scheduled periodic cache warming (every 5 minutes during market hours)")
    
    # Shut down scheduler when app exits
    atexit.register(lambda: scheduler.shutdown())
    
    # Start position monitoring automatically when app is created
    # Use a delayed start to ensure app is fully initialized
    import threading
    def delayed_start():
        import time
        time.sleep(3)  # Wait 3 seconds for app to initialize
        start_position_monitoring()
    
    threading.Thread(target=delayed_start, daemon=True).start()
    
    # Also start the full automation engine if enabled
    # This handles both position monitoring AND new opportunity scanning
    auto_start_engine = os.environ.get('AUTO_START_ENGINE', 'true').lower() == 'true'
    if auto_start_engine:
        def start_full_engine():
            import time
            from services.master_controller import AutomationMasterController
            time.sleep(15)  # Wait longer for full engine (after position monitoring starts)
            try:
                with app.app_context():
                    controller = AutomationMasterController()
                    if not controller.is_running:
                        app.logger.info("🚀 Starting full automation engine...")
                        controller.start()
            except Exception as e:
                app.logger.error(f"Failed to start automation engine: {e}", exc_info=True)
        
        threading.Thread(target=start_full_engine, daemon=True).start()
    
    # Import all models to ensure they're registered with SQLAlchemy
    # This must happen before any database operations
    from models import User, Stock, Position, Automation, Trade, AlertFilters
    from models.user import User
    from models.stock import Stock
    from models.position import Position
    from models.automation import Automation
    from models.trade import Trade
    from models.risk_limits import RiskLimits
    from models.audit_log import AuditLog
    from models.error_log import ErrorLog
    from models.iv_history import IVHistory
    from models.strategy import Strategy, StrategyLeg
    from models.alert import Alert
    from models.alert_filters import AlertFilters
    from models.earnings import EarningsCalendar
    from models.feedback import Feedback
    
    # Verify AI API configuration (non-blocking)
    anthropic_key = os.environ.get('ANTHROPIC_API_KEY', '')
    app.logger.info("=" * 50)
    app.logger.info("AI API Configuration:")
    app.logger.info(f"  Anthropic API Key: {'✅ Set' if anthropic_key else '❌ Not set (AI features disabled)'}")
    
    try:
        import anthropic
        app.logger.info("  Anthropic package: ✅ Installed")
    except ImportError:
        app.logger.warning("  Anthropic package: ❌ Not installed")
    
    app.logger.info("=" * 50)
    
    # Run database migrations on startup (fallback if Procfile migration didn't run)
    def run_migrations_on_startup():
        """Run database migrations on app startup"""
        try:
            app.logger.info("📊 Running database migrations on startup...")
            from flask_migrate import upgrade
            
            with app.app_context():
                upgrade()
                app.logger.info("✅ Database migrations completed successfully")
        except Exception as e:
            app.logger.error(f"❌ Database migration failed: {e}")
            app.logger.error("App will continue, but database may be out of date")
            # Don't crash the app, but log the error
    
    # Run migrations in a thread to avoid blocking startup
    import threading
    migration_thread = threading.Thread(target=run_migrations_on_startup, daemon=True)
    migration_thread.start()
    
    # Database tables are created via migrations
    # This ensures migrations run even if Procfile command didn't execute
    app.logger.info("✅ Application initialized. Database migrations running in background.")
    
    # Verify Tradier client on startup
    with app.app_context():
        if not check_tradier_client():
            app.logger.warning("⚠️ Tradier client not available - options trading disabled")
        else:
            app.logger.info("✅ Tradier client verified successfully")
    
    # Health check endpoint
    @app.route('/health')
    def health():
        """Health check endpoint - checks app and database status"""
        from flask import current_app
        status = {
            'status': 'healthy',
            'service': 'IAB OptionsBot',
            'database': 'unknown',
            'database_url_set': bool(current_app.config.get('SQLALCHEMY_DATABASE_URI', '').startswith('postgresql://'))
        }
        
        # Try to check database connection
        try:
            db = current_app.extensions.get('sqlalchemy')
            if db:
                # Try a simple query
                db.session.execute(db.text('SELECT 1'))
                status['database'] = 'connected'
            else:
                status['database'] = 'not_initialized'
        except Exception as e:
            error_msg = str(e)
            status['database'] = f'error: {error_msg[:200]}'
            status['status'] = 'degraded'
            # Log the full error for debugging
            current_app.logger.error(f"Database health check failed: {error_msg}")
            import traceback
            current_app.logger.error(traceback.format_exc())
        
        status_code = 200 if status['database'] == 'connected' else 503
        return status, status_code
    
    # Database diagnostic endpoint (for debugging)
    from api.debug import debug_bp
    app.register_blueprint(debug_bp, url_prefix='/api')
    
    # Debug: List all registered routes
    @app.route('/debug/routes')
    def debug_routes():
        """Debug endpoint to see all registered routes"""
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'rule': str(rule)
            })
        return {'routes': routes}, 200
    
    # Define static folder path
    static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'build')
    
    # Debug: Log static folder info at startup
    app.logger.info(f'Static folder path: {static_folder}')
    app.logger.info(f'Static folder exists: {os.path.exists(static_folder)}')
    if os.path.exists(static_folder):
        app.logger.info(f'Static folder contents: {os.listdir(static_folder)}')
        static_path = os.path.join(static_folder, 'static')
        if os.path.exists(static_path):
            app.logger.info(f'Static path exists: {static_path}')
            app.logger.info(f'Static path contents: {os.listdir(static_path)}')
            # List actual files in js and css
            js_path = os.path.join(static_path, 'js')
            css_path = os.path.join(static_path, 'css')
            if os.path.exists(js_path):
                app.logger.info(f'JS files: {os.listdir(js_path)}')
            if os.path.exists(css_path):
                app.logger.info(f'CSS files: {os.listdir(css_path)}')
    
    # Serve static files (CSS, JS, images, etc.) from /static/ path
    # IMPORTANT: This MUST be registered BEFORE the catch-all route
    # Use explicit route patterns to ensure they match before catch-all
    @app.route('/static/js/<path:filename>')
    def serve_static_js(filename):
        """Serve JS files from the React build directory"""
        static_path = os.path.join(static_folder, 'static', 'js')
        app.logger.info(f'=== STATIC JS FILE REQUEST ===')
        app.logger.info(f'Requested filename: {filename}')
        app.logger.info(f'Static path: {static_path}')
        if not os.path.exists(static_path):
            app.logger.error(f'JS path not found: {static_path}')
            return {'error': 'JS directory not found'}, 404
        file_path = os.path.join(static_path, filename)
        app.logger.info(f'Full file path: {file_path}')
        app.logger.info(f'File exists: {os.path.exists(file_path)}')
        if not os.path.exists(file_path):
            app.logger.error(f'File not found: {file_path}')
            app.logger.error(f'Directory contents: {os.listdir(static_path)}')
            return {'error': f'File not found: {filename}'}, 404
        try:
            return send_from_directory(static_path, filename)
        except Exception as e:
            app.logger.error(f'Error serving JS file {filename}: {str(e)}')
            return {'error': f'Error serving file: {str(e)}'}, 500
    
    @app.route('/static/css/<path:filename>')
    def serve_static_css(filename):
        """Serve CSS files from the React build directory"""
        static_path = os.path.join(static_folder, 'static', 'css')
        app.logger.info(f'=== STATIC CSS FILE REQUEST ===')
        app.logger.info(f'Requested filename: {filename}')
        app.logger.info(f'Static path: {static_path}')
        if not os.path.exists(static_path):
            app.logger.error(f'CSS path not found: {static_path}')
            return {'error': 'CSS directory not found'}, 404
        file_path = os.path.join(static_path, filename)
        app.logger.info(f'Full file path: {file_path}')
        app.logger.info(f'File exists: {os.path.exists(file_path)}')
        if not os.path.exists(file_path):
            app.logger.error(f'File not found: {file_path}')
            app.logger.error(f'Directory contents: {os.listdir(static_path)}')
            return {'error': f'File not found: {filename}'}, 404
        try:
            return send_from_directory(static_path, filename)
        except Exception as e:
            app.logger.error(f'Error serving CSS file {filename}: {str(e)}')
            return {'error': f'Error serving file: {str(e)}'}, 500
    
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        """Serve other static files from the React build directory"""
        static_path = os.path.join(static_folder, 'static')
        app.logger.info(f'=== STATIC FILE REQUEST ===')
        app.logger.info(f'Requested filename: {filename}')
        app.logger.info(f'Static path: {static_path}')
        app.logger.info(f'Static path exists: {os.path.exists(static_path)}')
        
        if not os.path.exists(static_path):
            app.logger.error(f'Static path not found: {static_path}')
            return {'error': 'Frontend not built'}, 404
        
        # List contents of js and css directories for debugging
        js_dir = os.path.join(static_path, 'js')
        css_dir = os.path.join(static_path, 'css')
        if os.path.exists(js_dir):
            app.logger.info(f'JS directory contents: {os.listdir(js_dir)}')
        if os.path.exists(css_dir):
            app.logger.info(f'CSS directory contents: {os.listdir(css_dir)}')
        
        file_path = os.path.join(static_path, filename)
        app.logger.info(f'Full file path: {file_path}')
        app.logger.info(f'File exists: {os.path.exists(file_path)}')
        
        if not os.path.exists(file_path):
            app.logger.error(f'File not found: {file_path}')
            # Try to find similar files
            dir_path = os.path.dirname(file_path)
            if os.path.exists(dir_path):
                app.logger.error(f'Directory exists, contents: {os.listdir(dir_path)}')
            return {'error': f'File not found: {filename}'}, 404
        
        try:
            app.logger.info(f'Serving file: {file_path}')
            return send_from_directory(static_path, filename)
        except Exception as e:
            app.logger.error(f'Error serving static file {filename}: {str(e)}')
            import traceback
            app.logger.error(traceback.format_exc())
            return {'error': f'Error serving file: {str(e)}'}, 500
    
    # Serve favicon
    @app.route('/favicon.ico')
    def serve_favicon():
        """Serve favicon"""
        favicon_path = os.path.join(static_folder, 'favicon.ico')
        if os.path.exists(favicon_path):
            return send_from_directory(static_folder, 'favicon.ico')
        return '', 204
    
    # Catch-all route for React Router (MUST be last - after all other routes)
    # This will NOT match /static/ because the route above is more specific
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react_app(path):
        """Serve React app - catch-all for non-API routes"""
        # For API routes that weren't caught by blueprints, return 404
        if path.startswith('api/'):
            app.logger.error(f'⚠️ API route reached catch-all (not matched by blueprints): {path}')
            app.logger.error(f'Request method: {request.method}')
            app.logger.error(f'Request URL: {request.url}')
            # Log all registered routes for debugging
            app.logger.error('Registered API routes:')
            for rule in app.url_map.iter_rules():
                if 'api' in str(rule):
                    app.logger.error(f'  {rule.rule} -> {rule.endpoint} [{", ".join(rule.methods)}]')
            return {'error': f'API endpoint not found: {path}'}, 404
        
        # Static files should be handled by the route above
        # If we reach here, log it for debugging
        if path.startswith('static/'):
            app.logger.error(f'⚠️ Static file request reached catch-all route! Path: {path}')
            app.logger.error(f'This should not happen - static routes should match first')
            # Don't return 404 here - let it fall through to see what happens
            # Actually, return 404 but with more info
            return {'error': f'Static file route not matching. Path: {path}'}, 404
        
        # Serve index.html for all other routes (React Router handles client-side routing)
        if not os.path.exists(static_folder):
            return {'error': 'Frontend not built. Run: cd frontend && npm run build'}, 404
        
        index_path = os.path.join(static_folder, 'index.html')
        if not os.path.exists(index_path):
            return {'error': 'index.html not found'}, 404
        
        return send_from_directory(static_folder, 'index.html')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)

