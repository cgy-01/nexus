"""User profile endpoints."""

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.document import Document
from src.domain.models.message import Message
from src.domain.models.session import Session
from src.domain.models.user import User
from src.domain.schemas.common import ApiResponse
from src.domain.schemas.user import UserResponse
from src.infra.database import get_db
from src.infra.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> dict[str, UserResponse]:
    """Return the authenticated user's profile."""
    return {"data": UserResponse.model_validate(current_user)}


# ── Stats ──

class StatsResponse(BaseModel):
    total_notes: int
    total_active_days: int
    consecutive_days: int


@router.get(
    "/stats",
    response_model=ApiResponse[StatsResponse],
)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, StatsResponse]:
    """Return user statistics for sidebar display."""
    user_id = current_user.id

    # total_notes: count of user's documents
    total_notes = await db.scalar(
        select(func.count(Document.id)).where(Document.user_id == user_id)
    ) or 0

    # total_active_days: count distinct dates with messages
    active_days = await db.scalar(
        select(func.count(func.distinct(func.date(Message.created_at)))).select_from(
            Message
        ).join(Session, Message.session_id == Session.id).where(
            Session.user_id == user_id
        )
    ) or 0

    # consecutive_days: count from today backwards
    today = date.today()
    consecutive = 0
    for i in range(365):  # max 365 days
        check_date = today - timedelta(days=i)
        has_activity = await db.scalar(
            select(Message.id).select_from(Message).join(
                Session, Message.session_id == Session.id
            ).where(
                Session.user_id == user_id,
                func.date(Message.created_at) == check_date,
            ).limit(1)
        )
        if has_activity:
            consecutive += 1
        else:
            break

    return {
        "data": StatsResponse(
            total_notes=total_notes,
            total_active_days=active_days,
            consecutive_days=consecutive,
        )
    }


# ── Activity heatmap ──

class ActivityResponse(BaseModel):
    activity: list[list[float]]  # 7 rows × N weeks, weighted score


@router.get(
    "/activity",
    response_model=ApiResponse[ActivityResponse],
)
async def get_user_activity(
    weeks: int = Query(14, ge=1, le=52),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, ActivityResponse]:
    """Return 7×N heatmap grid based on learning-loop score.

    daily_score = msg_count × 0.3 + doc_count × 1.0
    Row 0=Mon, Row 6=Sun. Rightmost col=this week.
    """
    today = date.today()
    user_id = current_user.id
    weekday = today.weekday()
    min_date = today - timedelta(days=weekday + (weeks - 1) * 7)

    # ── Message counts per day ──
    msg_result = await db.execute(
        select(
            func.date(Message.created_at).label("d"),
            func.count(Message.id).label("c"),
        ).select_from(Message).join(
            Session, Message.session_id == Session.id
        ).where(
            Session.user_id == user_id,
            func.date(Message.created_at) >= min_date,
            func.date(Message.created_at) <= today,
        ).group_by(func.date(Message.created_at))
    )
    msg_counts: dict[date, int] = {}
    for row in msg_result:
        d = _to_date(row.d)
        msg_counts[d] = row.c

    # ── Document (note) counts per day ──
    doc_result = await db.execute(
        select(
            func.date(Document.created_at).label("d"),
            func.count(Document.id).label("c"),
        ).where(
            Document.user_id == user_id,
            func.date(Document.created_at) >= min_date,
            func.date(Document.created_at) <= today,
        ).group_by(func.date(Document.created_at))
    )
    doc_counts: dict[date, int] = {}
    for row in doc_result:
        d = _to_date(row.d)
        doc_counts[d] = row.c

    # ── Build weighted grid ──
    start = today - timedelta(days=weekday + (weeks - 1) * 7)
    activity: list[list[float]] = []
    for row_idx in range(7):
        row_data: list[float] = []
        current = start + timedelta(days=row_idx)
        for col in range(weeks):
            d = current + timedelta(days=col * 7)
            if d > today:
                row_data.append(-1.0)
            else:
                score = msg_counts.get(d, 0) * 0.3 + doc_counts.get(d, 0) * 1.0
                row_data.append(round(score, 1))
        activity.append(row_data)

    return {"data": ActivityResponse(activity=activity)}


def _to_date(val) -> date:
    """Convert a string or date to date."""
    if isinstance(val, str):
        return date.fromisoformat(val)
    return val

