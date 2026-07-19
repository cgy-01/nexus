"""Shared test fixtures for the Nexus AI backend test suite.

Uses an async test database.  Tables are created once per session and
each test runs inside a transaction that is rolled back afterwards.
"""

import asyncio
import os
import uuid
from collections.abc import AsyncGenerator, AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Ensure backend package is importable
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.domain.models import Base
from src.main import create_app


# ---------------------------------------------------------------------------
# Database URL
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = os.environ["TEST_DATABASE_URL"]


# ---------------------------------------------------------------------------
# Event loop
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def event_loop() -> AsyncIterator[asyncio.AbstractEventLoop]:
    """Create a session-scoped event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ---------------------------------------------------------------------------
# Engine & session
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="session")
async def async_engine():
    """Session-scoped async engine connected to the test database."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Per-test database session wrapped in a rollback transaction."""
    TestSessionLocal = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with TestSessionLocal() as session:
        async with session.begin():
            yield session
            await session.rollback()


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client pointed at the FastAPI app."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://test"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------


@pytest.fixture
def unique_email() -> str:
    """Generate a unique email address for test users."""
    return f"test-{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture
def default_password() -> str:
    return "testpass1234"


@pytest_asyncio.fixture
async def auth_headers(
    client: AsyncClient, unique_email: str, default_password: str
) -> dict[str, str]:
    """Register a user and return Authorization headers."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": default_password,
            "display_name": "Test User",
        },
    )
    data = resp.json()["data"]
    return {"Authorization": f"Bearer {data['access_token']}"}
