from flask import Flask, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
import os

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name=None):
    """Application factory pattern"""
    # Set static folder for React build
    static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'build')
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Enable development mode if DISABLE_AUTH is set
    if app.config.get('DISABLE_AUTH', False):
        app.logger.warning('⚠️  AUTHENTICATION DISABLED - Development mode enabled')
    
    # Initialize extensions
    db.init_app(app)
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
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(options_bp, url_prefix='/api/options')
    app.register_blueprint(watchlist_bp, url_prefix='/api/watchlist')
    app.register_blueprint(trades_bp, url_prefix='/api/trades')
    app.register_blueprint(automations_bp, url_prefix='/api/automations')
    app.register_blueprint(risk_bp, url_prefix='/api/risk')
    app.register_blueprint(iv_bp, url_prefix='/api/iv')
    app.register_blueprint(automation_engine_bp, url_prefix='/api/automation_engine')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(performance_bp, url_prefix='/api/performance')
    app.register_blueprint(earnings_bp, url_prefix='/api/earnings')
    app.register_blueprint(options_flow_bp, url_prefix='/api/options-flow')
    app.register_blueprint(tax_bp, url_prefix='/api/tax')
    
    # Create database tables (only in development - use migrations in production)
    with app.app_context():
        # Only create tables if not in production and migrations don't exist
        if app.config.get('DEBUG', False) and not os.path.exists('migrations/versions'):
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
            from models.earnings import EarningsCalendar
            app.logger.info("Creating database tables (development mode)")
            db.create_all()
        else:
            app.logger.info("Using database migrations (production mode)")
    
    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'service': 'IAB OptionsBot'}, 200
    
    # Serve React app static files (for production deployment)
    # This must be registered AFTER all API blueprints
    # Static folder is already set in Flask app initialization above
    
    # Serve favicon and other root-level files
    @app.route('/favicon.ico')
    def serve_favicon():
        """Serve favicon"""
        if not os.path.exists(static_folder):
            return '', 404
        favicon_path = os.path.join(static_folder, 'favicon.ico')
        if os.path.exists(favicon_path):
            return send_from_directory(static_folder, 'favicon.ico')
        # Return empty 204 (No Content) if favicon doesn't exist to prevent 404 errors
        return '', 204
    
    # Catch-all route for React Router (must be last)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react_app(path):
        """Serve React app - catch-all for non-API routes"""
        if not os.path.exists(static_folder):
            return {'error': 'Frontend not built. Run: cd frontend && npm run build'}, 404
        
        # For API routes that weren't caught by blueprints, return 404
        if path.startswith('api/'):
            return {'error': 'API endpoint not found'}, 404
        
        # Don't handle static files here - they're handled by the route above
        if path.startswith('static/'):
            return {'error': 'Static file not found'}, 404
        
        # Serve index.html (React Router will handle client-side routing)
        return send_from_directory(static_folder, 'index.html')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)

