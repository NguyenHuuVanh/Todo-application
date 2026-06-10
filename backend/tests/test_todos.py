"""Todo tests."""

from datetime import datetime, timezone
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.models.todo import Todo


async def get_auth_token(client: AsyncClient, email: str = "todo@example.com") -> str:
    """Helper to register and get auth token."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "password123"},
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_todo(client: AsyncClient):
    """Test creating a new todo."""
    token = await get_auth_token(client, "create@example.com")

    response = await client.post(
        "/api/v1/todos",
        json={"title": "Test Todo", "description": "A test todo item"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Todo"
    assert data["description"] == "A test todo item"
    assert data["completed"] is False


@pytest.mark.asyncio
async def test_get_todos(client: AsyncClient):
    """Test getting todo list."""
    token = await get_auth_token(client, "list@example.com")

    # Create a todo first
    await client.post(
        "/api/v1/todos",
        json={"title": "List Todo"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Get todos
    response = await client.get(
        "/api/v1/todos",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_update_todo(client: AsyncClient):
    """Test updating a todo."""
    token = await get_auth_token(client, "update@example.com")

    # Create a todo
    create_response = await client.post(
        "/api/v1/todos",
        json={"title": "Update Me"},
        headers={"Authorization": f"Bearer {token}"},
    )
    todo_id = create_response.json()["id"]

    # Update it
    response = await client.put(
        f"/api/v1/todos/{todo_id}",
        json={"title": "Updated Title", "completed": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_delete_todo(client: AsyncClient):
    """Test deleting a todo."""
    token = await get_auth_token(client, "delete@example.com")

    # Create a todo
    create_response = await client.post(
        "/api/v1/todos",
        json={"title": "Delete Me"},
        headers={"Authorization": f"Bearer {token}"},
    )
    todo_id = create_response.json()["id"]

    # Delete it
    response = await client.delete(
        f"/api/v1/todos/{todo_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_get_single_todo(client: AsyncClient):
    """Test getting a single todo by ID."""
    token = await get_auth_token(client, "single@example.com")

    # Create a todo
    create_response = await client.post(
        "/api/v1/todos",
        json={"title": "Single Todo", "description": "Get me"},
        headers={"Authorization": f"Bearer {token}"},
    )
    todo_id = create_response.json()["id"]

    # Get it
    response = await client.get(
        f"/api/v1/todos/{todo_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Single Todo"


@pytest.mark.asyncio
async def test_todos_rejects_page_size_above_limit(client: AsyncClient):
    """Todo list rejects unbounded page sizes."""
    token = await get_auth_token(client, "size@example.com")

    response = await client.get(
        "/api/v1/todos?size=101",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_todo_rejects_too_long_description(client: AsyncClient):
    """Todo create validates description length."""
    token = await get_auth_token(client, "long_create@example.com")

    response = await client.post(
        "/api/v1/todos",
        json={"title": "Too long", "description": "x" * 2001},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_todo_rejects_too_long_description(client: AsyncClient):
    """Todo update validates description length."""
    token = await get_auth_token(client, "long_update@example.com")
    create_response = await client.post(
        "/api/v1/todos",
        json={"title": "Update description"},
        headers={"Authorization": f"Bearer {token}"},
    )
    todo_id = create_response.json()["id"]

    response = await client.put(
        f"/api/v1/todos/{todo_id}",
        json={"description": "x" * 2001},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_todos_ordered_by_created_at_desc_then_id_desc(
    client: AsyncClient,
    db_session,
):
    """Todo list uses deterministic newest-first ordering."""
    token = await get_auth_token(client, "order@example.com")
    first = await client.post(
        "/api/v1/todos",
        json={"title": "Older"},
        headers={"Authorization": f"Bearer {token}"},
    )
    second = await client.post(
        "/api/v1/todos",
        json={"title": "Newer"},
        headers={"Authorization": f"Bearer {token}"},
    )

    await db_session.execute(
        update(Todo)
        .where(Todo.id == UUID(first.json()["id"]))
        .values(created_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    )
    await db_session.execute(
        update(Todo)
        .where(Todo.id == UUID(second.json()["id"]))
        .values(created_at=datetime(2026, 1, 2, tzinfo=timezone.utc))
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/todos",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert [item["title"] for item in response.json()["items"][:2]] == [
        "Newer",
        "Older",
    ]


@pytest.mark.asyncio
async def test_todo_date_filter_uses_app_timezone(
    client: AsyncClient,
    db_session,
):
    """Date-only filters use the app timezone instead of raw UTC dates."""
    token = await get_auth_token(client, "date_filter@example.com")
    create_response = await client.post(
        "/api/v1/todos",
        json={"title": "Vietnam local date"},
        headers={"Authorization": f"Bearer {token}"},
    )
    todo_id = UUID(create_response.json()["id"])

    await db_session.execute(
        update(Todo)
        .where(Todo.id == todo_id)
        .values(created_at=datetime(2026, 6, 10, 18, 43, tzinfo=timezone.utc))
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/todos?date_from=2026-06-11&date_to=2026-06-11",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == str(todo_id)
    assert data["items"][0]["created_at"].startswith("2026-06-11T01:43")
