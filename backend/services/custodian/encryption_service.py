"""
Encryption service for sensitive custodian credentials.
Uses Fernet symmetric encryption with key rotation support.
"""

import base64
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class EncryptionService:
    """Handles encryption/decryption of OAuth tokens and API credentials."""

    def __init__(self) -> None:
        self._fernet: Optional[MultiFernet] = None

    def _get_fernet(self) -> MultiFernet:
        """Lazily initialise Fernet so missing env vars don't crash at import."""
        if self._fernet is not None:
            return self._fernet

        primary_key = os.getenv("CUSTODIAN_ENCRYPTION_KEY", "")
        if not primary_key:
            # Fall back to general encryption key
            primary_key = os.getenv("ENCRYPTION_KEY", "")
        if not primary_key:
            raise ValueError(
                "CUSTODIAN_ENCRYPTION_KEY or ENCRYPTION_KEY must be set"
            )

        keys = [Fernet(self._derive_key(primary_key))]

        # Support key rotation
        rotated_raw = os.getenv("CUSTODIAN_ENCRYPTION_KEYS_ROTATED", "")
        if rotated_raw:
            for key in rotated_raw.split(","):
                stripped = key.strip()
                if stripped:
                    keys.append(Fernet(self._derive_key(stripped)))

        self._fernet = MultiFernet(keys)
        return self._fernet

    @staticmethod
    def _derive_key(password: str) -> bytes:
        salt = os.getenv("CUSTODIAN_ENCRYPTION_SALT", "edgeai-custodian-salt").encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a plaintext string. Returns empty string for empty input."""
        if not plaintext:
            return ""
        return self._get_fernet().encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a ciphertext string. Returns empty string for empty input."""
        if not ciphertext:
            return ""
        return self._get_fernet().decrypt(ciphertext.encode()).decode()


# Module-level singleton (lazy init)
encryption_service = EncryptionService()
