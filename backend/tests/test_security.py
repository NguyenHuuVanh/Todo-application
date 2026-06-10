"""Security tests for all implemented bug fixes."""

from datetime import timedelta

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token, create_refresh_token


# --- Helpers ---

async def register(client: AsyncClient, email: str, password: str = "password123") -> dict:
    res = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    return res.json()


async def get_token(client: AsyncClient, email: str, password: str = "password123") -> str:
    data = await register(client, email, password)
    return data["access_token"]


# --- BUG-01: JWT expiry ---

@pytest.mark.asyncio
async def test_expired_token_rejected(client: AsyncClient):
    """BUG-01: expired token must be rejected."""
    expired = create_access_token(
        data={"sub": "00000000-0000-0000-0000-000000000001"},
        expires_delta=timedelta(seconds=-1),
    )
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401


# --- BUG-02/03/04: Ownership checks ---

@pytest.mark.asyncio
async def test_cannot_read_other_user_todo(client: AsyncClient):
    """BUG-02: user A cannot read user B's todo."""
    token_a = await get_token(client, "a_read@example.com")
    token_b = await get_token(client, "b_read@example.com")

    create = await client.post(
        "/api/v1/todos",
        json={"title": "B todo"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    todo_id = create.json()["id"]

    res = await client.get(
        f"/api/v1/todos/{todo_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_cannot_update_other_user_todo(client: AsyncClient):
    """BUG-03: user A cannot update user B's todo."""
    token_a = await get_token(client, "a_upd@example.com")
    token_b = await get_token(client, "b_upd@example.com")

    create = await client.post(
        "/api/v1/todos",
        json={"title": "B todo"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    todo_id = create.json()["id"]

    res = await client.put(
        f"/api/v1/todos/{todo_id}",
        json={"title": "hacked"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_cannot_delete_other_user_todo(client: AsyncClient):
    """BUG-04: user A cannot delete user B's todo."""
    token_a = await get_token(client, "a_del@example.com")
    token_b = await get_token(client, "b_del@example.com")

    create = await client.post(
        "/api/v1/todos",
        json={"title": "B todo"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    todo_id = create.json()["id"]

    res = await client.delete(
        f"/api/v1/todos/{todo_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 403


# --- BUG-08: Update logic ---

@pytest.mark.asyncio
async def test_update_todo_persists_changes(client: AsyncClient):
    """BUG-08: update must actually persist the provided fields."""
    token = await get_token(client, "upd_logic@example.com")

    create = await client.post(
        "/api/v1/todos",
        json={"title": "original"},
        headers={"Authorization": f"Bearer {token}"},
    )
    todo_id = create.json()["id"]

    await client.put(
        f"/api/v1/todos/{todo_id}",
        json={"title": "updated", "completed": True},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = await client.get(
        f"/api/v1/todos/{todo_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.json()["title"] == "updated"
    assert res.json()["completed"] is True


# --- BUG-09: Token type check ---

@pytest.mark.asyncio
async def test_refresh_token_rejected_on_protected_endpoint(client: AsyncClient):
    """BUG-09: refresh token must not be accepted as access token."""
    data = await register(client, "refresh_type@example.com")
    refresh_token = data["refresh_token"]

    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert res.status_code == 401


# --- BUG-11: Email enumeration ---

@pytest.mark.asyncio
async def test_login_same_error_for_wrong_email_and_wrong_password(client: AsyncClient):
    """BUG-11: login must return identical status for wrong email vs wrong password."""
    await register(client, "exists@example.com")

    res_no_user = await client.post(
        "/api/v1/auth/login",
        json={"email": "notexists@example.com", "password": "password123"},
    )
    res_wrong_pw = await client.post(
        "/api/v1/auth/login",
        json={"email": "exists@example.com", "password": "wrongpassword"},
    )

    assert res_no_user.status_code == res_wrong_pw.status_code == 401


@pytest.mark.asyncio
async def test_login_short_password_returns_401_not_422(client: AsyncClient):
    """Login uses auth failure semantics instead of register validation."""
    await register(client, "short_login@example.com")

    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "short_login@example.com", "password": "abc"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_access_token_with_non_string_sub_returns_401(client: AsyncClient):
    """Malformed access token subject must not return 500."""
    malformed = create_access_token(data={"sub": 123})

    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {malformed}"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_invalid_uuid_sub(client: AsyncClient):
    """Malformed refresh token subject must not return 500."""
    malformed = create_refresh_token(data={"sub": "not-a-uuid"})

    res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": malformed},
    )
    assert res.status_code == 401


# --- BUG-15: Password min length ---

@pytest.mark.asyncio
async def test_register_rejects_short_password(client: AsyncClient):
    """BUG-15: password shorter than 8 chars must be rejected."""
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "short_pw@example.com", "password": "abc"},
    )
    assert res.status_code == 422
