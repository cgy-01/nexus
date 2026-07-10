"""Aggregate all v1 routers under a single prefix."""

from fastapi import APIRouter

from src.api.v1.auth import router as auth_router
from src.api.v1.chat import router as chat_router
from src.api.v1.documents import router as documents_router
from src.api.v1.health import router as health_router
from src.api.v1.models import router as models_router
from src.api.v1.sessions import router as sessions_router
from src.api.v1.users import router as users_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(health_router)
router.include_router(models_router)
router.include_router(sessions_router)
router.include_router(chat_router)
router.include_router(documents_router)
