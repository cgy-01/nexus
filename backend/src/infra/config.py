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
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # Email authentication
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_address: str = ""
    smtp_use_ssl: bool = False
    smtp_starttls: bool = True
    smtp_timeout_seconds: float = 10.0
    email_code_expire_minutes: int = 10
    email_code_resend_seconds: int = 60
    email_code_max_attempts: int = 5

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_root_user: str
    minio_root_password: str
    minio_bucket: str = "nexus-files"
    minio_secure: bool = False

    # LLM
    openai_api_key: str = ""
    openai_base_url: str = "https://api.deepseek.com/v1"
    llm_default_model: str = "deepseek-v4-flash"
    llm_available_models: str = ""

    def available_models(self) -> list[str]:
        """返回当前服务实际允许调用的模型，默认模型始终可用。"""
        models = [
            model.strip()
            for model in self.llm_available_models.split(",")
            if model.strip()
        ]
        if self.llm_default_model not in models:
            models.insert(0, self.llm_default_model)
        return list(dict.fromkeys(models))

    # Search
    search_enabled: bool = True
    search_default_region: str = "mainland"
    search_provider_mainland: str = "bocha"
    bocha_api_key: str = ""
    bocha_search_endpoint: str = "https://api.bocha.cn/v1/web-search"
    search_max_results: int = 5
    search_timeout_seconds: float = 8.0

    # Research agent
    agent_max_steps: int = 4
    agent_max_searches: int = 3
    agent_max_sources: int = 12
    agent_timeout_seconds: float = 30.0


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton per process)."""
    return Settings()
