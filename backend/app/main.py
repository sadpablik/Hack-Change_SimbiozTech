"""Точка входа FastAPI приложения."""

from app.api.routes import api_router
from app.core.config import settings
from app.core.db import lifespan
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


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

    # Настройка CORS для работы с фронтендом
    # В Docker браузер обращается к localhost:3000 и localhost:8000
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router, prefix=settings.api_prefix)
    return application


app: FastAPI = create_application()
