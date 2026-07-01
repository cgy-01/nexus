"""MinIO object storage client — single entry point for S3-compatible storage."""

from functools import lru_cache

from minio import Minio  # type: ignore[import-untyped]

from src.infra.config import get_settings


@lru_cache
def get_minio_client() -> Minio:
    """Return a cached MinIO client (singleton per process)."""
    settings = get_settings()
    client = Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=settings.minio_secure,
    )
    _ensure_bucket(client, settings.minio_bucket)
    return client


def _ensure_bucket(client: Minio, bucket: str) -> None:
    """Create bucket if it doesn't exist."""
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
