"""User-related response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    """Public user representation returned by the API."""

    id: uuid.UUID
    email: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime
    uid: str | None = None
    phone: str | None = None
    wechat: str | None = None

    model_config = {"from_attributes": True}
