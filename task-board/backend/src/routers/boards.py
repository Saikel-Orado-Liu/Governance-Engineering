"""Board view API routes — returns tasks grouped by status columns."""

from __future__ import annotations

from fastapi import APIRouter, Depends
import sqlite_utils

from src.auth import get_current_user
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
    current_user: dict = Depends(get_current_user),
) -> list[BoardColumn]:
    """Get all tasks for the current user, grouped by status columns."""
    tasks = list(
        db["tasks"].rows_where(
            where="user_id = :user_id",
            where_args={"user_id": current_user["id"]},
            order_by="sort_order asc, id desc",
        )
    )

    columns: list[BoardColumn] = []
    for status in TaskStatus:
        column_tasks = [
            TaskResponse(**t) for t in tasks if t["status"] == status.value
        ]
        columns.append(
            BoardColumn(status=status, label=_LABELS[status], tasks=column_tasks)
        )

    return columns
