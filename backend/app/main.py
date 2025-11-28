from app.api.routes import api_router
from app.core.config import settings
from app.core.db import lifespan
from fastapi import FastAPI


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Базовый backend для хакатона",
        lifespan=lifespan,
    )
    application.include_router(api_router, prefix=settings.api_prefix)
    return application


app = create_application()
