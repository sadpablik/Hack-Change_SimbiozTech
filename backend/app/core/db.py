from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.core.config import settings
from app.services.ml_service import ml_service
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


async def check_database() -> None:
    async with engine.begin() as connection:
        await connection.execute(text("SELECT 1"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Загружаем ML-модель при старте приложения
    await ml_service.load_model(settings.model_path)
    # Проверяем подключение к БД
    await check_database()
    try:
        yield
    finally:
        await engine.dispose()
