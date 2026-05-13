"""Database initialization and dependency injection for Task Board API."""

import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import sqlite_utils
from fastapi import FastAPI

from src.password import hash_password

_db: sqlite_utils.Database | None = None


def get_db() -> sqlite_utils.Database:
    """FastAPI dependency that returns the global database instance."""
    if _db is None:
        msg = "Database not initialized. Ensure the lifespan has run."
        raise RuntimeError(msg)
    return _db


def _ensure_tasks_schema(db: sqlite_utils.Database) -> None:
    """Create the tasks table if it does not exist and enable WAL mode."""
    db.execute("PRAGMA journal_mode=WAL")
    db["tasks"].create(
        {
            "id": int,
            "title": str,
            "description": str,
            "status": str,
            "priority": str,
            "created_at": str,
            "updated_at": str,
        },
        pk="id",
        not_null=["title", "status", "priority", "created_at", "updated_at"],
        if_not_exists=True,
    )


def _add_sort_order_column(db: sqlite_utils.Database) -> None:
    """Add sort_order column to tasks table if it does not exist."""
    rows = list(db.query("PRAGMA table_info(tasks)"))
    has_sort_order = any(row["name"] == "sort_order" for row in rows)
    if not has_sort_order:
        db.execute("ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0")


def _ensure_users_schema(db: sqlite_utils.Database) -> None:
    """Create the users table if it does not exist."""
    db["users"].create(
        {
            "id": int,
            "username": str,
            "hashed_password": str,
            "created_at": str,
        },
        pk="id",
        not_null=["username", "hashed_password", "created_at"],
        if_not_exists=True,
    )
    # Enforce username uniqueness via a unique index
    try:
        db.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"
        )
    except sqlite3.OperationalError:
        pass


def _add_user_id_to_tasks(db: sqlite_utils.Database) -> None:
    """Add user_id column to tasks table with a default of 1 (admin user)."""
    rows = list(db.query("PRAGMA table_info(tasks)"))
    has_user_id = any(row["name"] == "user_id" for row in rows)
    if not has_user_id:
        db.execute("ALTER TABLE tasks ADD COLUMN user_id INTEGER DEFAULT 1")


def _seed_default_admin(db: sqlite_utils.Database) -> None:
    """Insert the default admin user (admin / admin123) if not already present."""
    existing = list(
        db["users"].rows_where(
            where="username = :username", where_args={"username": "admin"}
        )
    )
    if not existing:
        db["users"].insert(
            {
                "username": "admin",
                "hashed_password": hash_password("admin123"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan that initializes the database on startup and closes it on shutdown."""
    global _db
    conn = sqlite3.connect(os.getenv("TASKS_DB_PATH", "tasks.db"), check_same_thread=False)
    _db = sqlite_utils.Database(conn)
    _ensure_tasks_schema(_db)
    _add_sort_order_column(_db)
    _ensure_users_schema(_db)
    _add_user_id_to_tasks(_db)
    _seed_default_admin(_db)
    yield
    if _db is not None:
        _db.close()
