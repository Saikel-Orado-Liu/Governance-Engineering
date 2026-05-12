"""Tests for Task CRUD API endpoints."""

import sqlite3

import pytest
import sqlite_utils
from fastapi.testclient import TestClient

from src.database import get_db, _ensure_tasks_schema, _add_sort_order_column
from src.main import app


def _override_db() -> sqlite_utils.Database:
    """Create a fresh in-memory database for testing (thread-safe)."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    db = sqlite_utils.Database(conn)
    _ensure_tasks_schema(db)
    _add_sort_order_column(db)
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
def sample_task(client):
    """Create a sample task and return its data."""
    resp = client.post("/api/tasks", json={"title": "Test Task"})
    assert resp.status_code == 201
    return resp.json()


# ── POST /api/tasks ─────────────────────────────────────────────────────────


class TestCreateTask:
    def test_create_minimal(self, client):
        resp = client.post("/api/tasks", json={"title": "Buy milk"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Buy milk"
        assert data["description"] == ""
        assert data["status"] == "todo"
        assert data["priority"] == "medium"
        assert data["id"] == 1
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_full(self, client):
        payload = {
            "title": "Write report",
            "description": "Q3 financial report",
            "status": "in_progress",
            "priority": "high",
        }
        resp = client.post("/api/tasks", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Write report"
        assert data["description"] == "Q3 financial report"
        assert data["status"] == "in_progress"
        assert data["priority"] == "high"

    def test_create_empty_title_returns_422(self, client):
        resp = client.post("/api/tasks", json={"title": ""})
        assert resp.status_code == 422

    def test_create_missing_title_returns_422(self, client):
        resp = client.post("/api/tasks", json={"description": "no title"})
        assert resp.status_code == 422

    def test_create_invalid_status_returns_422(self, client):
        resp = client.post(
            "/api/tasks",
            json={"title": "Bad", "status": "unknown_status"},
        )
        assert resp.status_code == 422


# ── GET /api/tasks ──────────────────────────────────────────────────────────


class TestListTasks:
    def test_empty_list(self, client):
        resp = client.get("/api/tasks")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_tasks(self, client, sample_task):
        resp = client.get("/api/tasks")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_filter_by_status(self, client):
        client.post("/api/tasks", json={"title": "A", "status": "todo"})
        client.post("/api/tasks", json={"title": "B", "status": "done"})
        resp = client.get("/api/tasks?status=todo")
        assert resp.status_code == 200
        titles = [t["title"] for t in resp.json()]
        assert "A" in titles
        assert "B" not in titles

    def test_filter_by_priority(self, client):
        client.post("/api/tasks", json={"title": "High", "priority": "high"})
        client.post("/api/tasks", json={"title": "Low", "priority": "low"})
        resp = client.get("/api/tasks?priority=high")
        assert resp.status_code == 200
        titles = [t["title"] for t in resp.json()]
        assert "High" in titles
        assert "Low" not in titles

    def test_filter_by_status_and_priority(self, client):
        client.post(
            "/api/tasks",
            json={"title": "Match", "status": "todo", "priority": "high"},
        )
        client.post(
            "/api/tasks",
            json={"title": "NoMatch1", "status": "done", "priority": "high"},
        )
        client.post(
            "/api/tasks",
            json={"title": "NoMatch2", "status": "todo", "priority": "low"},
        )
        resp = client.get("/api/tasks?status=todo&priority=high")
        assert resp.status_code == 200
        titles = [t["title"] for t in resp.json()]
        assert "Match" in titles
        assert "NoMatch1" not in titles
        assert "NoMatch2" not in titles


# ── GET /api/tasks/{id} ────────────────────────────────────────────────────


class TestGetTask:
    def test_get_existing(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.get(f"/api/tasks/{task_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == task_id

    def test_get_non_existent_returns_404(self, client):
        resp = client.get("/api/tasks/9999")
        assert resp.status_code == 404

    def test_get_invalid_id_returns_422(self, client):
        resp = client.get("/api/tasks/abc")
        assert resp.status_code == 422


# ── PATCH /api/tasks/{id} ──────────────────────────────────────────────────


class TestUpdateTask:
    def test_update_title(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(f"/api/tasks/{task_id}", json={"title": "Updated"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"
        # Other fields should remain unchanged
        assert resp.json()["status"] == sample_task["status"]

    def test_update_partial_only_one_field(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(f"/api/tasks/{task_id}", json={"priority": "high"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["priority"] == "high"
        assert data["title"] == sample_task["title"]
        assert data["status"] == sample_task["status"]

    def test_update_empty_body_no_change(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(f"/api/tasks/{task_id}", json={})
        assert resp.status_code == 200
        # updated_at should not change if no fields are updated
        # But our implementation always sets updated_at when updates is non-empty
        # An empty body means updates is empty, so updated_at should be unchanged
        data = resp.json()
        assert data["title"] == sample_task["title"]

    def test_update_non_existent_returns_404(self, client):
        resp = client.patch("/api/tasks/9999", json={"title": "Nope"})
        assert resp.status_code == 404

    def test_update_clears_description(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(f"/api/tasks/{task_id}", json={"description": ""})
        assert resp.status_code == 200
        assert resp.json()["description"] == ""


# ── DELETE /api/tasks/{id} ──────────────────────────────────────────────────


class TestDeleteTask:
    def test_delete_existing(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.delete(f"/api/tasks/{task_id}")
        assert resp.status_code == 204

        # Verify it is gone
        get_resp = client.get(f"/api/tasks/{task_id}")
        assert get_resp.status_code == 404

    def test_delete_non_existent_returns_404(self, client):
        resp = client.delete("/api/tasks/9999")
        assert resp.status_code == 404

    def test_delete_is_idempotent_for_existing(self, client, sample_task):
        """Deleting the same task twice should 404 on second attempt."""
        task_id = sample_task["id"]
        resp1 = client.delete(f"/api/tasks/{task_id}")
        assert resp1.status_code == 204

        resp2 = client.delete(f"/api/tasks/{task_id}")
        assert resp2.status_code == 404


# ── Board view ──────────────────────────────────────────────────────────────


class TestBoard:
    def test_get_boards(self, client):
        client.post("/api/tasks", json={"title": "Task 1", "status": "todo"})
        client.post("/api/tasks", json={"title": "Task 2", "status": "in_progress"})
        client.post("/api/tasks", json={"title": "Task 3", "status": "done"})

        resp = client.get("/api/boards")
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

    def test_get_boards_empty(self, client):
        resp = client.get("/api/boards")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        for col in data:
            assert col["tasks"] == []


# ── PATCH /api/tasks/{id}/status ────────────────────────────────────────────


class TestPatchTaskStatus:
    def test_patch_task_status_success(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(f"/api/tasks/{task_id}/status", json={"status": "done"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "done"
        assert data["id"] == task_id

    def test_patch_task_status_not_found(self, client):
        resp = client.patch("/api/tasks/9999/status", json={"status": "done"})
        assert resp.status_code == 404

    def test_patch_task_status_invalid(self, client, sample_task):
        task_id = sample_task["id"]
        resp = client.patch(
            f"/api/tasks/{task_id}/status", json={"status": "invalid"}
        )
        assert resp.status_code == 422


# ── PATCH /api/tasks/{id}/reorder ──────────────────────────────────────────


class TestReorderTask:
    def test_reorder_task_success(self, client):
        """Reorder a task within the same column — verify sort_order persistence."""
        t1 = client.post("/api/tasks", json={"title": "A", "status": "todo"}).json()
        t2 = client.post("/api/tasks", json={"title": "B", "status": "todo"}).json()
        t3 = client.post("/api/tasks", json={"title": "C", "status": "todo"}).json()

        # Move task C to position 0
        resp = client.patch(f"/api/tasks/{t3['id']}/reorder", json={"sort_order": 0})
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == t3["id"]

        board_resp = client.get("/api/boards")
        todo_col = [c for c in board_resp.json() if c["status"] == "todo"][0]
        task_ids = [t["id"] for t in todo_col["tasks"]]
        # Same sort_order ties broken by id desc: [t3(0), t2(1), t1(2)]
        assert task_ids == [t3["id"], t2["id"], t1["id"]]

    def test_reorder_task_boundary_first(self, client):
        """Reorder to sort_order=0 (first position)."""
        t1 = client.post("/api/tasks", json={"title": "A", "status": "todo"}).json()
        t2 = client.post("/api/tasks", json={"title": "B", "status": "todo"}).json()

        resp = client.patch(f"/api/tasks/{t2['id']}/reorder", json={"sort_order": 0})
        assert resp.status_code == 200

        board_resp = client.get("/api/boards")
        todo_col = [c for c in board_resp.json() if c["status"] == "todo"][0]
        assert todo_col["tasks"][0]["id"] == t2["id"]

    def test_reorder_task_boundary_last(self, client):
        """Reorder to sort_order = max index (last position)."""
        t1 = client.post("/api/tasks", json={"title": "A", "status": "todo"}).json()
        t2 = client.post("/api/tasks", json={"title": "B", "status": "todo"}).json()
        t3 = client.post("/api/tasks", json={"title": "C", "status": "todo"}).json()

        # Move task A to position 2 (last)
        resp = client.patch(f"/api/tasks/{t1['id']}/reorder", json={"sort_order": 2})
        assert resp.status_code == 200

        board_resp = client.get("/api/boards")
        todo_col = [c for c in board_resp.json() if c["status"] == "todo"][0]
        task_ids = [t["id"] for t in todo_col["tasks"]]
        assert task_ids[-1] == t1["id"]

    def test_reorder_task_out_of_range(self, client):
        """sort_order >= len(same_status_tasks) returns 422."""
        t1 = client.post("/api/tasks", json={"title": "A", "status": "todo"}).json()

        # Only 1 task, valid sort_order range is 0..0, so sort_order=1 must be rejected
        resp = client.patch(f"/api/tasks/{t1['id']}/reorder", json={"sort_order": 1})
        assert resp.status_code == 422

    def test_reorder_task_not_found(self, client):
        """Non-existent task ID returns 404."""
        resp = client.patch("/api/tasks/9999/reorder", json={"sort_order": 0})
        assert resp.status_code == 404


# ── Health endpoint still works ────────────────────────────────────────────


def test_health_endpoint_unaffected(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
