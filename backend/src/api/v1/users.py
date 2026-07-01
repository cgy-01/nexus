"""User profile endpoints."""

import io
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.document import Document
from src.domain.models.message import Message
from src.domain.models.session import Session
from src.domain.models.user import User
from src.domain.schemas.common import ApiResponse
from src.domain.schemas.user import UserResponse
from src.infra.database import get_db
from src.infra.minio_client import get_minio_client
from src.infra.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

BEIJING = timezone(timedelta(hours=8))


def _today_beijing() -> date:
    """Return today's date in Beijing time (UTC+8)."""
    return (datetime.now(timezone.utc) + timedelta(hours=8)).date()


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> dict[str, UserResponse]:
    """Return the authenticated user's profile."""
    return {"data": UserResponse.model_validate(current_user)}


class UpdateProfileRequest(BaseModel):
    """Fields that the user can update."""

    display_name: str | None = Field(None, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)


@router.patch("/me", response_model=ApiResponse[UserResponse])
async def update_me(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, UserResponse]:
    """Update the authenticated user's profile fields."""
    if body.display_name is not None:
        current_user.display_name = body.display_name.strip() or None
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url.strip() or None

    # Validate at least one field is present
    if body.display_name is None and body.avatar_url is None:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.flush()
    return {"data": UserResponse.model_validate(current_user)}


AVATAR_PREFIX = "avatars"


@router.post("/me/avatar", response_model=ApiResponse[UserResponse])
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, UserResponse]:
    """Upload a new avatar image (stored in MinIO)."""
    # Validate file type
    filename = file.filename or "avatar.jpg"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(status_code=400, detail="仅支持 jpg/png/webp 格式")

    content_type_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
    object_key = f"{AVATAR_PREFIX}/{current_user.id}.{ext}"

    # Upload to MinIO
    content = await file.read()
    minio = get_minio_client()
    minio.put_object(
        bucket_name="nexus-files",
        object_name=object_key,
        data=io.BytesIO(content),
        length=len(content),
        content_type=content_type_map.get(ext, "application/octet-stream"),
    )

    # Update user record
    current_user.avatar_url = f"/api/v1/avatars/{current_user.id}"
    await db.flush()

    return {"data": UserResponse.model_validate(current_user)}


@router.get("/avatars/{user_id}")
async def serve_avatar(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Serve a user's avatar image from MinIO."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.avatar_url:
        raise HTTPException(status_code=404, detail="Avatar not found")

    # Derive object key from the stored URL pattern
    # avatar_url format: /api/v1/avatars/{user_id}
    ext = "jpg"  # default, will try to find actual object
    minio = get_minio_client()

    # Try each possible extension
    for try_ext in ("jpg", "jpeg", "png", "webp"):
        try_key = f"{AVATAR_PREFIX}/{user_id}.{try_ext}"
        try:
            obj = minio.get_object("nexus-files", try_key)
            content_type_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
            return StreamingResponse(
                obj.stream(amt=64 * 1024),
                media_type=content_type_map.get(try_ext, "application/octet-stream"),
            )
        except Exception:
            continue

    raise HTTPException(status_code=404, detail="Avatar not found")


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

    # total_active_days: count distinct dates with messages (UTC+8 aligned)
    active_days = await db.scalar(
        select(func.count(func.distinct(
            func.date(Message.created_at + text("interval '8 hours'"))
        ))).select_from(
            Message
        ).join(Session, Message.session_id == Session.id).where(
            Session.user_id == user_id
        )
    ) or 0

    # consecutive_days: count backwards from today (UTC+8). If no activity today, start from yesterday.
    today = _today_beijing()
    has_today = await db.scalar(
        select(Message.id).select_from(Message).join(
            Session, Message.session_id == Session.id
        ).where(
            Session.user_id == user_id,
            func.date(Message.created_at + text("interval '8 hours'")) == today,
        ).limit(1)
    )
    start_day = today if has_today else today - timedelta(days=1)

    consecutive = 0
    for i in range(365):
        check_date = start_day - timedelta(days=i)
        has_activity = await db.scalar(
            select(Message.id).select_from(Message).join(
                Session, Message.session_id == Session.id
            ).where(
                Session.user_id == user_id,
                func.date(Message.created_at + text("interval '8 hours'")) == check_date,
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
    All dates shifted +8h to align with Beijing time.
    """
    tz_offset = text("interval '8 hours'")
    today = _today_beijing()
    user_id = current_user.id
    weekday = today.weekday()
    min_date = today - timedelta(days=weekday + (weeks - 1) * 7)

    # ── Message counts per day (UTC+8) ──
    msg_result = await db.execute(
        select(
            func.date(Message.created_at + tz_offset).label("d"),
            func.count(Message.id).label("c"),
        ).select_from(Message).join(
            Session, Message.session_id == Session.id
        ).where(
            Session.user_id == user_id,
            func.date(Message.created_at + tz_offset) >= min_date,
            func.date(Message.created_at + tz_offset) <= today,
        ).group_by(func.date(Message.created_at + tz_offset))
    )
    msg_counts: dict[date, int] = {}
    for row in msg_result:
        d = _to_date(row.d)
        msg_counts[d] = row.c

    # ── Document (note) counts per day (UTC+8) ──
    doc_result = await db.execute(
        select(
            func.date(Document.created_at + tz_offset).label("d"),
            func.count(Document.id).label("c"),
        ).where(
            Document.user_id == user_id,
            func.date(Document.created_at + tz_offset) >= min_date,
            func.date(Document.created_at + tz_offset) <= today,
        ).group_by(func.date(Document.created_at + tz_offset))
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

