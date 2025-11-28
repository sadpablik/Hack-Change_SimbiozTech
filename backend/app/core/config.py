"""Конфигурация приложения."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки приложения."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        protected_namespaces=("settings_",),
    )

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
    """
    Получает кэшированный экземпляр настроек.

    Returns:
        Settings: Экземпляр настроек приложения
    """
    return Settings()


settings: Settings = get_settings()
