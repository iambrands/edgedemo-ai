import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///iab_optionsbot.db'
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
    USE_MOCK_DATA = os.environ.get('USE_MOCK_DATA', 'true').lower() == 'true'
    USE_YAHOO_DATA = os.environ.get('USE_YAHOO_DATA', 'false').lower() == 'true'  # Yahoo Finance via yfinance
    USE_POLYGON_DATA = os.environ.get('USE_POLYGON_DATA', 'false').lower() == 'true'  # Polygon.io API
    POLYGON_API_KEY = os.environ.get('POLYGON_API_KEY', '')
    MARKET_HOURS_START = '09:30'
    MARKET_HOURS_END = '16:00'
    TIMEZONE = 'America/New_York'
    DISABLE_AUTH = os.environ.get('DISABLE_AUTH', 'false').lower() == 'true'  # For development/testing
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    USE_OPENAI_ALERTS = os.environ.get('USE_OPENAI_ALERTS', 'true').lower() == 'true'  # Enable AI-powered alerts
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:8001,http://localhost:4000,http://localhost:3000,http://127.0.0.1:8001,http://127.0.0.1:4000,http://127.0.0.1:3000').split(',')

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///iab_optionsbot.db'

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://user:pass@localhost/iab_optionsbot'

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

