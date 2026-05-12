"""Pydantic models for Task CRUD operations."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """Enumeration of possible task statuses."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(str, Enum):
    """Enumeration of possible task priorities."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskCreate(BaseModel):
    """Request model for creating a new task."""

    title: str = Field(..., min_length=1)
    description: str = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM


class TaskUpdate(BaseModel):
    """Request model for updating an existing task. All fields are optional."""

    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None


class TaskStatusUpdate(BaseModel):
    """Request model for updating only the status of a task."""

    status: TaskStatus


class TaskReorder(BaseModel):
    """Request model for reordering a task within its status column."""

    sort_order: int = Field(ge=0)


class TaskResponse(BaseModel):
    """Response model representing a task."""

    id: int
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime


class BoardColumn(BaseModel):
    """Response model representing a board column with its tasks."""

    status: TaskStatus
    label: str
    tasks: list[TaskResponse]
