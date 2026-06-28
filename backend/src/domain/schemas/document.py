"""Document / Note schemas — request and response shapes."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class GenerateNoteRequest(BaseModel):
    """Request body for generating a note from chat messages."""

    messages: list[dict] = Field(
        default_factory=list,
        description="List of {role, content} dicts from the chat session",
    )


class NoteOut(BaseModel):
    """Note returned to the frontend."""

    id: str
    title: str
    preview: str
    tag: str
    is_pinned: bool
    content: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: object) -> str:
        """Coerce UUID objects to string for JSON serialization."""
        return str(v)


class CreateNoteRequest(BaseModel):
    """Request body for manually creating a note."""

    title: str = Field(..., min_length=1, max_length=255)
    content: str = ""
    tag: str = "学习"
