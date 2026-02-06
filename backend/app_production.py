"""
EdgeAI FastAPI Application - Production Ready
This module provides a clean production entry point.
"""
import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root in path
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

# Import settings
try:
    from backend.config import settings
except ImportError:
    from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.environment == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
    logger.info(f"EdgeAI API starting in {settings.environment} mode...")
    
    # Initialize database tables if in production
    if settings.environment == "production":
        try:
            from backend.models import Base, get_engine
            engine = get_engine(settings.async_database_url)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables verified/created")
        except Exception as e:
            logger.warning(f"Database initialization skipped: {e}")
    
    yield
    
    # Shutdown
    logger.info("EdgeAI API shutting down...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    # Determine if we should show docs
    show_docs = settings.environment != "production" or settings.debug
    
    app = FastAPI(
        title="EdgeAI RIA Platform",
        description="AI-powered wealth management platform for RIAs",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if show_docs else None,
        redoc_url="/api/redoc" if show_docs else None,
    )
    
    # CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Import and mount routers
    try:
        from backend.api.auth import router as auth_router
        from backend.api.ria_dashboard import router as ria_dashboard_router
        from backend.api.ria_households import router as ria_households_router
        from backend.api.ria_accounts import router as ria_accounts_router
        from backend.api.ria_statements import router as ria_statements_router
        from backend.api.ria_analysis import router as ria_analysis_router
        from backend.api.ria_chat import router as ria_chat_router
        from backend.api.ria_compliance import router as ria_compliance_router
    except ImportError:
        from api.auth import router as auth_router
        from api.ria_dashboard import router as ria_dashboard_router
        from api.ria_households import router as ria_households_router
        from api.ria_accounts import router as ria_accounts_router
        from api.ria_statements import router as ria_statements_router
        from api.ria_analysis import router as ria_analysis_router
        from api.ria_chat import router as ria_chat_router
        from api.ria_compliance import router as ria_compliance_router
    
    # Mount routers
    app.include_router(auth_router)
    app.include_router(ria_dashboard_router)
    app.include_router(ria_households_router)
    app.include_router(ria_accounts_router)
    app.include_router(ria_statements_router)
    app.include_router(ria_analysis_router)
    app.include_router(ria_chat_router)
    app.include_router(ria_compliance_router)
    
    logger.info("All API routes mounted successfully")
    
    # Health check endpoint
    @app.get("/api/health")
    async def health_check():
        """Health check endpoint for Railway/load balancers."""
        return {
            "status": "healthy",
            "version": "1.0.0",
            "environment": settings.environment,
        }
    
    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint with API info."""
        return {
            "message": "EdgeAI RIA Platform API",
            "version": "1.0.0",
            "docs": "/api/docs" if show_docs else "Disabled in production",
        }
    
    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
