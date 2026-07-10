"""Chat SSE endpoint — the core streaming interface."""

import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.chat_service import ChatService
from src.domain.models.session import Session as SessionModel
from src.domain.models.user import User
from src.domain.schemas.chat import ChatRequest
from src.infra.database import get_db
from src.infra.security import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


async def _sse_event_generator(
    db: AsyncSession,
    user_id: str,
    req: ChatRequest,
) -> str:
    """Yield SSE-formatted lines for each token + a final ``done`` event."""
    # Resolve session — create if needed
    session_id = req.session_id
    if not session_id:
        session = SessionModel(user_id=user_id)
        db.add(session)
        await db.flush()
        session_id = str(session.id)

    try:
        async for item in ChatService.stream_chat(
            db,
            user_id,
            session_id,
            req.content,
            enable_search=req.enable_search,
            search_region=req.search_region,
        ):
            payload_data = dict(item.data)
            if item.event == "done":
                payload_data["session_id"] = session_id
            payload = json.dumps(payload_data, ensure_ascii=False)
            yield f"event: {item.event}\ndata: {payload}\n\n"

    except Exception as exc:
        error_payload = json.dumps(
            {
                "code": "llm_error",
                "message": (
                    str(exc.detail)
                    if hasattr(exc, "detail")
                    else str(exc)
                ),
            },
            ensure_ascii=False,
        )
        yield f"event: error\ndata: {error_payload}\n\n"


@router.post("")
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Send a message and receive a token-by-token SSE stream.

    If ``session_id`` is omitted, a new session is created automatically.
    """
    return StreamingResponse(
        _sse_event_generator(db, str(user.id), body),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
