from pydantic import BaseModel, Field


class TextAnalysisRequest(BaseModel):
    text: str = Field(..., description="Text for sentiment analysis")


class TextAnalysisResponse(BaseModel):
    label: int = Field(..., description="Predicted class (0, 1, or 2)", ge=0, le=2)
    confidence: float = Field(..., description="Model confidence", ge=0.0, le=1.0)


class CSVUploadResponse(BaseModel):
    session_id: int = Field(..., description="Upload session ID")
    filename: str = Field(..., description="Uploaded filename")
    rows_count: int = Field(..., description="Number of rows in CSV")


class BatchAnalysisResponse(BaseModel):
    session_id: int = Field(..., description="Session ID")
    processed_count: int = Field(..., description="Number of processed texts")


class ClassMetrics(BaseModel):
    class_label: int = Field(..., description="Class label (0, 1, or 2)", ge=0, le=2)
    precision: float = Field(..., description="Precision for the class")
    recall: float = Field(..., description="Recall for the class")
    f1: float = Field(..., description="F1-score for the class")


class ValidationResponse(BaseModel):
    macro_f1: float = Field(..., description="Macro-F1 metric")
    class_metrics: list[ClassMetrics] = Field(..., description="Per-class detailed metrics")
    validation_id: str | None = Field(None, description="Validation ID for saving results")
    processing_time: float | None = Field(None, description="Processing time in seconds")