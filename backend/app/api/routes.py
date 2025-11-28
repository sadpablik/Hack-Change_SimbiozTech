"""API эндпоинты для анализа тональности."""

import traceback
from typing import Any

import pandas as pd
from app.core.db import get_session
from app.models.analysis import AnalysisSession, TextAnalysis
from app.schemas.analysis import (
    BatchAnalysisResponse,
    ClassMetrics,
    CSVUploadResponse,
    TextAnalysisRequest,
    TextAnalysisResponse,
    ValidationResponse,
)
from app.services.csv_service import csv_service
from app.services.metrics_service import metrics_service
from app.services.ml_service import ml_service
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

router: APIRouter = APIRouter()


async def get_session_or_404(session: AsyncSession, session_id: int) -> AnalysisSession:
    """
    Получает сессию анализа по ID или выбрасывает 404.

    Args:
        session: Сессия БД
        session_id: ID сессии

    Returns:
        AnalysisSession: Сессия анализа

    Raises:
        HTTPException: Если сессия не найдена
    """
    result = await session.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    analysis_session: AnalysisSession | None = result.scalar_one_or_none()
    if not analysis_session:
        raise HTTPException(
            status_code=404, detail=f"Сессия с ID {session_id} не найдена"
        )
    return analysis_session


@router.get("/health", tags=["health"])
async def health_check(
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Проверяет доступность API и подключения к базе данных.

    Args:
        session: Сессия БД

    Returns:
        Словарь со статусом API и БД
    """
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "up"}


@router.post("/upload", response_model=CSVUploadResponse, tags=["analysis"])
async def upload_csv(
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> CSVUploadResponse:
    """
    Загружает CSV файл и создает сессию анализа.

    CSV должен содержать обязательную колонку 'text'.
    Опциональные колонки: 'source', 'label' (true_label).

    Args:
        file: Загруженный CSV файл
        session: Сессия БД

    Returns:
        CSVUploadResponse: Информация о созданной сессии

    Raises:
        HTTPException: При ошибках обработки файла или сохранения данных
    """
    try:
        data: list[dict[str, Any]] = await csv_service.parse_csv(file)

        analysis_session: AnalysisSession = AnalysisSession(
            filename=file.filename or "unknown.csv"
        )
        session.add(analysis_session)
        await session.flush()

        text_analyses: list[TextAnalysis] = [
            TextAnalysis(
                session_id=analysis_session.id,
                text=str(row["text"]),
                pred_label=0,
                confidence=0.0,
                source=row.get("source"),
                true_label=(
                    int(row["label"])
                    if "label" in row and pd.notna(row.get("label"))
                    else None
                ),
            )
            for row in data
        ]
        session.add_all(text_analyses)
        await session.commit()

        return CSVUploadResponse(
            session_id=analysis_session.id,
            filename=file.filename or "unknown.csv",
            rows_count=len(data),
        )
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        error_detail: str = (
            f"Ошибка при сохранении данных: {str(e)}\n{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=error_detail)


@router.post("/analyze", response_model=TextAnalysisResponse, tags=["analysis"])
async def analyze_text(
    request: TextAnalysisRequest,
) -> TextAnalysisResponse:
    """
    Анализирует тональность одного текста.

    Args:
        request: Запрос с текстом для анализа

    Returns:
        TextAnalysisResponse: Предсказанный класс и уверенность модели
    """
    label: int
    confidence: float
    label, confidence = ml_service.predict(request.text)
    return TextAnalysisResponse(label=label, confidence=confidence)


@router.post("/batch-analyze", response_model=BatchAnalysisResponse, tags=["analysis"])
async def batch_analyze(
    session_id: int = Query(..., description="ID сессии загрузки CSV"),
    session: AsyncSession = Depends(get_session),
) -> BatchAnalysisResponse:
    """
    Выполняет батч-обработку всех текстов из загруженного CSV.

    Берет все тексты из сессии, выполняет предсказания и сохраняет результаты в БД.

    Args:
        session_id: ID сессии загрузки CSV
        session: Сессия БД

    Returns:
        BatchAnalysisResponse: Результаты батч-обработки

    Raises:
        HTTPException: Если сессия не найдена или нет текстов для анализа
    """
    await get_session_or_404(session, session_id)

    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses: list[TextAnalysis] = result.scalars().all()

    if not text_analyses:
        raise HTTPException(status_code=400, detail="В сессии нет текстов для анализа")

    texts: list[str] = [ta.text for ta in text_analyses]
    predictions: list[tuple[int, float]] = ml_service.predict_batch(texts)

    for text_analysis, (label, confidence) in zip(text_analyses, predictions):
        text_analysis.pred_label = label
        text_analysis.confidence = confidence

    await session.commit()

    return BatchAnalysisResponse(
        session_id=session_id, processed_count=len(text_analyses)
    )


@router.post("/validate", response_model=ValidationResponse, tags=["analysis"])
async def validate_session(
    session_id: int = Query(..., description="ID сессии для валидации"),
    session: AsyncSession = Depends(get_session),
) -> ValidationResponse:
    """
    Рассчитывает macro-F1 метрику для сессии.

    Использует true_label и pred_label из БД для расчета метрик по классам.

    Args:
        session_id: ID сессии для валидации
        session: Сессия БД

    Returns:
        ValidationResponse: Результаты валидации с macro-F1 и метриками по классам

    Raises:
        HTTPException: Если сессия не найдена или нет данных для валидации
    """
    await get_session_or_404(session, session_id)

    result = await session.execute(
        select(TextAnalysis).where(
            TextAnalysis.session_id == session_id,
            TextAnalysis.true_label.isnot(None),
            TextAnalysis.pred_label.isnot(None),
        )
    )
    text_analyses: list[TextAnalysis] = result.scalars().all()

    if not text_analyses:
        raise HTTPException(
            status_code=400,
            detail="В сессии нет записей с true_label и pred_label для валидации",
        )

    y_true: list[int] = [ta.true_label for ta in text_analyses]
    y_pred: list[int] = [ta.pred_label for ta in text_analyses]

    if len(y_true) != len(y_pred):
        raise HTTPException(status_code=400, detail="Несоответствие количества меток")

    metrics: dict[str, Any] = metrics_service.calculate_macro_f1(y_true, y_pred)

    return ValidationResponse(
        macro_f1=metrics["macro_f1"],
        class_metrics=[ClassMetrics(**cm) for cm in metrics["class_metrics"]],
    )


@router.get("/export-csv", tags=["analysis"])
async def export_csv(
    session_id: int = Query(..., description="ID сессии для экспорта"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Экспортирует результаты анализа сессии в CSV формат.

    Возвращает CSV строку с колонками: text, pred_label, confidence,
    source (если есть), true_label (если есть).

    Args:
        session_id: ID сессии для экспорта
        session: Сессия БД

    Returns:
        Словарь с ключом 'csv' и CSV строкой в качестве значения

    Raises:
        HTTPException: Если сессия не найдена или нет данных для экспорта
    """
    await get_session_or_404(session, session_id)

    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses: list[TextAnalysis] = result.scalars().all()

    if not text_analyses:
        raise HTTPException(status_code=400, detail="В сессии нет данных для экспорта")

    export_data: list[dict[str, Any]] = [
        {
            "text": ta.text,
            "pred_label": ta.pred_label,
            "confidence": ta.confidence,
            **({"source": ta.source} if ta.source else {}),
            **({"true_label": ta.true_label} if ta.true_label is not None else {}),
        }
        for ta in text_analyses
    ]

    return {"csv": csv_service.export_to_csv(export_data)}


api_router: APIRouter = APIRouter()
api_router.include_router(router, prefix="")
