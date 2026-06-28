"""Authentication request / response schemas."""

from pydantic import BaseModel, EmailStr, Field

from src.domain.schemas.user import UserResponse


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    """POST /auth/register"""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(None, max_length=100)


class LoginRequest(BaseModel):
    """POST /auth/login"""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """POST /auth/refresh"""

    refresh_token: str


class LogoutRequest(BaseModel):
    """POST /auth/logout"""

    refresh_token: str


# ---------------------------------------------------------------------------
# Response wrappers
# ---------------------------------------------------------------------------


class TokenData(BaseModel):
    """Token pair returned on login / register / refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthData(BaseModel):
    """Full auth response payload (user + tokens)."""

    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageData(BaseModel):
    """Generic success message."""

    message: str
