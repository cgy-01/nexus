"""Application configuration via pydantic-settings.

All environment variables are read here — no other module should touch os.environ directly.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised settings sourced from .env and environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "NexusAI"
    app_version: str = "0.1.0"
    debug: bool = True
    log_level: str = "DEBUG"
    cors_origins: str = "http://localhost:8081,http://localhost:19006"

    # PostgreSQL
    database_url: str = (
        "postgresql+asyncpg://nexus:nexus_dev@localhost:5432/nexus"
    )

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"
    minio_bucket: str = "nexus-files"
    minio_secure: bool = False

    # LLM
    openai_api_key: str = ""
    openai_base_url: str = "https://api.deepseek.com/v1"
    llm_default_model: str = "deepseek-chat"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton per process)."""
    return Settings()
