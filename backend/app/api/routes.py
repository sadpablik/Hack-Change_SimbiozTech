from app.core.db import get_session
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check(
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Проверяет доступность API и подключения к базе данных."""
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "up"}


api_router = APIRouter()
api_router.include_router(router, prefix="")
