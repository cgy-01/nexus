"""当前已配置 LLM 模型的只读接口。"""

from fastapi import APIRouter, Depends

from src.domain.models.user import User
from src.domain.schemas.chat import ModelOption
from src.domain.schemas.common import ApiResponse
from src.infra.config import get_settings
from src.infra.security import get_current_user

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=ApiResponse[list[ModelOption]])
async def list_models(
    _user: User = Depends(get_current_user),
) -> dict[str, list[ModelOption]]:
    """只返回服务器明确配置为可用的模型。"""
    models = [
        ModelOption(id=model, name=model)
        for model in get_settings().available_models()
    ]
    return {"data": models}
