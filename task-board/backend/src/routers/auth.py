"""Authentication API routes: register, login, refresh tokens."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
import sqlite_utils

from src.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.database import get_db
from src.schemas.users import (
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_user_by_username(
    db: sqlite_utils.Database, username: str
) -> list[dict]:
    """Look up a user by username. Returns an empty list if not found."""
    return list(
        db["users"].rows_where(
            where="username = :username", where_args={"username": username}
        )
    )


@router.post("/register", status_code=201)
def register(
    body: UserCreate,
    db: sqlite_utils.Database = Depends(get_db),
) -> UserResponse:
    """Register a new user account."""
    # Check if username already exists
    existing = _get_user_by_username(db, body.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "username": body.username,
        "hashed_password": hash_password(body.password),
        "created_at": now,
    }
    pk = db["users"].insert(row).last_pk
    return UserResponse(id=pk, username=body.username, created_at=now)


@router.post("/login")
def login(
    body: UserCreate,
    db: sqlite_utils.Database = Depends(get_db),
) -> TokenResponse:
    """Authenticate a user and return JWT token pair."""
    users = _get_user_by_username(db, body.username)
    if not users or not verify_password(body.password, users[0]["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(sub=body.username)
    refresh_token = create_refresh_token(sub=body.username)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh")
def refresh_token(
    body: RefreshRequest,
    db: sqlite_utils.Database = Depends(get_db),
) -> TokenResponse:
    """Issue a new token pair using a valid refresh token."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    username = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Verify user still exists
    users = _get_user_by_username(db, username)
    if not users:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(sub=username)
    new_refresh_token = create_refresh_token(sub=username)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )
