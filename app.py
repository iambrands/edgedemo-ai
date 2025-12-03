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
    # Don't set static_folder in Flask init - we'll handle React Router manually
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
            return {'error': 'API endpoint not found'}, 404
        
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

