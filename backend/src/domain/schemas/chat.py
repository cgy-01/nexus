"""Chat-related Pydantic schemas — request/response shapes."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


# ── Session ────────────────────────────────────────────────────────


class CreateSessionRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    model: str
    total_tokens: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _coerce_uuids(cls, data: object) -> object:
        """Coerce UUID fields to str for Pydantic validation."""
        if hasattr(data, "id"):
            d = {
                "id": str(data.id),
                "user_id": str(data.user_id),
                "title": data.title,
                "model": data.model,
                "total_tokens": data.total_tokens,
                "is_active": data.is_active,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
            return d
        return data


# ── Message ────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    session_id: str | None = None
    content: str = Field(min_length=1)
    model: str | None = Field(default=None, min_length=1, max_length=64)
    enable_search: bool = True
    search_region: Literal["mainland", "auto"] = "mainland"


class ModelOption(BaseModel):
    id: str
    name: str


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    token_count: int
    metadata: dict
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _map_extra_to_metadata(cls, data: object) -> object:
        """Map ORM ``extra`` → response ``metadata``."""
        if hasattr(data, "extra"):
            d = {
                "id": str(data.id),
                "session_id": str(data.session_id),
                "role": data.role.value if hasattr(data.role, "value") else data.role,
                "content": data.content,
                "token_count": data.token_count,
                "metadata": data.extra or {},
                "created_at": data.created_at,
            }
            return d
        return data


# ── SSE Events ─────────────────────────────────────────────────────


class SSETokenEvent(BaseModel):
    content: str


class SSEDoneEvent(BaseModel):
    total_tokens: int
    model: str


class SSESourcesEvent(BaseModel):
    sources: list[dict]
    provider: str | None = None
    region: str
    status: str


class SSEAgentStatusEvent(BaseModel):
    stage: Literal["planning", "searching", "reviewing", "answering"]
    step: int | None = None
