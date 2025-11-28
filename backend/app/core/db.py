"""Управление подключением к базе данных и сессиями."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.core.config import settings
from app.services.ml_service import ml_service
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """
    Зависимость для получения сессии БД.

    Yields:
        AsyncSession: Сессия базы данных
    """
    async with AsyncSessionLocal() as session:
        yield session


async def check_database() -> None:
    """
    Проверяет подключение к базе данных.

    Raises:
        Exception: Если подключение не удалось
    """
    async with engine.begin() as connection:
        await connection.execute(text("SELECT 1"))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Управляет жизненным циклом приложения.

    Загружает ML-модель при старте и проверяет подключение к БД.

    Args:
        app: Экземпляр FastAPI приложения

    Yields:
        None
    """
    await ml_service.load_model(settings.model_path)
    await check_database()
    try:
        yield
    finally:
        await engine.dispose()
