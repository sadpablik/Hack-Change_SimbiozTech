"""ML API сервис для анализа тональности текста."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import uvicorn
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Импорт функций предсказания (модель загрузится при импорте)
try:
    from inference import predict, predict_batch
    logger.info("ML model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load ML model: {e}")
    raise

app = FastAPI(
    title="ML Sentiment Analysis Service",
    description="Сервис для анализа тональности текста с использованием RuBERT",
    version="1.0.0"
)


class TextRequest(BaseModel):
    """Запрос для анализа одного текста."""
    text: str


class BatchTextRequest(BaseModel):
    """Запрос для анализа нескольких текстов."""
    texts: List[str]


class PredictionResponse(BaseModel):
    """Ответ с результатом предсказания."""
    label: int
    label_name: str
    confidence: float
    probabilities: dict[str, float]


class BatchPredictionResponse(BaseModel):
    """Ответ с результатами батч-предсказаний."""
    results: List[PredictionResponse]


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса."""
    try:
        # Проверяем, что модель работает, делая тестовое предсказание
        test_result = predict("Тест")
        return {
            "status": "ok",
            "service": "ml-sentiment-analysis",
            "model_loaded": True
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "service": "ml-sentiment-analysis",
            "model_loaded": False,
            "error": str(e)
        }


@app.post("/predict", response_model=PredictionResponse)
async def predict_single(request: TextRequest):
    """Предсказание тональности для одного текста."""
    try:
        result = predict(request.text)
        return PredictionResponse(
            label=result['label'],
            label_name=result['label_name'],
            confidence=result['confidence'],
            probabilities=result['probabilities']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/predict-batch", response_model=BatchPredictionResponse)
async def predict_batch_endpoint(request: BatchTextRequest):
    """Предсказание тональности для нескольких текстов."""
    try:
        import time
        start_time = time.time()
        logger.info(f"Processing batch of {len(request.texts)} texts")
        results = predict_batch(request.texts)
        elapsed = time.time() - start_time
        logger.info(f"Batch processing completed in {elapsed:.2f} seconds ({elapsed/len(request.texts)*1000:.2f}ms per text)")
        return BatchPredictionResponse(
            results=[
                PredictionResponse(
                    label=r['label'],
                    label_name=r['label_name'],
                    confidence=r['confidence'],
                    probabilities=r['probabilities']
                )
                for r in results
            ]
        )
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

