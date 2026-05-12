"""Database initialization and dependency injection for Task Board API."""

import os
import sqlite3
from contextlib import asynccontextmanager

import sqlite_utils
from fastapi import FastAPI

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan that initializes the database on startup and closes it on shutdown."""
    global _db
    conn = sqlite3.connect(os.getenv("TASKS_DB_PATH", "tasks.db"), check_same_thread=False)
    _db = sqlite_utils.Database(conn)
    _ensure_tasks_schema(_db)
    _add_sort_order_column(_db)
    yield
    if _db is not None:
        _db.close()
