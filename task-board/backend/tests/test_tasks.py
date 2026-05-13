"""Tests for Task CRUD API endpoints."""

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
    """Create a fresh in-memory database for testing (thread-safe)."""
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


@pytest.fixture
def auth_headers(client):
    """Login as default admin and return Authorization headers."""
    resp = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_task(client, auth_headers):
    """Create a sample task and return its data."""
    resp = client.post("/api/tasks", json={"title": "Test Task"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()


# ── POST /api/tasks ─────────────────────────────────────────────────────────


class TestCreateTask:
    def test_create_minimal(self, client, auth_headers):
        resp = client.post(
            "/api/tasks", json={"title": "Buy milk"}, headers=auth_headers
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Buy milk"
        assert data["description"] == ""
        assert data["status"] == "todo"
        assert data["priority"] == "medium"
        assert data["id"] == 1
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_full(self, client, auth_headers):
        payload = {
            "title": "Write report",
            "description": "Q3 financial report",
            "status": "in_progress",
            "priority": "high",
        }
        resp = client.post("/api/tasks", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Write report"
        assert data["description"] == "Q3 financial report"
        assert data["status"] == "in_progress"
        assert data["priority"] == "high"

    def test_create_empty_title_returns_422(self, client, auth_headers):
        resp = client.post(
            "/api/tasks", json={"title": ""}, headers=auth_headers
        )
        assert resp.status_code == 422

    def test_create_missing_title_returns_422(self, client, auth_headers):
        resp = client.post(
            "/api/tasks", json={"description": "no title"}, headers=auth_headers
        )
        assert resp.status_code == 422

    def test_create_invalid_status_returns_422(self, client, auth_headers):
        resp = client.post(
            "/api/tasks",
            json={"title": "Bad", "status": "unknown_status"},
            headers=auth_headers,
        )
        assert resp.status_code == 422


# ── GET /api/tasks ──────────────────────────────────────────────────────────


class TestListTasks:
    def test_empty_list(self, client, auth_headers):
        resp = client.get("/api/tasks", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_tasks(self, client, auth_headers, sample_task):
        resp = client.get("/api/tasks", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_filter_by_status(self, client, auth_headers):
        client.post("/api/tasks", json={"title": "A", "status": "todo"}, headers=auth_headers)
        client.post("/api/tasks", json={"title": "B", "status": "done"}, headers=auth_headers)
        resp = client.get("/api/tasks?status=todo", headers=auth_headers)
        assert resp.status_code == 200
        titles = [t["title"] for t in resp.json()]
        assert "A" in titles
        assert "B" not in titles

    def test_filter_by_priority(self, client, auth_headers):
        client.post("/api/tasks", json={"title": "High", "priority": "high"}, headers=auth_headers)
        client.post("/api/tasks", json={"title": "Low", "priority": "low"}, headers=auth_headers)
        resp = client.get("/api/tasks?priority=high", headers=auth_headers)
        assert resp.status_code == 200
        titles = [t["title"] for t in resp.json()]
        assert "High" in titles
        assert "Low" not in titles

    def test_filter_by_status_and_priority(self, client, auth_headers):
        client.post(
            "/api/tasks",
            json={"title": "Match", "status": "todo", "priority": "high"},
            headers=auth_headers,
        )
        client.post(
            "/api/tasks",
            json={"title": "NoMatch1", "status": "done", "priority": "high"},
            headers=auth_headers,
        )
        client.post(
            "/api/tasks",
            json={"title": "NoMatch2", "status": "todo", "priority": "low"},
            headers=auth_headers,
        )
        resp = client.get("/api/tasks?status=todo&priority=high", headers=auth_headers)
        assert resp.status_code == 200
        titles = [t["title"] for t in resp.json()]
        assert "Match" in titles
        assert "NoMatch1" not in titles
        assert "NoMatch2" not in titles

    def test_pagination_offset_limit(self, client, auth_headers):
        """Verify offset/limit pagination params and X-Total-Count header."""
        for i in range(5):
            client.post(
                "/api/tasks",
                json={"title": f"Task {i}", "status": "todo"},
                headers=auth_headers,
            )

        # offset=2, limit=3 -> items at indices 2, 3, 4
        # ordered by created_at desc so: Task 4, Task 3, Task 2, Task 1, Task 0
        resp = client.get("/api/tasks?offset=2&limit=3", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        titles = [t["title"] for t in data]
        assert titles == ["Task 2", "Task 1", "Task 0"]
        assert resp.headers.get("X-Total-Count") == "5"


# ── GET /api/tasks/{id} ────────────────────────────────────────────────────


class TestGetTask:
    def test_get_existing(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == task_id

    def test_get_non_existent_returns_404(self, client, auth_headers):
        resp = client.get("/api/tasks/9999", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_invalid_id_returns_422(self, client, auth_headers):
        resp = client.get("/api/tasks/abc", headers=auth_headers)
        assert resp.status_code == 422


# ── PATCH /api/tasks/{id} ──────────────────────────────────────────────────


class TestUpdateTask:
    def test_update_title(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(
            f"/api/tasks/{task_id}", json={"title": "Updated"}, headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"
        # Other fields should remain unchanged
        assert resp.json()["status"] == sample_task["status"]

    def test_update_partial_only_one_field(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(
            f"/api/tasks/{task_id}", json={"priority": "high"}, headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["priority"] == "high"
        assert data["title"] == sample_task["title"]
        assert data["status"] == sample_task["status"]

    def test_update_empty_body_no_change(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(f"/api/tasks/{task_id}", json={}, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == sample_task["title"]

    def test_update_non_existent_returns_404(self, client, auth_headers):
        resp = client.patch(
            "/api/tasks/9999", json={"title": "Nope"}, headers=auth_headers
        )
        assert resp.status_code == 404

    def test_update_clears_description(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(
            f"/api/tasks/{task_id}", json={"description": ""}, headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == ""


# ── DELETE /api/tasks/{id} ──────────────────────────────────────────────────


class TestDeleteTask:
    def test_delete_existing(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
        assert resp.status_code == 204

        # Verify it is gone
        get_resp = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    def test_delete_non_existent_returns_404(self, client, auth_headers):
        resp = client.delete("/api/tasks/9999", headers=auth_headers)
        assert resp.status_code == 404

    def test_delete_is_idempotent_for_existing(self, client, auth_headers, sample_task):
        """Deleting the same task twice should 404 on second attempt."""
        task_id = sample_task["id"]
        resp1 = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
        assert resp1.status_code == 204

        resp2 = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
        assert resp2.status_code == 404

    def test_delete_task_excluded_from_board(self, client, auth_headers):
        """Deleted task must not appear in any board column."""
        t1 = client.post(
            "/api/tasks", json={"title": "Task A", "status": "todo"}, headers=auth_headers
        ).json()
        t2 = client.post(
            "/api/tasks", json={"title": "Task B", "status": "in_progress"}, headers=auth_headers
        ).json()
        t3 = client.post(
            "/api/tasks", json={"title": "Task C", "status": "done"}, headers=auth_headers
        ).json()

        # Delete task B
        resp = client.delete(f"/api/tasks/{t2['id']}", headers=auth_headers)
        assert resp.status_code == 204

        # Verify board doesn't contain deleted task
        board_resp = client.get("/api/boards", headers=auth_headers)
        assert board_resp.status_code == 200
        board = board_resp.json()
        all_task_ids = {t["id"] for col in board for t in col["tasks"]}
        assert t2["id"] not in all_task_ids
        # Other tasks still present
        assert t1["id"] in all_task_ids
        assert t3["id"] in all_task_ids


# ── Board view ──────────────────────────────────────────────────────────────


class TestBoard:
    def test_get_boards(self, client, auth_headers):
        client.post(
            "/api/tasks", json={"title": "Task 1", "status": "todo"}, headers=auth_headers
        )
        client.post(
            "/api/tasks", json={"title": "Task 2", "status": "in_progress"}, headers=auth_headers
        )
        client.post(
            "/api/tasks", json={"title": "Task 3", "status": "done"}, headers=auth_headers
        )

        resp = client.get("/api/boards", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3

        statuses = [col["status"] for col in data]
        assert statuses == ["todo", "in_progress", "done"]

        labels = [col["label"] for col in data]
        assert labels == ["To Do", "In Progress", "Done"]

        todo_col = data[0]
        assert len(todo_col["tasks"]) == 1
        assert todo_col["tasks"][0]["title"] == "Task 1"

    def test_get_boards_empty(self, client, auth_headers):
        resp = client.get("/api/boards", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        for col in data:
            assert col["tasks"] == []

    def test_board_task_counts(self, client, auth_headers):
        """Board columns have correct task counts."""
        for _ in range(2):
            client.post(
                "/api/tasks", json={"title": "Todo Item", "status": "todo"}, headers=auth_headers
            )
        for _ in range(3):
            client.post(
                "/api/tasks", json={"title": "InProg Item", "status": "in_progress"}, headers=auth_headers
            )
        client.post(
            "/api/tasks", json={"title": "Done Item", "status": "done"}, headers=auth_headers
        )

        resp = client.get("/api/boards", headers=auth_headers)
        assert resp.status_code == 200
        board = resp.json()
        for col in board:
            if col["status"] == "todo":
                assert len(col["tasks"]) == 2
            elif col["status"] == "in_progress":
                assert len(col["tasks"]) == 3
            elif col["status"] == "done":
                assert len(col["tasks"]) == 1

    def test_board_sort_order_consistency(self, client, auth_headers):
        """Tasks within a column are sorted by sort_order ASC, then id DESC."""
        t1 = client.post(
            "/api/tasks", json={"title": "C", "status": "todo"}, headers=auth_headers
        ).json()
        t2 = client.post(
            "/api/tasks", json={"title": "B", "status": "todo"}, headers=auth_headers
        ).json()
        t3 = client.post(
            "/api/tasks", json={"title": "A", "status": "todo"}, headers=auth_headers
        ).json()

        resp = client.get("/api/boards", headers=auth_headers)
        assert resp.status_code == 200
        todo_col = [c for c in resp.json() if c["status"] == "todo"][0]
        task_ids = [t["id"] for t in todo_col["tasks"]]
        # sort_order is 0 for all, tie-break by id DESC
        assert task_ids == [t3["id"], t2["id"], t1["id"]]


# ── PATCH /api/tasks/{id}/status ────────────────────────────────────────────


class TestPatchTaskStatus:
    def test_patch_task_status_success(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(
            f"/api/tasks/{task_id}/status", json={"status": "done"}, headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "done"
        assert data["id"] == task_id

    def test_patch_task_status_not_found(self, client, auth_headers):
        resp = client.patch(
            "/api/tasks/9999/status", json={"status": "done"}, headers=auth_headers
        )
        assert resp.status_code == 404

    def test_patch_task_status_invalid(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(
            f"/api/tasks/{task_id}/status", json={"status": "invalid"}, headers=auth_headers
        )
        assert resp.status_code == 422

    def test_patch_status_cross_column(self, client, auth_headers):
        """Create a todo task, change status to in_progress, verify board reflects the move."""
        resp = client.post(
            "/api/tasks", json={"title": "Cross Column Task", "status": "todo"}, headers=auth_headers
        )
        assert resp.status_code == 201
        task_id = resp.json()["id"]

        # PATCH status to in_progress
        resp = client.patch(
            f"/api/tasks/{task_id}/status", json={"status": "in_progress"}, headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

        # Verify board shows the task in the In Progress column, not in To Do
        board_resp = client.get("/api/boards", headers=auth_headers)
        assert board_resp.status_code == 200
        board = board_resp.json()
        for col in board:
            task_ids = {t["id"] for t in col["tasks"]}
            if col["status"] == "in_progress":
                assert task_id in task_ids
            elif col["status"] == "todo":
                assert task_id not in task_ids

    def test_patch_status_rollback(self, client, auth_headers):
        """Bidirectional status transitions: done -> in_progress -> todo."""
        resp = client.post(
            "/api/tasks", json={"title": "Rollback Task", "status": "done"}, headers=auth_headers
        )
        assert resp.status_code == 201
        task_id = resp.json()["id"]

        # done -> in_progress
        resp = client.patch(
            f"/api/tasks/{task_id}/status", json={"status": "in_progress"}, headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

        # in_progress -> todo
        resp = client.patch(
            f"/api/tasks/{task_id}/status", json={"status": "todo"}, headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "todo"


# ── PATCH /api/tasks/{id}/reorder ──────────────────────────────────────────


class TestReorderTask:
    def test_reorder_task_success(self, client, auth_headers):
        """Reorder a task within the same column — verify sort_order persistence."""
        t1 = client.post(
            "/api/tasks", json={"title": "A", "status": "todo"}, headers=auth_headers
        ).json()
        t2 = client.post(
            "/api/tasks", json={"title": "B", "status": "todo"}, headers=auth_headers
        ).json()
        t3 = client.post(
            "/api/tasks", json={"title": "C", "status": "todo"}, headers=auth_headers
        ).json()

        # Move task C to position 0
        resp = client.patch(
            f"/api/tasks/{t3['id']}/reorder", json={"sort_order": 0}, headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == t3["id"]

        board_resp = client.get("/api/boards", headers=auth_headers)
        todo_col = [c for c in board_resp.json() if c["status"] == "todo"][0]
        task_ids = [t["id"] for t in todo_col["tasks"]]
        # Same sort_order ties broken by id desc: [t3(0), t2(1), t1(2)]
        assert task_ids == [t3["id"], t2["id"], t1["id"]]

    def test_reorder_task_boundary_first(self, client, auth_headers):
        """Reorder to sort_order=0 (first position)."""
        client.post(
            "/api/tasks", json={"title": "A", "status": "todo"}, headers=auth_headers
        ).json()
        t2 = client.post(
            "/api/tasks", json={"title": "B", "status": "todo"}, headers=auth_headers
        ).json()

        resp = client.patch(
            f"/api/tasks/{t2['id']}/reorder", json={"sort_order": 0}, headers=auth_headers
        )
        assert resp.status_code == 200

        board_resp = client.get("/api/boards", headers=auth_headers)
        todo_col = [c for c in board_resp.json() if c["status"] == "todo"][0]
        assert todo_col["tasks"][0]["id"] == t2["id"]

    def test_reorder_task_boundary_last(self, client, auth_headers):
        """Reorder to sort_order = max index (last position)."""
        t1 = client.post(
            "/api/tasks", json={"title": "A", "status": "todo"}, headers=auth_headers
        ).json()
        client.post(
            "/api/tasks", json={"title": "B", "status": "todo"}, headers=auth_headers
        )
        client.post(
            "/api/tasks", json={"title": "C", "status": "todo"}, headers=auth_headers
        )

        # Move task A to position 2 (last)
        resp = client.patch(
            f"/api/tasks/{t1['id']}/reorder", json={"sort_order": 2}, headers=auth_headers
        )
        assert resp.status_code == 200

        board_resp = client.get("/api/boards", headers=auth_headers)
        todo_col = [c for c in board_resp.json() if c["status"] == "todo"][0]
        task_ids = [t["id"] for t in todo_col["tasks"]]
        assert task_ids[-1] == t1["id"]

    def test_reorder_task_out_of_range(self, client, auth_headers):
        """sort_order >= len(same_status_tasks) returns 422."""
        t1 = client.post(
            "/api/tasks", json={"title": "A", "status": "todo"}, headers=auth_headers
        ).json()

        # Only 1 task, valid sort_order range is 0..0, so sort_order=1 must be rejected
        resp = client.patch(
            f"/api/tasks/{t1['id']}/reorder", json={"sort_order": 1}, headers=auth_headers
        )
        assert resp.status_code == 422

    def test_reorder_task_not_found(self, client, auth_headers):
        """Non-existent task ID returns 404."""
        resp = client.patch(
            "/api/tasks/9999/reorder", json={"sort_order": 0}, headers=auth_headers
        )
        assert resp.status_code == 404


# ── Boundary tests ──────────────────────────────────────────────────────────


class TestBoundary:
    def test_create_task_chinese_title(self, client, auth_headers):
        title = "完成用户认证模块"
        resp = client.post(
            "/api/tasks", json={"title": title}, headers=auth_headers
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == title

    def test_create_task_emoji_title(self, client, auth_headers):
        title = "🎉 发布 v2.0 🚀"
        resp = client.post(
            "/api/tasks", json={"title": title}, headers=auth_headers
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == title

    def test_create_task_long_title(self, client, auth_headers):
        title = "A" * 1500
        resp = client.post(
            "/api/tasks", json={"title": title}, headers=auth_headers
        )
        assert resp.status_code in (201, 422)
        if resp.status_code == 201:
            assert resp.json()["title"] == title

    def test_patch_task_non_ascii(self, client, auth_headers, sample_task):
        task_id = sample_task["id"]
        title = "中文标题更新"
        resp = client.patch(
            f"/api/tasks/{task_id}", json={"title": title}, headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == title


# ── Health endpoint still works ────────────────────────────────────────────


def test_health_endpoint_unaffected(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
