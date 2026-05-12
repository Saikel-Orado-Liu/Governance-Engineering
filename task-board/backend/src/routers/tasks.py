"""Task CRUD API routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlite_utils.db import NotFoundError
import sqlite_utils

from src.database import get_db
from src.schemas.tasks import (
    TaskCreate,
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


router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    db: sqlite_utils.Database = Depends(get_db),
) -> list[TaskResponse]:
    """List all tasks, optionally filtered by status and/or priority."""
    where_clauses: list[str] = []
    where_args: dict[str, str] = {}

    if status is not None:
        where_clauses.append("status = :status")
        where_args["status"] = status.value
    if priority is not None:
        where_clauses.append("priority = :priority")
        where_args["priority"] = priority.value

    where = " AND ".join(where_clauses) if where_clauses else None
    where_args = where_args if where_args else None

    return list(db["tasks"].rows_where(where=where, where_args=where_args, order_by="created_at desc"))


@router.get("/{task_id}")
def get_task(
    task_id: int,
    db: sqlite_utils.Database = Depends(get_db),
) -> TaskResponse:
    """Get a single task by its ID."""
    return get_task_or_404(db["tasks"], task_id)


@router.post("", status_code=201)
def create_task(
    task: TaskCreate,
    db: sqlite_utils.Database = Depends(get_db),
) -> TaskResponse:
    """Create a new task."""
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "title": task.title,
        "description": task.description,
        "status": task.status.value,
        "priority": task.priority.value,
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
) -> TaskResponse:
    """Update an existing task. Only provided fields are updated."""
    get_task_or_404(db["tasks"], task_id)

    updates: dict[str, str | int] = {}
    if task.title is not None:
        updates["title"] = task.title
    if task.description is not None:
        updates["description"] = task.description
    if task.status is not None:
        updates["status"] = task.status.value
    if task.priority is not None:
        updates["priority"] = task.priority.value

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        db["tasks"].update(task_id, updates)

    return get_task_or_404(db["tasks"], task_id)


@router.patch("/{task_id}/status")
def update_task_status(
    task_id: int,
    body: TaskStatusUpdate,
    db: sqlite_utils.Database = Depends(get_db),
) -> TaskResponse:
    """Update only the status of a task."""
    get_task_or_404(db["tasks"], task_id)

    updates = {
        "status": body.status.value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    db["tasks"].update(task_id, updates)
    return get_task_or_404(db["tasks"], task_id)


@router.patch("/{task_id}/reorder")
def reorder_task(
    task_id: int,
    body: TaskReorder,
    db: sqlite_utils.Database = Depends(get_db),
) -> TaskResponse:
    """Reorder a task within its status column by updating sort_order values."""
    table = db["tasks"]
    task = get_task_or_404(table, task_id)

    # Get all tasks in the same status column, ordered by sort_order asc
    same_status_tasks = list(
        table.rows_where(
            where="status = :status",
            where_args={"status": task["status"]},
            order_by="sort_order asc, id desc",
        )
    )

    # Validate sort_order is within range (Pydantic Field(ge=0) already guarantees non-negative)
    if body.sort_order >= len(same_status_tasks):
        raise HTTPException(
            status_code=422,
            detail=f"sort_order must be between 0 and {len(same_status_tasks) - 1}",
        )

    # Remove current task from list
    filtered_tasks = [t for t in same_status_tasks if t["id"] != task_id]
    # Insert at the target position
    filtered_tasks.insert(body.sort_order, {"id": task_id})

    # Re-number sort_order for all tasks in the list
    now = datetime.now(timezone.utc).isoformat()
    for idx, t in enumerate(filtered_tasks):
        table.update(t["id"], {"sort_order": idx, "updated_at": now})

    return get_task_or_404(table, task_id)


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: sqlite_utils.Database = Depends(get_db),
) -> Response:
    """Delete a task by its ID."""
    get_task_or_404(db["tasks"], task_id)

    db["tasks"].delete(task_id)
    return Response(status_code=204)
