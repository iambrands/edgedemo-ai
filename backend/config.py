"""
Configuration management for different environments.
Supports Railway, local development, and other deployment targets.
"""
import os
from typing import List
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    environment: str = "development"
    debug: bool = False
    
    # Database - Railway provides DATABASE_URL
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/edgeai"
    
    # Redis - Railway provides REDIS_URL
    redis_url: str = "redis://localhost:6379"
    
    # JWT Authentication
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440  # 24 hours
    
    # AI Services (optional - falls back to mock responses)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    
    # CORS - Railway frontend URL will be added dynamically
    cors_origins: str = "http://localhost:5173,http://localhost:5175,http://127.0.0.1:5173"
    
    # Railway-specific
    railway_frontend_url: str = ""
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        
        # Add Railway frontend URL if set
        if self.railway_frontend_url:
            origins.append(self.railway_frontend_url)
        
        # Add Railway wildcard domains for preview deployments
        origins.extend([
            "https://*.up.railway.app",
            "https://*.railway.app",
        ])
        
        return origins
    
    @property
    def async_database_url(self) -> str:
        """Ensure database URL uses asyncpg driver."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    
    class Config:
        env_file = ".env"
        extra = "ignore"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Singleton instance
settings = get_settings()
