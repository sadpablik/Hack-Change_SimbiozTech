"""Pydantic schemas for sentiment analysis."""

from pydantic import BaseModel, Field


class TextAnalysisRequest(BaseModel):
    """Single text analysis request."""

    text: str = Field(..., description="Text for sentiment analysis")


class TextAnalysisResponse(BaseModel):
    """Single text analysis response."""

    label: int = Field(..., description="Predicted class (0, 1, or 2)", ge=0, le=2)
    confidence: float = Field(..., description="Model confidence", ge=0.0, le=1.0)


class CSVUploadResponse(BaseModel):
    """CSV upload response."""

    session_id: int = Field(..., description="Upload session ID")
    filename: str = Field(..., description="Uploaded filename")
    rows_count: int = Field(..., description="Number of rows in CSV")


class BatchAnalysisResponse(BaseModel):
    """Batch analysis response."""

    session_id: int = Field(..., description="Session ID")
    processed_count: int = Field(..., description="Number of processed texts")


class ClassMetrics(BaseModel):
    """Metrics for a single class."""

    class_label: int = Field(..., description="Class label (0, 1, or 2)", ge=0, le=2)
    precision: float = Field(..., description="Precision for the class")
    recall: float = Field(..., description="Recall for the class")
    f1: float = Field(..., description="F1-score for the class")


class ValidationResponse(BaseModel):
    """Validation response with macro-F1 metric."""

    macro_f1: float = Field(..., description="Macro-F1 metric")
    class_metrics: list[ClassMetrics] = Field(
        ..., description="Per-class detailed metrics"
    )


class SessionInfo(BaseModel):
    """Информация о сессии анализа."""

    id: int = Field(..., description="ID сессии")
    filename: str = Field(..., description="Имя файла")
    created_at: str = Field(..., description="Дата создания (ISO format)")
    texts_count: int = Field(..., description="Количество текстов в сессии")
    avg_confidence: float | None = Field(None, description="Средняя уверенность модели")


class SessionsListResponse(BaseModel):
    """Ответ со списком сессий."""

    sessions: list[SessionInfo] = Field(..., description="Список сессий")
    total: int = Field(..., description="Общее количество сессий")
    limit: int = Field(..., description="Лимит на страницу")
    offset: int = Field(..., description="Смещение")


class SessionStatsResponse(BaseModel):
    """Статистика по сессии."""

    session_id: int = Field(..., description="ID сессии")
    filename: str = Field(..., description="Имя файла")
    created_at: str = Field(..., description="Дата создания")
    total_texts: int = Field(..., description="Общее количество текстов")
    analyzed_texts: int = Field(
        ..., description="Количество проанализированных текстов"
    )
    avg_confidence: float | None = Field(None, description="Средняя уверенность модели")
    min_confidence: float | None = Field(None, description="Минимальная уверенность")
    max_confidence: float | None = Field(None, description="Максимальная уверенность")
    class_distribution: dict[int, int] = Field(
        ..., description="Распределение по классам: {0: count, 1: count, 2: count}"
    )
    source_distribution: dict[str, int] | None = Field(
        None, description="Распределение по источникам (если есть)"
    )


class TextAnalysisResult(BaseModel):
    """Результат анализа текста для списка."""

    id: int = Field(..., description="ID записи")
    text: str = Field(..., description="Текст")
    pred_label: int = Field(..., description="Предсказанный класс")
    confidence: float = Field(..., description="Уверенность")
    source: str | None = Field(None, description="Источник")
    true_label: int | None = Field(None, description="Истинный класс")


class ResultsListResponse(BaseModel):
    """Ответ со списком результатов."""

    results: list[TextAnalysisResult] = Field(..., description="Список результатов")
    total: int = Field(..., description="Общее количество результатов")
    limit: int = Field(..., description="Лимит на страницу")
    offset: int = Field(..., description="Смещение")


class PredictResponse(BaseModel):
    status: str = Field("ok", description="Статус операции")
    rows: int = Field(..., description="Количество строк")
    download_url: str = Field(..., description="URL для скачивания CSV")
    skipped_rows: int = Field(0, description="Количество пропущенных строк")
    warning: str | None = Field(
        None, description="Предупреждение о пропущенных строках"
    )


class PreprocessRequest(BaseModel):
    text: str = Field(..., description="Текст для предобработки")


class PreprocessResponse(BaseModel):
    original: str = Field(..., description="Исходный текст")
    normalized: str = Field(..., description="Нормализованный текст")
    tokens: list[str] = Field(..., description="Токены")
    lemmas: list[str] = Field(..., description="Леммы")
    entities: list[dict] = Field(..., description="Именованные сущности")


class ModelStatusResponse(BaseModel):
    model_version: str = Field(..., description="Версия модели")
    status: str = Field(..., description="Статус модели")
    last_updated: str = Field(..., description="Дата последнего обновления")
    implementation: str = Field(..., description="Реализация модели")
