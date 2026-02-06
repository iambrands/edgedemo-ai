"""
Client Portal JWT authentication service.
Handles client self-service login, separate from advisor auth.
"""

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.portal import ClientPortalUser

logger = logging.getLogger(__name__)

# Portal-specific JWT settings (separate from advisor JWT)
PORTAL_JWT_SECRET = os.getenv("PORTAL_JWT_SECRET", "portal-change-this-secret-in-production")
PORTAL_JWT_ALGORITHM = "HS256"
PORTAL_ACCESS_TOKEN_EXPIRE_HOURS = 24
PORTAL_REFRESH_TOKEN_EXPIRE_DAYS = 30


# ============================================================================
# SCHEMAS
# ============================================================================

class PortalLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PortalTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    client_id: str
    firm_id: Optional[str] = None


class PortalTokenPayload(BaseModel):
    sub: str  # portal_user_id
    client_id: str
    firm_id: Optional[str] = None
    type: str  # "portal_access" or "portal_refresh"
    exp: datetime


class PortalUserCreate(BaseModel):
    client_id: str
    email: EmailStr
    password: str
    firm_id: Optional[str] = None


# ============================================================================
# SERVICE
# ============================================================================

class PortalAuthService:
    """Authentication service for client portal users."""

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
            logger.warning("Portal password verification error: %s", e)
            return False

    @staticmethod
    def create_portal_token(
        portal_user_id: str,
        client_id: str,
        firm_id: Optional[str] = None,
        token_type: str = "portal_access"
    ) -> str:
        """Create a JWT token for portal user."""
        if token_type == "portal_access":
            expire = datetime.utcnow() + timedelta(hours=PORTAL_ACCESS_TOKEN_EXPIRE_HOURS)
        else:
            expire = datetime.utcnow() + timedelta(days=PORTAL_REFRESH_TOKEN_EXPIRE_DAYS)

        payload = {
            "sub": str(portal_user_id),
            "client_id": str(client_id),
            "firm_id": str(firm_id) if firm_id else None,
            "type": token_type,
            "exp": expire,
        }
        return jwt.encode(payload, PORTAL_JWT_SECRET, algorithm=PORTAL_JWT_ALGORITHM)

    @staticmethod
    def decode_portal_token(token: str) -> PortalTokenPayload:
        """Decode and validate a portal JWT token."""
        try:
            payload = jwt.decode(token, PORTAL_JWT_SECRET, algorithms=[PORTAL_JWT_ALGORITHM])
            if payload.get("type") not in ("portal_access", "portal_refresh"):
                raise ValueError("Invalid portal token type")
            return PortalTokenPayload(**payload)
        except JWTError as e:
            logger.warning("Portal JWT decode failed: %s", e)
            raise ValueError("Invalid or expired portal token") from e

    @staticmethod
    def verify_portal_token(token: str) -> Optional[dict]:
        """Verify portal token and return payload if valid."""
        try:
            payload = jwt.decode(token, PORTAL_JWT_SECRET, algorithms=[PORTAL_JWT_ALGORITHM])
            if payload.get("type") not in ("portal_access", "portal_refresh"):
                return None
            return payload
        except JWTError:
            return None

    async def authenticate(self, email: str, password: str) -> Optional[ClientPortalUser]:
        """Authenticate portal user by email and password."""
        result = await self.db.execute(
            select(ClientPortalUser).where(
                ClientPortalUser.email == email,
                ClientPortalUser.is_active == True
            )
        )
        user = result.scalar_one_or_none()

        if not user or not self.verify_password(password, user.hashed_password):
            return None

        # Update last login timestamp
        user.last_login = datetime.utcnow()
        await self.db.flush()

        return user

    async def login(self, req: PortalLoginRequest) -> PortalTokenResponse:
        """Login portal user and return tokens."""
        user = await self.authenticate(req.email, req.password)

        if not user:
            raise ValueError("Invalid email or password")

        access_token = self.create_portal_token(
            str(user.id),
            str(user.client_id),
            str(user.firm_id) if user.firm_id else None,
            "portal_access"
        )
        refresh_token = self.create_portal_token(
            str(user.id),
            str(user.client_id),
            str(user.firm_id) if user.firm_id else None,
            "portal_refresh"
        )

        return PortalTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=PORTAL_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            user_id=str(user.id),
            client_id=str(user.client_id),
            firm_id=str(user.firm_id) if user.firm_id else None,
        )

    async def refresh(self, refresh_token: str) -> PortalTokenResponse:
        """Refresh portal access token using refresh token."""
        payload = self.decode_portal_token(refresh_token)
        if payload.type != "portal_refresh":
            raise ValueError("Not a refresh token")

        user = await self.get_user_by_id(uuid.UUID(payload.sub))
        if not user:
            raise ValueError("Portal user not found")

        new_access = self.create_portal_token(
            str(user.id),
            str(user.client_id),
            str(user.firm_id) if user.firm_id else None,
            "portal_access"
        )
        new_refresh = self.create_portal_token(
            str(user.id),
            str(user.client_id),
            str(user.firm_id) if user.firm_id else None,
            "portal_refresh"
        )

        return PortalTokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=PORTAL_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            user_id=str(user.id),
            client_id=str(user.client_id),
            firm_id=str(user.firm_id) if user.firm_id else None,
        )

    async def create_portal_user(self, data: PortalUserCreate) -> ClientPortalUser:
        """Create a new portal user for a client."""
        # Check if email already exists
        existing = await self.db.execute(
            select(ClientPortalUser).where(ClientPortalUser.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered for portal")

        user = ClientPortalUser(
            id=uuid.uuid4(),
            client_id=uuid.UUID(data.client_id),
            email=data.email,
            hashed_password=self.hash_password(data.password),
            firm_id=uuid.UUID(data.firm_id) if data.firm_id else None,
        )
        self.db.add(user)
        await self.db.flush()

        logger.info("Portal user created: %s (client_id=%s)", user.email, user.client_id)
        return user

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[ClientPortalUser]:
        """Get portal user by ID."""
        result = await self.db.execute(
            select(ClientPortalUser).where(
                ClientPortalUser.id == user_id,
                ClientPortalUser.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> Optional[ClientPortalUser]:
        """Get portal user by email."""
        result = await self.db.execute(
            select(ClientPortalUser).where(
                ClientPortalUser.email == email,
                ClientPortalUser.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def reset_password(self, user_id: uuid.UUID, new_password: str) -> bool:
        """Reset portal user's password."""
        result = await self.db.execute(
            select(ClientPortalUser).where(ClientPortalUser.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            return False

        user.hashed_password = self.hash_password(new_password)
        await self.db.flush()

        logger.info("Portal user password reset: %s", user.email)
        return True

    async def update_email_preferences(
        self,
        user_id: uuid.UUID,
        email_narratives: Optional[bool] = None,
        email_nudges: Optional[bool] = None,
        email_documents: Optional[bool] = None,
    ) -> Optional[ClientPortalUser]:
        """Update portal user's email preferences."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        if email_narratives is not None:
            user.email_narratives = email_narratives
        if email_nudges is not None:
            user.email_nudges = email_nudges
        if email_documents is not None:
            user.email_documents = email_documents

        await self.db.flush()
        return user

    @staticmethod
    def generate_invite_token() -> str:
        """Generate a secure token for client self-registration invites."""
        return secrets.token_urlsafe(32)

    async def deactivate_user(self, user_id: uuid.UUID) -> bool:
        """Deactivate a portal user (soft delete)."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False

        user.is_active = False
        await self.db.flush()

        logger.info("Portal user deactivated: %s", user.email)
        return True
