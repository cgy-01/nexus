"""Message ORM model — a single chat turn."""

import uuid
from enum import StrEnum

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin, UUIDMixin


class MessageRole(StrEnum):
    system = "system"
    user = "user"
    assistant = "assistant"


class Message(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        String(20), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    extra: Mapped[dict] = mapped_column(
        JSONB, default=dict, nullable=False
    )

    # Relationships
    session: Mapped["Session"] = relationship(
        "Session", back_populates="messages"
    )

    def __repr__(self) -> str:
        return f"<Message id={self.id!r} role={self.role!r}>"
