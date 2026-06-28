"""Async Redis client for FastAPI dependency injection."""

from collections.abc import AsyncGenerator

import redis.asyncio as aioredis

from src.infra.config import get_settings

settings = get_settings()


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """FastAPI dependency that provides an async Redis connection."""
    client = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
    )
    try:
        yield client
    finally:
        await client.close()
