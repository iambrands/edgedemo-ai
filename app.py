from flask import Flask
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
    app = Flask(__name__)
    
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
        # Only add headers if they're not already set by Flask-CORS
        if 'Access-Control-Allow-Origin' not in response.headers:
            # Use first origin as fallback (for development)
            default_origin = cors_origins[0] if cors_origins else 'http://localhost:4000'
            response.headers['Access-Control-Allow-Origin'] = default_origin
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
            response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS,PATCH'
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
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)

