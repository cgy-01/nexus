"""Health-check endpoint."""

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.infra.database import get_db
from src.infra.redis import get_redis

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Return service health status.

    Checks PostgreSQL and Redis connectivity.
    """
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    # Check Redis
    try:
        await redis_client.ping()
        redis_status = "ok"
    except Exception:
        redis_status = "error"

    overall = (
        "ok"
        if db_status == "ok" and redis_status == "ok"
        else "degraded"
    )

    return {
        "status": overall,
        "db": db_status,
        "redis": redis_status,
    }
