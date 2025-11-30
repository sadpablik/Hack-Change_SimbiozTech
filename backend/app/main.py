from app.api.routes import api_router
from app.core.config import settings
from app.core.db import lifespan
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_application() -> FastAPI:
    application: FastAPI = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Backend API для анализа тональности текстов",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    application.include_router(api_router, prefix=settings.api_prefix)
    return application


app: FastAPI = create_application()
