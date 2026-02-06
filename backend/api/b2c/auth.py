"""B2C authentication endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, get_current_user
from backend.models.user import User
from pydantic import BaseModel

from backend.services.auth_service import (
    AuthService,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/b2c", tags=["b2c-auth"])


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register new B2C user. Returns tokens (auto-login)."""
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    try:
        auth = AuthService(db)
        user = await auth.register(req)
        login_req = LoginRequest(email=req.email, password=req.password)
        return await auth.login(login_req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login and get JWT tokens."""
    try:
        auth = AuthService(db)
        return await auth.login(req)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    refresh_token = body.refresh_token
    if not refresh_token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    try:
        auth = AuthService(db)
        return await auth.refresh(refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
