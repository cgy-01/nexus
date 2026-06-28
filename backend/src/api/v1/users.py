"""User profile endpoints."""

from fastapi import APIRouter, Depends

from src.domain.models.user import User
from src.domain.schemas.common import ApiResponse
from src.domain.schemas.user import UserResponse
from src.infra.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> dict[str, UserResponse]:
    """Return the authenticated user's profile."""
    return {"data": UserResponse.model_validate(current_user)}
