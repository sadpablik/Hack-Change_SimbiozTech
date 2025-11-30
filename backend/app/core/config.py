from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
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
    
    database_url: str
    model_path: str
    batch_size: int = 32
    ml_service_url: str
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_secure: bool = False
    
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    cors_allow_methods: List[str] = Field(
        default=["GET", "POST", "OPTIONS"],
        description="Allowed HTTP methods for CORS"
    )
    cors_allow_headers: List[str] = Field(
        default=["Content-Type", "Authorization"],
        description="Allowed HTTP headers for CORS"
    )
    
    @field_validator("cors_allow_methods", mode="before")
    @classmethod
    def parse_cors_methods(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [method.strip().upper() for method in v.split(",") if method.strip()]
        return []
    
    @field_validator("cors_allow_headers", mode="before")
    @classmethod
    def parse_cors_headers(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [header.strip() for header in v.split(",") if header.strip()]
        return []
    
    max_file_size_mb: int = Field(
        default=500,
        ge=1,
        le=1000,
        description="Maximum file size in MB"
    )
    max_text_length: int = Field(
        default=10000,
        ge=100,
        le=50000,
        description="Maximum text length in characters"
    )
    max_batch_size: int = Field(
        default=100000,
        ge=1000,
        le=1000000,
        description="Maximum batch size for processing"
    )
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return []
    
    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
