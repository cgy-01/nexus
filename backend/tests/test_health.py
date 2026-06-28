"""Tests for the health-check endpoint."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(client: AsyncClient):
    """The health endpoint should return 200 with status keys."""
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200

    body = resp.json()
    assert "status" in body
    # db/redis may be "ok" or "error" depending on local setup
    assert body["status"] in ("ok", "degraded")
