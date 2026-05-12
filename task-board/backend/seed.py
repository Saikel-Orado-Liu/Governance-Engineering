"""Seed script to populate the tasks table with sample data.

Usage:
    python backend/seed.py

Idempotent: if the tasks table already has data, the script skips insertion.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime

import sqlite_utils


def _get_db() -> sqlite_utils.Database:
    """Create and return a database connection using TASKS_DB_PATH env var."""
    db_path = os.getenv("TASKS_DB_PATH", "tasks.db")
    conn = sqlite3.connect(db_path)
    return sqlite_utils.Database(conn)


def _ensure_tasks_schema(db: sqlite_utils.Database) -> None:
    """Create the tasks table if it does not exist."""
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


def _has_data(db: sqlite_utils.Database) -> bool:
    """Check if the tasks table already has data."""
    return db["tasks"].count > 0


def _insert_tasks(db: sqlite_utils.Database) -> None:
    """Insert seed tasks into the database."""
    now = datetime.utcnow().isoformat()

    tasks = [
        {
            "title": "设计用户登录页面",
            "description": "完成登录页面的 UI 设计和交互原型",
            "priority": "high",
            "status": "todo",
        },
        {
            "title": "编写 API 文档",
            "description": "使用 OpenAPI 规范编写后端接口文档",
            "priority": "medium",
            "status": "todo",
        },
        {
            "title": "配置 CI/CD 流水线",
            "description": "搭建 GitHub Actions 自动化构建和部署",
            "priority": "low",
            "status": "todo",
        },
        {
            "title": "实现任务 CRUD 接口",
            "description": "完成任务的创建、查询、更新、删除 API",
            "priority": "high",
            "status": "in_progress",
        },
        {
            "title": "集成 sqlite-utils ORM",
            "description": "用 sqlite-utils 替换原生 sqlite3 操作",
            "priority": "medium",
            "status": "in_progress",
        },
        {
            "title": "编写单元测试",
            "description": "为核心业务逻辑编写 pytest 测试用例",
            "priority": "low",
            "status": "in_progress",
        },
        {
            "title": "项目初始化",
            "description": "搭建 FastAPI + React 项目骨架和目录结构",
            "priority": "high",
            "status": "done",
        },
        {
            "title": "数据库 Schema 设计",
            "description": "设计 tasks 表的字段、类型和约束",
            "priority": "medium",
            "status": "done",
        },
        {
            "title": "环境配置",
            "description": "配置 ruff、eslint、pre-commit 等开发工具链",
            "priority": "low",
            "status": "done",
        },
    ]

    todo_count = 0
    in_progress_count = 0
    done_count = 0

    for task in tasks:
        task["created_at"] = now
        task["updated_at"] = now
        db["tasks"].insert(task)
        if task["status"] == "todo":
            todo_count += 1
        elif task["status"] == "in_progress":
            in_progress_count += 1
        elif task["status"] == "done":
            done_count += 1

    print(
        f"已插入 {todo_count} 条待办任务、"
        f"{in_progress_count} 条进行中任务、"
        f"{done_count} 条已完成任务",
    )


def main() -> None:
    """Main entry point for the seed script."""
    db = _get_db()
    try:
        _ensure_tasks_schema(db)

        if _has_data(db):
            print("tasks 表中已有数据，跳过种子数据插入。")
            return

        _insert_tasks(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
