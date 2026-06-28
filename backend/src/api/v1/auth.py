"""Authentication endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.auth_service import AuthService
from src.domain.schemas.auth import (
    AuthData,
    LoginRequest,
    LogoutRequest,
    MessageData,
    RefreshRequest,
    RegisterRequest,
    TokenData,
)
from src.domain.schemas.common import ApiResponse
from src.infra.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=ApiResponse[AuthData],
    status_code=201,
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, AuthData]:
    """Create a new user account and return tokens."""
    data = await AuthService.register(
        db,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
    )
    return {"data": data}


@router.post(
    "/login",
    response_model=ApiResponse[AuthData],
)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, AuthData]:
    """Authenticate a user and return tokens."""
    data = await AuthService.login(
        db,
        email=body.email,
        password=body.password,
    )
    return {"data": data}


@router.post(
    "/refresh",
    response_model=ApiResponse[TokenData],
)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, TokenData]:
    """Rotate a refresh token and return a new token pair."""
    data = await AuthService.refresh(db, body.refresh_token)
    return {"data": data}


@router.post(
    "/logout",
    response_model=ApiResponse[MessageData],
)
async def logout(
    body: LogoutRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, MessageData]:
    """Revoke a refresh token."""
    data = await AuthService.logout(db, body.refresh_token)
    return {"data": data}
