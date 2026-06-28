"""Chat orchestration — stores messages, calls LLM, streams back SSE content."""

import uuid
from collections.abc import AsyncIterator

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.message import Message, MessageRole
from src.domain.models.session import Session
from src.infra.llm.deepseek_provider import DeepSeekProvider

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are a helpful AI assistant. Answer the user's questions clearly "
    "and concisely. When appropriate, use Markdown formatting for readability."
)

# Module-level singleton — created once per process
_provider: DeepSeekProvider | None = None


def _get_provider() -> DeepSeekProvider:
    global _provider
    if _provider is None:
        _provider = DeepSeekProvider()
    return _provider


class ChatService:
    """Orchestrates a single chat turn: store → retrieve context → stream → store."""

    # How many recent messages to include as context
    HISTORY_LIMIT = 30

    @classmethod
    async def stream_chat(
        cls,
        db: AsyncSession,
        user_id: str,
        session_id: str,
        content: str,
    ) -> AsyncIterator[str]:
        """Run a full chat turn and yield content tokens.

        Side effects:
        - Stores the user message
        - Stores the final assistant reply after streaming
        - Updates session title on first exchange
        - Updates session token counts
        """
        # 1. Validate session belongs to user
        q = select(Session).where(
            Session.id == session_id, Session.user_id == user_id
        )
        session = (await db.execute(q)).scalar_one_or_none()
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        # 2. Store user message
        user_msg = Message(
            session_id=session_id,
            role=MessageRole.user,
            content=content,
            token_count=_estimate_tokens(content),
        )
        db.add(user_msg)
        await db.commit()

        # 3. Fetch recent history (after user msg is committed)
        history = await cls._recent_messages(db, session_id, limit=cls.HISTORY_LIMIT)

        # 4. Build message list for LLM
        llm_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h in history:
            role = h.role.value if hasattr(h.role, "value") else str(h.role)
            llm_messages.append({"role": role, "content": h.content})

        # 5. Stream from LLM
        provider = _get_provider()
        accumulated: list[str] = []

        try:
            async for token in provider.chat_stream(
                llm_messages, model=session.model
            ):
                accumulated.append(token)
                yield token
        except Exception as exc:
            logger.error("chat_stream_failed", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LLM request failed — please try again",
            ) from exc

        full_reply = "".join(accumulated)

        # 6. Store assistant message
        assistant_msg = Message(
            session_id=session_id,
            role=MessageRole.assistant,
            content=full_reply,
            token_count=_estimate_tokens(full_reply),
            metadata={"model": session.model},
        )
        db.add(assistant_msg)

        # 7. Update session counters + auto-title on first exchange
        session.total_tokens += user_msg.token_count + assistant_msg.token_count
        session.title = _auto_title(session.title, content, full_reply)
        await db.commit()

        logger.info(
            "chat_turn_complete",
            session_id=session_id,
            user_tokens=user_msg.token_count,
            assistant_tokens=assistant_msg.token_count,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @classmethod
    async def _recent_messages(
        cls,
        db: AsyncSession,
        session_id: str,
        limit: int,
    ) -> list[Message]:
        q = (
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        return list((await db.execute(q)).scalars().all())


def _estimate_tokens(text: str) -> int:
    """Rough token estimator (~4 chars per token for English/CJK mix)."""
    return max(1, len(text) // 2)


def _auto_title(current_title: str, user_input: str, _reply: str) -> str:
    """Generate a short title from the first user message."""
    if current_title != "New Chat":
        return current_title
    # Use the first message as title, truncated
    clean = user_input.strip().replace("\n", " ")
    return clean[:50] + ("…" if len(clean) > 50 else "")
