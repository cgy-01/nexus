"""Shared response wrappers used by all API endpoints.

The frontend expects every response to be wrapped in ``{ "data": ... }``.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard success envelope.

    Example:
        {"data": {"id": "...", "email": "a@b.com"}}
    """

    data: T


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list envelope.

    Example:
        {"data": [...], "total": 100, "page": 1, "page_size": 20, "total_pages": 5}
    """

    data: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorDetail(BaseModel):
    """Per-field validation error detail."""

    code: str
    message: str
    detail: dict[str, list[str]] | None = None
