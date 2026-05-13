"""Password hashing utilities using PBKDF2-SHA256.

Extracted from auth.py to break the circular dependency between auth and database
(which both previously needed hash_password, creating a cycle).
"""

from __future__ import annotations

import hashlib
import secrets


def _derive_key(password: str, salt: bytes, iterations: int = 600_000) -> bytes:
    """Derive a 32-byte key using PBKDF2-SHA256 (600,000 iterations per OWASP 2023)."""
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)


def hash_password(password: str) -> str:
    """Hash a plain-text password using PBKDF2-SHA256 with a random salt.

    Format: $pbkdf2-sha256$iterations$salt$hash
    This is a pure-Python approach that avoids bcrypt C-extension compatibility issues.
    """
    salt = secrets.token_hex(16)
    dk = _derive_key(password, salt.encode("utf-8"))
    return f"$pbkdf2-sha256$600000${salt}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plain-text password against its PBKDF2-SHA256 hash."""
    try:
        parts = hashed.split("$")
        if len(parts) != 5 or parts[0] != "" or parts[1] != "pbkdf2-sha256":
            return False
        iterations = int(parts[2])
        salt = parts[3]
        expected_hash = parts[4]
        dk = _derive_key(password, salt.encode("utf-8"), iterations)
        return dk.hex() == expected_hash
    except ValueError:
        return False
