"""Tests for authentication API endpoints (register, login, refresh)."""

import sqlite3

import pytest
import sqlite_utils
from fastapi.testclient import TestClient

from src.database import (
    get_db,
    _ensure_tasks_schema,
    _ensure_users_schema,
    _add_sort_order_column,
    _add_user_id_to_tasks,
    _seed_default_admin,
)
from src.main import app


def _override_db() -> sqlite_utils.Database:
    """Create a fresh in-memory database with users schema for testing."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    db = sqlite_utils.Database(conn)
    _ensure_tasks_schema(db)
    _ensure_users_schema(db)
    _add_sort_order_column(db)
    _add_user_id_to_tasks(db)
    _seed_default_admin(db)
    return db


@pytest.fixture
def client():
    """Yield a TestClient with an isolated in-memory database."""
    test_db = _override_db()

    def override_get_db():
        return test_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    test_db.close()


# ── POST /api/auth/register ───────────────────────────────────────────────


class TestRegister:
    def test_register_success(self, client):
        resp = client.post(
            "/api/auth/register",
            json={"username": "newuser", "password": "password123"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "newuser"
        assert "id" in data
        assert "created_at" in data
        assert "password" not in data

    def test_register_duplicate_username(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "testuser", "password": "password123"},
        )
        resp = client.post(
            "/api/auth/register",
            json={"username": "testuser", "password": "anotherpass"},
        )
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"]

    def test_register_missing_fields(self, client):
        resp = client.post("/api/auth/register", json={"username": "only"})
        assert resp.status_code == 422

        resp = client.post("/api/auth/register", json={"password": "only"})
        assert resp.status_code == 422

    def test_register_empty_username(self, client):
        resp = client.post(
            "/api/auth/register",
            json={"username": "", "password": "password123"},
        )
        assert resp.status_code == 422

    def test_register_empty_password(self, client):
        resp = client.post(
            "/api/auth/register",
            json={"username": "validuser", "password": ""},
        )
        assert resp.status_code == 422


# ── POST /api/auth/login ──────────────────────────────────────────────────


class TestLogin:
    def test_login_admin_success(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_new_user_success(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "newbie", "password": "testpass"},
        )
        resp = client.post(
            "/api/auth/login",
            json={"username": "newbie", "password": "testpass"},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "wrongpassword"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"username": "nobody", "password": "somepass"},
        )
        assert resp.status_code == 401


# ── POST /api/auth/refresh ────────────────────────────────────────────────


class TestRefresh:
    def test_refresh_success(self, client):
        # Login to get tokens
        login_resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_resp.status_code == 200
        refresh_token = login_resp.json()["refresh_token"]

        # Use refresh token to get new tokens
        resp = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        # Verify the new access token is valid (decodable with correct claims)
        # instead of strict inequality which can be flaky without jti
        from jose import jwt
        payload = jwt.decode(
            data["access_token"],
            "test-secret-key",
            algorithms=["HS256"],
            options={"verify_exp": False},
        )
        assert payload["sub"] == "admin"
        assert payload["type"] == "access"

    def test_refresh_with_access_token_fails(self, client):
        login_resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        access_token = login_resp.json()["access_token"]

        # Using an access token as refresh should fail
        resp = client.post(
            "/api/auth/refresh",
            json={"refresh_token": access_token},
        )
        assert resp.status_code == 401

    def test_refresh_invalid_token(self, client):
        resp = client.post(
            "/api/auth/refresh",
            json={"refresh_token": "totally-invalid-token"},
        )
        assert resp.status_code == 401


# ── Token expiry and edge cases ────────────────────────────────────────────


class TestTokenEdgeCases:
    def test_access_token_for_authenticated_request(self, client):
        """Valid access token should allow access to protected endpoints."""
        login_resp = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        token = login_resp.json()["access_token"]

        resp = client.get(
            "/api/tasks",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

    def test_no_token_returns_401(self, client):
        """Request without token to protected endpoint returns 401."""
        resp = client.get("/api/tasks")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, client):
        resp = client.get(
            "/api/tasks",
            headers={"Authorization": "Bearer invalidtokenhere"},
        )
        assert resp.status_code == 401

    def test_expired_token_returns_401(self, client):
        """Create a manually expired token."""
        from src.auth import create_access_token
        from datetime import timedelta

        expired_token = create_access_token(
            sub="admin",
            expires_delta=timedelta(seconds=-1),
        )
        resp = client.get(
            "/api/tasks",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401
