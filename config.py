import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Heroku provides DATABASE_URL in postgres:// format, convert to postgresql://
    database_url = os.environ.get('DATABASE_URL') or 'sqlite:///iab_optionsbot.db'
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url
    
    # Connection pool settings for PostgreSQL (helps with Railway connection issues)
    if database_url.startswith('postgresql://'):
        connect_args = {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30 second statement timeout
        }
        
        # Railway PostgreSQL connection settings
        # Test shows connection works with SSL, but let's make it flexible
        if 'interchange.proxy.rlwy.net' in database_url or 'railway' in database_url.lower():
            # Try 'prefer' first (will use SSL if available, but won't fail if not)
            # If that doesn't work, Railway will need 'require'
            connect_args['sslmode'] = 'prefer'
        
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_size': 5,
            'max_overflow': 10,
            'pool_timeout': 20,
            'pool_recycle': 3600,  # Recycle connections after 1 hour
            'pool_pre_ping': True,  # Verify connections before using
            'connect_args': connect_args
        }
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Tradier API Configuration
    TRADIER_API_KEY = os.environ.get('TRADIER_API_KEY') or ''
    TRADIER_API_SECRET = os.environ.get('TRADIER_API_SECRET') or ''
    TRADIER_ACCOUNT_ID = os.environ.get('TRADIER_ACCOUNT_ID') or ''
    TRADIER_BASE_URL = os.environ.get('TRADIER_BASE_URL', 'https://api.tradier.com/v1')
    TRADIER_SANDBOX = os.environ.get('TRADIER_SANDBOX', 'true').lower() == 'true'
    
    # Application Settings
    # Default to False - only use mock data if explicitly enabled or if Tradier API fails
    USE_MOCK_DATA = os.environ.get('USE_MOCK_DATA', 'false').lower() == 'true'
    # REMOVED: USE_YAHOO_DATA - Yahoo Finance causes performance issues and rate limiting
    # Force to False regardless of environment variable
    USE_YAHOO_DATA = False  # Yahoo Finance removed - use Tradier only
    USE_POLYGON_DATA = os.environ.get('USE_POLYGON_DATA', 'false').lower() == 'true'  # Polygon.io API
    POLYGON_API_KEY = os.environ.get('POLYGON_API_KEY', '')
    MARKET_HOURS_START = '09:30'
    MARKET_HOURS_END = '16:00'
    TIMEZONE = 'America/New_York'
    DISABLE_AUTH = os.environ.get('DISABLE_AUTH', 'false').lower() == 'true'  # For development/testing
    
    # AI API Configuration
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
    USE_OPENAI_ALERTS = os.environ.get('USE_OPENAI_ALERTS', 'true').lower() == 'true'  # Enable AI-powered alerts
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:6002,http://localhost:4000,http://localhost:3000,http://127.0.0.1:6002,http://127.0.0.1:4000,http://127.0.0.1:3000').split(',')
    
    # Email configuration (for feedback notifications)
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
    FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@iabadvisors.com')
    DEFAULT_FEEDBACK_EMAIL = os.environ.get('DEFAULT_FEEDBACK_EMAIL', 'leslie@iabadvisors.com')

class DevelopmentConfig(Config):
    DEBUG = True
    # Heroku provides DATABASE_URL in postgres:// format, convert to postgresql://
    database_url = os.environ.get('DATABASE_URL') or 'sqlite:///iab_optionsbot.db'
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url

class ProductionConfig(Config):
    DEBUG = False
    # Heroku provides DATABASE_URL in postgres:// format, convert to postgresql://
    database_url = os.environ.get('DATABASE_URL') or 'postgresql://user:pass@localhost/iab_optionsbot'
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    USE_MOCK_DATA = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

