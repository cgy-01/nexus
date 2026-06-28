"""Integration tests for authentication endpoints."""

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_register_success(
    client: AsyncClient, unique_email: str, default_password: str
):
    """Registering with valid data should return user + tokens."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": default_password,
            "display_name": "Test User",
        },
    )
    assert resp.status_code == 201

    body = resp.json()
    data = body["data"]

    # Check user payload
    assert data["user"]["email"] == unique_email
    assert data["user"]["display_name"] == "Test User"
    assert "id" in data["user"]

    # Check tokens
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(
    client: AsyncClient, unique_email: str, default_password: str
):
    """Registering the same email twice should return 409."""
    payload = {"email": unique_email, "password": default_password}

    # First registration
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201

    # Second registration
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409

    body = resp.json()
    assert "already exists" in body["message"].lower()


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient, unique_email: str):
    """Password shorter than 8 characters should be rejected."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "short"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "validation_error"


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient, default_password: str):
    """Invalid email format should be rejected."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": default_password},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_login_success(
    client: AsyncClient, unique_email: str, default_password: str
):
    """Logging in with correct credentials should return user + tokens."""
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": default_password},
    )

    # Login
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": default_password},
    )
    assert resp.status_code == 200

    body = resp.json()
    data = body["data"]
    assert data["user"]["email"] == unique_email
    assert data["access_token"]
    assert data["refresh_token"]


@pytest.mark.asyncio
async def test_login_wrong_password(
    client: AsyncClient, unique_email: str, default_password: str
):
    """Logging in with a wrong password should return 401."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": default_password},
    )

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "wrong-password"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(
    client: AsyncClient, default_password: str
):
    """Logging in with an unknown email should return 401."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": default_password},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_refresh_success(
    client: AsyncClient, unique_email: str, default_password: str
):
    """Refreshing with a valid refresh token returns a new pair."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": default_password},
    )
    refresh_token = reg.json()["data"]["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200

    data = resp.json()["data"]
    assert data["access_token"]
    assert data["refresh_token"]
    # Token rotation: the new refresh token should differ
    assert data["refresh_token"] != refresh_token


@pytest.mark.asyncio
async def test_refresh_with_revoked_token(
    client: AsyncClient, unique_email: str, default_password: str
):
    """Using a revoked refresh token should return 401."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": default_password},
    )
    refresh_token = reg.json()["data"]["refresh_token"]

    # First refresh — revokes the old token
    await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    # Second refresh with the SAME (now revoked) token
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_bogus_token(client: AsyncClient):
    """A made-up refresh token should return 401."""
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "this-is-not-a-real-token"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logout_revokes_token(
    client: AsyncClient, unique_email: str, default_password: str
):
    """After logout, the refresh token should no longer be usable."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": default_password},
    )
    refresh_token = reg.json()["data"]["refresh_token"]

    # Logout
    resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["message"] == "Logged out successfully"

    # Try to refresh with the logged-out token
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 401
