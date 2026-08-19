"""B2C premier demo account — auth helpers and user detection."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from backend.config.settings import settings
from backend.models.user import User
from backend.services.auth_service import AuthService, TokenResponse

DEMO_USER_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")
DEMO_EMAIL = "demo.client@firmum.ai"
DEMO_PASSWORD = "FirmumDemo2026!"
DEMO_FIRST_NAME = "Margaret"
DEMO_LAST_NAME = "Chen"


def is_demo_email(email: str | None) -> bool:
    return (email or "").strip().lower() == DEMO_EMAIL.lower()


def is_demo_user(user) -> bool:
    if user is None:
        return False
    uid = getattr(user, "id", None)
    if uid and str(uid) == str(DEMO_USER_ID):
        return True
    return is_demo_email(getattr(user, "email", None))


def is_demo_token_sub(sub: str | None) -> bool:
    return (sub or "") == str(DEMO_USER_ID)


def build_demo_user() -> User:
    """Synthetic User ORM object — not persisted."""
    user = User(
        id=DEMO_USER_ID,
        email=DEMO_EMAIL,
        hashed_password="",
        user_type="b2c_retail",
        subscription_tier="pro",
        subscription_active=True,
        onboarding_completed=True,
        risk_profile_completed=True,
        features_enabled={},
        household_id=uuid.UUID("00000000-0000-4000-8000-000000000002"),
        client_id=uuid.UUID("00000000-0000-4000-8000-000000000003"),
    )
    return user


def issue_demo_tokens() -> TokenResponse:
    access = AuthService.create_token(str(DEMO_USER_ID), "b2c_retail", "access")
    refresh = AuthService.create_token(str(DEMO_USER_ID), "b2c_retail", "refresh")
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=str(DEMO_USER_ID),
        subscription_tier="pro",
    )


def verify_demo_password(password: str) -> bool:
    return password == DEMO_PASSWORD
