from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "MissionOS Backend"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    log_level: str = "INFO"
    # Comma-separated string, not list[str]: pydantic-settings expects JSON for
    # list-typed env vars, which would be an awkward .env authoring experience
    # for a simple comma list. Split on demand via cors_origins_list below.
    cors_origins: str = "http://localhost:5173"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/missionos"
    # Dev-only default — every deployed environment must override this via .env.
    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    # Relative to the backend/ directory, regardless of the process's cwd.
    upload_dir: str = "storage/uploads"
    max_upload_size_bytes: int = 25 * 1024 * 1024
    # No default — a blank key must fail loudly (via OpenAIClient) rather than
    # silently attempt a request that was never going to authenticate.
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_timeout: float = 30.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
