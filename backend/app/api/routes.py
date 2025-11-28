from datetime import datetime

import pandas as pd
from app.core.db import get_session
from app.models.analysis import AnalysisSession, TextAnalysis
from app.schemas.analysis import (
    BatchAnalysisResponse,
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

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check(
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Проверяет доступность API и подключения к базе данных."""
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "up"}


@router.post("/upload", response_model=CSVUploadResponse, tags=["analysis"])
async def upload_csv(
    file: UploadFile = File(
        ..., description="CSV файл с колонкой 'text' (опционально: 'source', 'label')"
    ),
    session: AsyncSession = Depends(get_session),
) -> CSVUploadResponse:
    """
    Загружает CSV файл и создает сессию анализа.

    CSV должен содержать обязательную колонку 'text'.
    Опциональные колонки: 'source', 'label' (true_label).
    """
    # Парсим CSV
    data = await csv_service.parse_csv(file)

    # Создаем сессию
    analysis_session = AnalysisSession(
        filename=file.filename or "unknown.csv",
        created_at=datetime.utcnow(),
    )
    session.add(analysis_session)
    await session.flush()  # Получаем ID сессии

    # Сохраняем данные в БД
    for row in data:
        text_analysis = TextAnalysis(
            session_id=analysis_session.id,
            text=str(row["text"]),
            pred_label=0,  # Пока не предсказано
            confidence=0.0,  # Пока не предсказано
            source=row.get("source"),
            true_label=int(row["label"])
            if "label" in row and pd.notna(row.get("label"))
            else None,
        )
        session.add(text_analysis)

    await session.commit()

    return CSVUploadResponse(
        session_id=analysis_session.id,
        filename=file.filename or "unknown.csv",
        rows_count=len(data),
    )


@router.post("/analyze", response_model=TextAnalysisResponse, tags=["analysis"])
async def analyze_text(
    request: TextAnalysisRequest,
) -> TextAnalysisResponse:
    """
    Анализирует тональность одного текста.

    Возвращает предсказанный класс (0, 1 или 2) и уверенность модели.
    """
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
    """
    # Проверяем существование сессии
    result = await session.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    analysis_session = result.scalar_one_or_none()

    if not analysis_session:
        raise HTTPException(
            status_code=404, detail=f"Сессия с ID {session_id} не найдена"
        )

    # Получаем все тексты из сессии
    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses = result.scalars().all()

    if not text_analyses:
        raise HTTPException(status_code=400, detail="В сессии нет текстов для анализа")

    # Подготавливаем тексты для батч-обработки
    texts = [ta.text for ta in text_analyses]

    # Выполняем батч-предсказания
    predictions = ml_service.predict_batch(texts)

    # Обновляем результаты в БД
    processed_count = 0
    for text_analysis, (label, confidence) in zip(text_analyses, predictions):
        text_analysis.pred_label = label
        text_analysis.confidence = confidence
        processed_count += 1

    await session.commit()

    return BatchAnalysisResponse(session_id=session_id, processed_count=processed_count)


@router.post("/validate", response_model=ValidationResponse, tags=["analysis"])
async def validate_session(
    session_id: int = Query(..., description="ID сессии для валидации"),
    session: AsyncSession = Depends(get_session),
) -> ValidationResponse:
    """
    Рассчитывает macro-F1 метрику для сессии.

    Использует true_label и pred_label из БД для расчета метрик по классам.
    """
    # Проверяем существование сессии
    result = await session.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    analysis_session = result.scalar_one_or_none()

    if not analysis_session:
        raise HTTPException(
            status_code=404, detail=f"Сессия с ID {session_id} не найдена"
        )

    # Получаем все записи с true_label и pred_label
    result = await session.execute(
        select(TextAnalysis).where(
            TextAnalysis.session_id == session_id,
            TextAnalysis.true_label.isnot(None),
            TextAnalysis.pred_label.isnot(None),
        )
    )
    text_analyses = result.scalars().all()

    if not text_analyses:
        raise HTTPException(
            status_code=400,
            detail="В сессии нет записей с true_label и pred_label для валидации",
        )

    # Извлекаем метки
    y_true = [ta.true_label for ta in text_analyses if ta.true_label is not None]
    y_pred = [ta.pred_label for ta in text_analyses if ta.pred_label is not None]

    if len(y_true) != len(y_pred):
        raise HTTPException(status_code=400, detail="Несоответствие количества меток")

    # Рассчитываем метрики
    metrics = metrics_service.calculate_macro_f1(y_true, y_pred)

    # Формируем ответ
    from app.schemas.analysis import ClassMetrics

    class_metrics = [ClassMetrics(**cm) for cm in metrics["class_metrics"]]

    return ValidationResponse(
        macro_f1=metrics["macro_f1"],
        class_metrics=class_metrics,
    )


@router.get("/export-csv", tags=["analysis"])
async def export_csv(
    session_id: int = Query(..., description="ID сессии для экспорта"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Экспортирует результаты анализа сессии в CSV формат.

    Возвращает CSV строку с колонками: text, pred_label, confidence, source (если есть), true_label (если есть).
    """
    # Проверяем существование сессии
    result = await session.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    analysis_session = result.scalar_one_or_none()

    if not analysis_session:
        raise HTTPException(
            status_code=404, detail=f"Сессия с ID {session_id} не найдена"
        )

    # Получаем все записи анализа
    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses = result.scalars().all()

    if not text_analyses:
        raise HTTPException(status_code=400, detail="В сессии нет данных для экспорта")

    # Формируем данные для экспорта
    export_data = []
    for ta in text_analyses:
        row = {
            "text": ta.text,
            "pred_label": ta.pred_label,
            "confidence": ta.confidence,
        }
        if ta.source:
            row["source"] = ta.source
        if ta.true_label is not None:
            row["true_label"] = ta.true_label
        export_data.append(row)

    # Экспортируем в CSV
    csv_content = csv_service.export_to_csv(export_data)

    return {"csv": csv_content}


api_router = APIRouter()
api_router.include_router(router, prefix="")
