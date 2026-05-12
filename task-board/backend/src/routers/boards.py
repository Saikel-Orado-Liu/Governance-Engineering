"""Board view API routes — returns tasks grouped by status columns."""

from __future__ import annotations

from fastapi import APIRouter, Depends
import sqlite_utils

from src.database import get_db
from src.schemas.tasks import BoardColumn, TaskResponse, TaskStatus

router = APIRouter(prefix="/api/boards", tags=["boards"])

_LABELS = {
    TaskStatus.TODO: "To Do",
    TaskStatus.IN_PROGRESS: "In Progress",
    TaskStatus.DONE: "Done",
}


@router.get("")
def get_board(
    db: sqlite_utils.Database = Depends(get_db),
) -> list[BoardColumn]:
    """Get all tasks grouped by status columns (todo / in_progress / done)."""
    tasks = list(db["tasks"].rows_where(order_by="sort_order asc, id desc"))

    columns: list[BoardColumn] = []
    for status in TaskStatus:
        column_tasks = [
            TaskResponse(**t) for t in tasks if t["status"] == status.value
        ]
        columns.append(
            BoardColumn(status=status, label=_LABELS[status], tasks=column_tasks)
        )

    return columns
