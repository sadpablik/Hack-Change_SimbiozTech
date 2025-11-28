"""Точка входа FastAPI приложения."""

from app.api.routes import api_router
from app.core.config import settings
from app.core.db import lifespan
from fastapi import FastAPI


def create_application() -> FastAPI:
    """
    Создает и настраивает FastAPI приложение.

    Returns:
        FastAPI: Настроенное приложение
    """
    application: FastAPI = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Backend API для анализа тональности текстов",
        lifespan=lifespan,
    )
    application.include_router(api_router, prefix=settings.api_prefix)
    return application


app: FastAPI = create_application()
