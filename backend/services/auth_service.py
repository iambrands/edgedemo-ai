"""
JWT authentication service.
Handles registration, login, token refresh, password hashing.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.settings import settings
from backend.models.client import Client
from backend.models.household import Household
from backend.models.user import User, UserType

logger = logging.getLogger(__name__)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    subscription_tier: str


class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    type: str
    user_type: str


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt (72-byte limit)."""
        pw_bytes = password.encode("utf-8")[:72]
        return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        """Verify a password against a bcrypt hash."""
        try:
            pw_bytes = plain.encode("utf-8")[:72]
            return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
        except Exception as e:
            logger.warning("Password verification error: %s", e)
            return False

    @staticmethod
    def create_token(user_id: str, user_type: str, token_type: str = "access") -> str:
        if token_type == "access":
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        else:
            expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        payload = {"sub": str(user_id), "exp": expire, "type": token_type, "user_type": user_type}
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

    @staticmethod
    def decode_token(token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
            return TokenPayload(**payload)
        except JWTError as e:
            logger.warning("JWT decode failed: %s", e)
            raise ValueError("Invalid or expired token") from e

    async def register(self, req: RegisterRequest) -> User:
        """Register new B2C user. Creates User + Client + Household."""
        existing = await self.db.execute(select(User).where(User.email == req.email))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")

        household = Household(
            id=uuid.uuid4(),
            name=f"{req.first_name} {req.last_name} Household",
        )
        self.db.add(household)
        await self.db.flush()

        client = Client(
            id=uuid.uuid4(),
            household_id=household.id,
            first_name=req.first_name,
            last_name=req.last_name,
            email=req.email,
        )
        self.db.add(client)
        await self.db.flush()

        user = User(
            id=uuid.uuid4(),
            email=req.email,
            hashed_password=self.hash_password(req.password),
            user_type=UserType.B2C_RETAIL.value,
            subscription_tier="free",
            subscription_active=False,
            onboarding_completed=False,
            risk_profile_completed=False,
            features_enabled={},
            household_id=household.id,
            client_id=client.id,
        )
        self.db.add(user)
        await self.db.flush()

        logger.info("B2C user registered: %s (id=%s)", user.email, user.id)
        return user

    async def login(self, req: LoginRequest) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == req.email))
        user = result.scalar_one_or_none()

        if not user or not self.verify_password(req.password, user.hashed_password):
            raise ValueError("Invalid email or password")

        access_token = self.create_token(str(user.id), user.user_type or "b2c_retail", "access")
        refresh_token = self.create_token(str(user.id), user.user_type or "b2c_retail", "refresh")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=str(user.id),
            subscription_tier=user.subscription_tier or "free",
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = self.decode_token(refresh_token)
        if payload.type != "refresh":
            raise ValueError("Not a refresh token")

        result = await self.db.execute(select(User).where(User.id == uuid.UUID(payload.sub)))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        new_access = self.create_token(str(user.id), user.user_type or "b2c_retail", "access")
        new_refresh = self.create_token(str(user.id), user.user_type or "b2c_retail", "refresh")

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=str(user.id),
            subscription_tier=user.subscription_tier or "free",
        )
