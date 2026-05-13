"""Task CRUD API routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlite_utils.db import NotFoundError
import sqlite_utils

from src.auth import get_current_user
from src.database import get_db
from src.schemas.tasks import (
    TaskCreate,
    TaskMove,
    TaskReorder,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
    TaskStatus,
    TaskPriority,
)


def get_task_or_404(table, task_id: int) -> dict:
    """Get a task by ID or raise HTTP 404 if not found."""
    try:
        return table.get(task_id)
    except NotFoundError:
        raise HTTPException(status_code=404)


def _verify_ownership(task_dict: dict, user_id: int) -> None:
    """Raise HTTP 404 if the task does not belong to the current user."""
    if task_dict.get("user_id") != user_id:
        raise HTTPException(status_code=404)


router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    response: Response = None,
) -> list[TaskResponse]:
    """List tasks belonging to the current user, optionally filtered with pagination."""
    where_clauses: list[str] = ["user_id = :user_id"]
    where_args: dict[str, str | int] = {"user_id": current_user["id"]}

    if status is not None:
        where_clauses.append("status = :status")
        where_args["status"] = status.value
    if priority is not None:
        where_clauses.append("priority = :priority")
        where_args["priority"] = priority.value

    where = " AND ".join(where_clauses) if where_clauses else None
    args = where_args if where_args else None

    # Get total count (without pagination)
    total = db["tasks"].count_where(where=where, where_args=args)

    # Get paginated results
    tasks = list(
        db["tasks"].rows_where(
            where=where,
            where_args=args,
            order_by="created_at desc",
            offset=offset,
            limit=limit,
        )
    )

    response.headers["X-Total-Count"] = str(total)
    return [TaskResponse(**t) for t in tasks]


@router.get("/{task_id}")
def get_task(
    task_id: int,
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TaskResponse:
    """Get a single task by its ID (must belong to current user)."""
    task_dict = get_task_or_404(db["tasks"], task_id)
    _verify_ownership(task_dict, current_user["id"])
    return TaskResponse(**task_dict)


@router.post("", status_code=201)
def create_task(
    task: TaskCreate,
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TaskResponse:
    """Create a new task belonging to the current user."""
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "title": task.title,
        "description": task.description,
        "status": task.status.value,
        "priority": task.priority.value,
        "user_id": current_user["id"],
        "created_at": now,
        "updated_at": now,
    }
    table = db["tasks"]
    table.insert(record)
    return get_task_or_404(table, table.last_pk)


@router.patch("/{task_id}")
def update_task(
    task_id: int,
    task: TaskUpdate,
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TaskResponse:
    """Update an existing task (must belong to current user)."""
    table = db["tasks"]
    task_dict = get_task_or_404(table, task_id)
    _verify_ownership(task_dict, current_user["id"])

    updates: dict[str, str | int] = {}
    if task.title is not None:
        updates["title"] = task.title
    if task.description is not None:
        updates["description"] = task.description
    if task.status is not None:
        updates["status"] = task.status.value
    if task.priority is not None:
        updates["priority"] = task.priority.value

    if not updates:
        return TaskResponse(**task_dict)

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    table.update(task_id, updates)
    task_dict.update(updates)
    return TaskResponse(**task_dict)


@router.patch("/{task_id}/status")
def update_task_status(
    task_id: int,
    body: TaskStatusUpdate,
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TaskResponse:
    """Update only the status of a task (must belong to current user)."""
    table = db["tasks"]
    task_dict = get_task_or_404(table, task_id)
    _verify_ownership(task_dict, current_user["id"])

    updates = {
        "status": body.status.value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    table.update(task_id, updates)
    task_dict.update(updates)
    return TaskResponse(**task_dict)


@router.patch("/{task_id}/reorder")
def reorder_task(
    task_id: int,
    body: TaskReorder,
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TaskResponse:
    """Reorder a task within its status column (must belong to current user)."""
    table = db["tasks"]
    task_dict = get_task_or_404(table, task_id)
    _verify_ownership(task_dict, current_user["id"])

    # Get all tasks in the same status column, ordered by sort_order asc
    same_status_tasks = list(
        table.rows_where(
            where="status = :status AND user_id = :user_id",
            where_args={"status": task_dict["status"], "user_id": current_user["id"]},
            order_by="sort_order asc, id desc",
        )
    )

    # Validate sort_order is within range
    if body.sort_order >= len(same_status_tasks):
        raise HTTPException(
            status_code=422,
            detail=f"sort_order must be between 0 and {len(same_status_tasks) - 1}",
        )

    # Remove current task from list
    filtered_tasks = [t for t in same_status_tasks if t["id"] != task_id]
    # Insert at the target position
    filtered_tasks.insert(body.sort_order, {"id": task_id})

    # Re-number sort_order for all tasks in the list using batch UPDATE
    now = datetime.now(timezone.utc).isoformat()
    with db.conn:
        db.conn.executemany(
            "UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?",
            [(idx, now, t["id"]) for idx, t in enumerate(filtered_tasks)]
        )

    task_dict.update({"sort_order": body.sort_order, "updated_at": now})
    return TaskResponse(**task_dict)


@router.patch("/{task_id}/move")
def move_task(
    task_id: int,
    body: TaskMove,
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TaskResponse:
    """Atomically move a task to a new status and sort_order within a transaction.

    Updates status and re-numbers sort_order in the target column atomically.
    """
    table = db["tasks"]
    task_dict = get_task_or_404(table, task_id)
    _verify_ownership(task_dict, current_user["id"])

    now = datetime.now(timezone.utc).isoformat()

    with db.conn:
        # Update status first so the task appears in the target column
        table.update(task_id, {"status": body.status.value, "updated_at": now})

        # Get all tasks in the target status column
        target_tasks = list(
            table.rows_where(
                where="status = :status AND user_id = :user_id",
                where_args={
                    "status": body.status.value,
                    "user_id": current_user["id"],
                },
                order_by="sort_order asc, id desc",
            )
        )

        # Validate sort_order is within range
        if body.sort_order >= len(target_tasks):
            raise HTTPException(
                status_code=422,
                detail=f"sort_order must be between 0 and {len(target_tasks) - 1}",
            )

        # Remove current task from list, insert at target position, re-number
        filtered_tasks = [t for t in target_tasks if t["id"] != task_id]
        filtered_tasks.insert(body.sort_order, {"id": task_id})
        db.conn.executemany(
            "UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?",
            [(idx, now, t["id"]) for idx, t in enumerate(filtered_tasks)]
        )

    task_dict.update({
        "status": body.status.value,
        "sort_order": body.sort_order,
        "updated_at": now,
    })
    return TaskResponse(**task_dict)


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: sqlite_utils.Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Response:
    """Delete a task by its ID (must belong to current user)."""
    task_dict = get_task_or_404(db["tasks"], task_id)
    _verify_ownership(task_dict, current_user["id"])

    db["tasks"].delete(task_id)
    return Response(status_code=204)
