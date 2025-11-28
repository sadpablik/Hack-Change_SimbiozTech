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
    ResultsListResponse,
    SessionInfo,
    SessionsListResponse,
    SessionStatsResponse,
    TextAnalysisRequest,
    TextAnalysisResponse,
    TextAnalysisResult,
    ValidationResponse,
)
from app.services.csv_service import csv_service
from app.services.metrics_service import metrics_service
from app.services.ml_service import ml_service
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import func, select, text
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


@router.get("/sessions", response_model=SessionsListResponse, tags=["dashboard"])
async def list_sessions(
    limit: int = Query(10, ge=1, le=100, description="Количество сессий на страницу"),
    offset: int = Query(0, ge=0, description="Смещение для пагинации"),
    session: AsyncSession = Depends(get_session),
) -> SessionsListResponse:
    """
    Получает список всех сессий анализа с пагинацией.

    Args:
        limit: Количество сессий на страницу (1-100)
        offset: Смещение для пагинации
        session: Сессия БД

    Returns:
        SessionsListResponse: Список сессий с метаданными пагинации
    """
    total_result = await session.execute(select(func.count(AnalysisSession.id)))
    total: int = total_result.scalar_one()

    result = await session.execute(
        select(AnalysisSession)
        .order_by(AnalysisSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions: list[AnalysisSession] = result.scalars().all()

    sessions_info: list[SessionInfo] = []
    for sess in sessions:
        texts_count_result = await session.execute(
            select(func.count(TextAnalysis.id)).where(
                TextAnalysis.session_id == sess.id
            )
        )
        texts_count: int = texts_count_result.scalar_one()

        avg_conf_result = await session.execute(
            select(func.avg(TextAnalysis.confidence)).where(
                TextAnalysis.session_id == sess.id,
                TextAnalysis.confidence > 0,
            )
        )
        avg_confidence: float | None = avg_conf_result.scalar_one()

        sessions_info.append(
            SessionInfo(
                id=sess.id,
                filename=sess.filename,
                created_at=sess.created_at.isoformat(),
                texts_count=texts_count,
                avg_confidence=round(avg_confidence, 4) if avg_confidence else None,
            )
        )

    return SessionsListResponse(
        sessions=sessions_info, total=total, limit=limit, offset=offset
    )


@router.get(
    "/sessions/{session_id}/stats",
    response_model=SessionStatsResponse,
    tags=["dashboard"],
)
async def get_session_stats(
    session_id: int,
    session: AsyncSession = Depends(get_session),
) -> SessionStatsResponse:
    """
    Получает детальную статистику по сессии.

    Args:
        session_id: ID сессии
        session: Сессия БД

    Returns:
        SessionStatsResponse: Детальная статистика по сессии

    Raises:
        HTTPException: Если сессия не найдена
    """
    analysis_session: AnalysisSession = await get_session_or_404(session, session_id)

    total_result = await session.execute(
        select(func.count(TextAnalysis.id)).where(TextAnalysis.session_id == session_id)
    )
    total_texts: int = total_result.scalar_one()

    analyzed_result = await session.execute(
        select(func.count(TextAnalysis.id)).where(
            TextAnalysis.session_id == session_id,
            TextAnalysis.confidence > 0,
        )
    )
    analyzed_texts: int = analyzed_result.scalar_one()

    conf_stats_result = await session.execute(
        select(
            func.avg(TextAnalysis.confidence),
            func.min(TextAnalysis.confidence),
            func.max(TextAnalysis.confidence),
        ).where(
            TextAnalysis.session_id == session_id,
            TextAnalysis.confidence > 0,
        )
    )
    conf_stats = conf_stats_result.first()
    avg_confidence: float | None = (
        round(float(conf_stats[0]), 4) if conf_stats[0] else None
    )
    min_confidence: float | None = (
        round(float(conf_stats[1]), 4) if conf_stats[1] else None
    )
    max_confidence: float | None = (
        round(float(conf_stats[2]), 4) if conf_stats[2] else None
    )

    class_dist_result = await session.execute(
        select(TextAnalysis.pred_label, func.count(TextAnalysis.id))
        .where(TextAnalysis.session_id == session_id)
        .group_by(TextAnalysis.pred_label)
    )
    class_distribution: dict[int, int] = {0: 0, 1: 0, 2: 0}
    for label, count in class_dist_result.all():
        class_distribution[label] = count

    source_dist_result = await session.execute(
        select(TextAnalysis.source, func.count(TextAnalysis.id))
        .where(
            TextAnalysis.session_id == session_id,
            TextAnalysis.source.isnot(None),
        )
        .group_by(TextAnalysis.source)
    )
    source_distribution: dict[str, int] | None = None
    source_data = source_dist_result.all()
    if source_data:
        source_distribution = {source: count for source, count in source_data}

    return SessionStatsResponse(
        session_id=analysis_session.id,
        filename=analysis_session.filename,
        created_at=analysis_session.created_at.isoformat(),
        total_texts=total_texts,
        analyzed_texts=analyzed_texts,
        avg_confidence=avg_confidence,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
        class_distribution=class_distribution,
        source_distribution=source_distribution,
    )


@router.get(
    "/sessions/{session_id}/results",
    response_model=ResultsListResponse,
    tags=["dashboard"],
)
async def get_session_results(
    session_id: int,
    limit: int = Query(
        50, ge=1, le=500, description="Количество результатов на страницу"
    ),
    offset: int = Query(0, ge=0, description="Смещение для пагинации"),
    pred_label: int
    | None = Query(None, ge=0, le=2, description="Фильтр по предсказанному классу"),
    min_confidence: float
    | None = Query(None, ge=0.0, le=1.0, description="Минимальная уверенность"),
    max_confidence: float
    | None = Query(None, ge=0.0, le=1.0, description="Максимальная уверенность"),
    source: str | None = Query(None, description="Фильтр по источнику"),
    search: str | None = Query(None, description="Поиск по тексту"),
    session: AsyncSession = Depends(get_session),
) -> ResultsListResponse:
    """
    Получает результаты анализа сессии с фильтрацией и поиском.

    Args:
        session_id: ID сессии
        limit: Количество результатов на страницу (1-500)
        offset: Смещение для пагинации
        pred_label: Фильтр по предсказанному классу (0, 1, 2)
        min_confidence: Минимальная уверенность
        max_confidence: Максимальная уверенность
        source: Фильтр по источнику
        search: Поиск по тексту (подстрока)
        session: Сессия БД

    Returns:
        ResultsListResponse: Список результатов с метаданными пагинации

    Raises:
        HTTPException: Если сессия не найдена
    """
    await get_session_or_404(session, session_id)

    query = select(TextAnalysis).where(TextAnalysis.session_id == session_id)

    if pred_label is not None:
        query = query.where(TextAnalysis.pred_label == pred_label)

    if min_confidence is not None:
        query = query.where(TextAnalysis.confidence >= min_confidence)

    if max_confidence is not None:
        query = query.where(TextAnalysis.confidence <= max_confidence)

    if source is not None:
        query = query.where(TextAnalysis.source == source)

    if search is not None:
        query = query.where(TextAnalysis.text.ilike(f"%{search}%"))

    total_result = await session.execute(
        select(func.count()).select_from(query.subquery())
    )
    total: int = total_result.scalar_one()

    query = query.order_by(TextAnalysis.id).limit(limit).offset(offset)

    result = await session.execute(query)
    text_analyses: list[TextAnalysis] = result.scalars().all()

    results_list: list[TextAnalysisResult] = [
        TextAnalysisResult(
            id=ta.id,
            text=ta.text,
            pred_label=ta.pred_label,
            confidence=ta.confidence,
            source=ta.source,
            true_label=ta.true_label,
        )
        for ta in text_analyses
    ]

    return ResultsListResponse(
        results=results_list, total=total, limit=limit, offset=offset
    )


@router.get("/export-json", tags=["analysis"])
async def export_json(
    session_id: int = Query(..., description="ID сессии для экспорта"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """
    Экспортирует результаты анализа сессии в JSON формат.

    Args:
        session_id: ID сессии для экспорта
        session: Сессия БД

    Returns:
        Словарь с данными в JSON формате

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
            "id": ta.id,
            "text": ta.text,
            "pred_label": ta.pred_label,
            "confidence": ta.confidence,
            "source": ta.source,
            "true_label": ta.true_label,
        }
        for ta in text_analyses
    ]

    return {"data": export_data, "count": len(export_data)}


@router.put("/results/{result_id}", tags=["analysis"])
async def update_result(
    result_id: int,
    true_label: int = Query(..., ge=0, le=2, description="Истинная метка класса"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Обновляет истинную метку для результата анализа.

    Args:
        result_id: ID результата анализа
        true_label: Истинная метка класса (0, 1, или 2)
        session: Сессия БД

    Returns:
        Словарь с сообщением об успехе

    Raises:
        HTTPException: Если результат не найден
    """
    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.id == result_id)
    )
    text_analysis: TextAnalysis | None = result.scalar_one_or_none()

    if not text_analysis:
        raise HTTPException(
            status_code=404, detail=f"Результат с ID {result_id} не найден"
        )

    text_analysis.true_label = true_label
    await session.commit()

    return {"message": "Метка успешно обновлена"}


api_router: APIRouter = APIRouter()
api_router.include_router(router, prefix="")
