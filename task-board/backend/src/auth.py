"""JWT authentication utilities: token creation/verification, user resolution.

Password hashing moved to password.py to break circular dependency with database.py.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import sqlite_utils

from src.config import settings
from src.database import get_db
from src.password import hash_password, verify_password

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _create_token(sub: str, token_type: str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT token with the given subject and type.

    Default expiration: 15 min for access tokens, 7 days for refresh tokens.
    """
    to_encode = {"sub": sub, "type": token_type}
    if token_type == "access":
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
    else:
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
    to_encode.update({"exp": expire, "jti": str(uuid4())})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(sub: str, expires_delta: timedelta | None = None) -> str:
    """Create a short-lived JWT access token (default 15 min)."""
    return _create_token(sub, "access", expires_delta)


def create_refresh_token(sub: str, expires_delta: timedelta | None = None) -> str:
    """Create a long-lived JWT refresh token (default 7 days)."""
    return _create_token(sub, "refresh", expires_delta)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token. Raises 401 on invalid/expired token."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: sqlite_utils.Database = Depends(get_db),
) -> dict:
    """FastAPI dependency that extracts the current user from a Bearer JWT token.

    Returns the user dict (id, username, hashed_password, created_at).
    Raises HTTP 401 if the token is invalid, expired, or the user no longer exists.
    """
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    username = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    users = list(
        db["users"].rows_where(
            where="username = :username", where_args={"username": username}
        )
    )
    if not users:
        raise HTTPException(status_code=401, detail="User not found")

    return dict(users[0])
