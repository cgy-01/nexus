"""Tests for user profile endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_me_returns_user(
    client: AsyncClient, unique_email: str, default_password: str
):
    """Authenticated request to /users/me should return the current user."""
    # Register
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": default_password,
            "display_name": "My Name",
        },
    )
    access_token = reg.json()["data"]["access_token"]

    # Get me
    resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200

    user = resp.json()["data"]
    assert user["email"] == unique_email
    assert user["display_name"] == "My Name"
    assert "id" in user
    assert "created_at" in user


@pytest.mark.asyncio
async def test_get_me_without_token(client: AsyncClient):
    """Request without Authorization header should return 401."""
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_bad_token(client: AsyncClient):
    """Request with a bogus token should return 401."""
    resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer fake-token-here"},
    )
    assert resp.status_code == 401
