"""User ORM model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.domain.models.refresh_token import RefreshToken


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    uid: Mapped[str | None] = mapped_column(
        String(20), unique=True, nullable=True, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    wechat: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r}>"
