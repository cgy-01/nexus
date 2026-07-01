"""FastAPI application factory — entry point for the Nexus AI backend."""

import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

import structlog

from src.api.v1 import router as v1_router
from src.infra.config import get_settings
from src.infra.logging import setup_logging

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown logic."""
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info(
        "app_starting",
        name=settings.app_name,
        version=settings.app_version,
    )
    yield
    logger.info("app_shutting_down")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            origin.strip() for origin in settings.cors_origins.split(",")
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -----------------------------------------------------------------------
    # Exception handlers
    # -----------------------------------------------------------------------

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": _http_code_to_error_code(exc.status_code),
                "message": str(exc.detail),
                "detail": None,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Extract per-field errors
        field_errors: dict[str, list[str]] = {}
        for error in exc.errors():
            loc = ".".join(str(p) for p in error["loc"] if p != "body")
            field_errors.setdefault(loc, []).append(error["msg"])

        return JSONResponse(
            status_code=422,
            content={
                "code": "validation_error",
                "message": "Request validation failed",
                "detail": field_errors,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception(
            "unhandled_error",
            exc_info=exc,
            path=request.url.path,
            method=request.method,
        )
        return JSONResponse(
            status_code=500,
            content={
                "code": "internal_error",
                "message": "An unexpected error occurred",
                "detail": None,
            },
        )

    # -----------------------------------------------------------------------
    # Request logging middleware
    # -----------------------------------------------------------------------

    @app.middleware("http")
    async def logging_middleware(
        request: Request, call_next
    ):
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=str(uuid.uuid4())[:8],
        )
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start

        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            elapsed_ms=round(elapsed * 1000, 2),
        )
        return response

    # -----------------------------------------------------------------------
    # Routes
    # -----------------------------------------------------------------------

    import os

    os.makedirs("/app/static", exist_ok=True)
    app.mount("/static", StaticFiles(directory="/app/static"), name="static")

    app.include_router(v1_router, prefix="/api/v1")

    return app


# ---------------------------------------------------------------------------
# Module-level instance (used by uvicorn)
# ---------------------------------------------------------------------------

app = create_app()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _http_code_to_error_code(status_code: int) -> str:
    """Map HTTP status codes to snake_case error codes."""
    mapping: dict[int, str] = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
        422: "validation_error",
        429: "rate_limited",
        500: "internal_error",
    }
    return mapping.get(status_code, "unknown_error")
