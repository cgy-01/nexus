"""Session REST endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.session_service import SessionService
from src.domain.models.user import User
from src.domain.schemas.chat import (
    CreateSessionRequest,
    MessageResponse,
    SessionResponse,
)
from src.domain.schemas.common import ApiResponse, PaginatedResponse
from src.infra.database import get_db
from src.infra.security import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=ApiResponse[SessionResponse], status_code=201)
async def create_session(
    body: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, SessionResponse]:
    data = await SessionService.create(db, str(user.id), body)
    return {"data": data}


@router.get("", response_model=ApiResponse[PaginatedResponse[SessionResponse]])
async def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, PaginatedResponse[SessionResponse]]:
    sessions, total, p, ps, tp = await SessionService.list_for_user(
        db, str(user.id), page, page_size
    )
    return {
        "data": PaginatedResponse(
            data=sessions,
            total=total,
            page=p,
            page_size=ps,
            total_pages=tp,
        )
    }


@router.get("/{session_id}", response_model=ApiResponse[SessionResponse])
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, SessionResponse]:
    data = await SessionService.get_for_user(db, session_id, str(user.id))
    return {"data": data}


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    await SessionService.delete(db, session_id, str(user.id))


@router.get(
    "/{session_id}/messages",
    response_model=ApiResponse[PaginatedResponse[MessageResponse]],
)
async def list_messages(
    session_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, PaginatedResponse[MessageResponse]]:
    """Return paginated message history for a session."""
    # Verify session ownership
    await SessionService.get_for_user(db, session_id, str(user.id))

    from sqlalchemy import select, func
    from src.domain.models.message import Message

    offset = (page - 1) * page_size

    count_q = (
        select(func.count())
        .select_from(Message)
        .where(Message.session_id == session_id)
    )
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    rows = (await db.execute(q)).scalars().all()

    messages = [MessageResponse.model_validate(r) for r in rows]
    total_pages = max(1, (total + page_size - 1) // page_size)

    return {
        "data": PaginatedResponse(
            data=messages,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    }
