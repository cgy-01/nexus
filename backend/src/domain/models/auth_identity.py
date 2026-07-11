"""External identities linked to a user account."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.domain.models.user import User


class AuthIdentity(Base, UUIDMixin, TimestampMixin):
    """A verified identity from email, phone, WeChat, QQ, or a future provider."""

    __tablename__ = "auth_identities"
    __table_args__ = (
        UniqueConstraint("provider", "subject", name="uq_auth_identities_provider_subject"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="identities")
