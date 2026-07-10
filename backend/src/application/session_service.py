"""Session CRUD business logic."""

import uuid

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.session import Session
from src.domain.schemas.chat import CreateSessionRequest, SessionResponse
from src.infra.config import get_settings

logger = structlog.get_logger()


class SessionService:
    """Stateless service for session management."""

    @classmethod
    async def create(
        cls,
        db: AsyncSession,
        user_id: str,
        req: CreateSessionRequest,
    ) -> SessionResponse:
        session = Session(
            user_id=user_id,
            title=req.title or "New Chat",
            model=get_settings().llm_default_model,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        logger.info("session_created", session_id=str(session.id))
        return SessionResponse.model_validate(session)

    @classmethod
    async def list_for_user(
        cls,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[SessionResponse], int, int, int, int]:
        offset = (page - 1) * page_size

        count_q = (
            select(func.count())
            .select_from(Session)
            .where(Session.user_id == user_id)
        )
        total = (await db.execute(count_q)).scalar() or 0

        q = (
            select(Session)
            .where(Session.user_id == user_id)
            .order_by(Session.updated_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        rows = (await db.execute(q)).scalars().all()

        sessions = [SessionResponse.model_validate(r) for r in rows]
        total_pages = max(1, (total + page_size - 1) // page_size)
        return sessions, total, page, page_size, total_pages

    @classmethod
    async def get_for_user(
        cls,
        db: AsyncSession,
        session_id: str,
        user_id: str,
    ) -> SessionResponse:
        q = select(Session).where(
            Session.id == session_id, Session.user_id == user_id
        )
        row = (await db.execute(q)).scalar_one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return SessionResponse.model_validate(row)

    @classmethod
    async def delete(
        cls,
        db: AsyncSession,
        session_id: str,
        user_id: str,
    ) -> None:
        q = select(Session).where(
            Session.id == session_id, Session.user_id == user_id
        )
        row = (await db.execute(q)).scalar_one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail="Session not found")
        await db.delete(row)
        await db.commit()
        logger.info("session_deleted", session_id=session_id)
