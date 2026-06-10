"""Auth tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Test successful user registration."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_integrity_error_returns_conflict(client: AsyncClient, monkeypatch):
    """Duplicate email races return a controlled conflict instead of 500."""

    async def raise_integrity_error(*_args, **_kwargs):
        raise IntegrityError("insert users", {}, Exception("duplicate email"))

    monkeypatch.setattr("app.api.v1.auth.create_user", raise_integrity_error)

    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "race@example.com", "password": "password123"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login after registration."""
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "password123"},
    )

    # Then login
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient):
    """Test getting current user info."""
    # Register and get token
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "password123"},
    )
    token = reg_response.json()["access_token"]

    # Get current user
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    """Test logout endpoint."""
    # Register and get token
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"email": "logout@example.com", "password": "password123"},
    )
    token = reg_response.json()["access_token"]

    # Logout
    response = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out"

    me_response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rejected_after_logout(client: AsyncClient):
    """Logout revokes refresh tokens issued before logout."""
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"email": "logout_refresh@example.com", "password": "password123"},
    )
    data = reg_response.json()

    response = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert response.status_code == 200

    refresh_response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": data["refresh_token"]},
    )
    assert refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_old_refresh_token_rejected_after_rotation(client: AsyncClient):
    """Using a refresh token rotates and revokes the old refresh token."""
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh_rotate@example.com", "password": "password123"},
    )
    old_refresh_token = reg_response.json()["refresh_token"]

    first_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token},
    )
    assert first_refresh.status_code == 200

    second_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token},
    )
    assert second_refresh.status_code == 401
