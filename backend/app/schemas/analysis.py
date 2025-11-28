"""Pydantic-схемы для анализа тональности."""

from pydantic import BaseModel, Field


class TextAnalysisRequest(BaseModel):
    """Запрос на анализ одного текста."""

    text: str = Field(..., description="Текст для анализа тональности")


class TextAnalysisResponse(BaseModel):
    """Ответ с результатом анализа одного текста."""

    label: int = Field(..., description="Предсказанный класс (0, 1 или 2)", ge=0, le=2)
    confidence: float = Field(..., description="Уверенность модели", ge=0.0, le=1.0)


class CSVUploadResponse(BaseModel):
    """Ответ на загрузку CSV файла."""

    session_id: int = Field(..., description="ID сессии загрузки")
    filename: str = Field(..., description="Имя загруженного файла")
    rows_count: int = Field(..., description="Количество строк в CSV")


class BatchAnalysisResponse(BaseModel):
    """Ответ на батч-обработку CSV."""

    session_id: int = Field(..., description="ID сессии")
    processed_count: int = Field(..., description="Количество обработанных текстов")


class ClassMetrics(BaseModel):
    """Метрики для одного класса."""

    class_label: int = Field(..., description="Класс (0, 1 или 2)", ge=0, le=2)
    precision: float = Field(..., description="Precision для класса")
    recall: float = Field(..., description="Recall для класса")
    f1: float = Field(..., description="F1-score для класса")


class ValidationResponse(BaseModel):
    """Ответ с результатами валидации (macro-F1)."""

    macro_f1: float = Field(..., description="Macro-F1 метрика")
    class_metrics: list[ClassMetrics] = Field(
        ..., description="Детальные метрики по классам"
    )
