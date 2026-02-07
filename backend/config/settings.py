"""Application settings loaded from environment."""

import os


class Settings:
    """Application configuration from env."""

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE-ME-IN-PRODUCTION")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRICE_STARTER: str = os.getenv("STRIPE_PRICE_STARTER", "")
    STRIPE_PRICE_PRO: str = os.getenv("STRIPE_PRICE_PRO", "")
    STRIPE_PRICE_PREMIUM: str = os.getenv("STRIPE_PRICE_PREMIUM", "")

    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    DOMAIN: str = os.getenv("DOMAIN", "https://demo.edgeadvisors.ai")

    # Multi-Custodian Aggregation
    CUSTODIAN_ENCRYPTION_KEY: str = os.getenv("CUSTODIAN_ENCRYPTION_KEY", "")
    CUSTODIAN_ENCRYPTION_SALT: str = os.getenv(
        "CUSTODIAN_ENCRYPTION_SALT", "edgeai-custodian-salt"
    )
    SCHWAB_CLIENT_ID: str = os.getenv("SCHWAB_CLIENT_ID", "")
    SCHWAB_CLIENT_SECRET: str = os.getenv("SCHWAB_CLIENT_SECRET", "")
    FIDELITY_CLIENT_ID: str = os.getenv("FIDELITY_CLIENT_ID", "")
    FIDELITY_CLIENT_SECRET: str = os.getenv("FIDELITY_CLIENT_SECRET", "")


settings = Settings()
