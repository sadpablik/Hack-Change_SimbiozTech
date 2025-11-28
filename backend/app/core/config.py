from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Hack-Change Backend"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"
    environment: str = "local"
    debug: bool = True
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/hack_change"
    )
    model_path: str = "models/sentiment_model"
    batch_size: int = 32


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
