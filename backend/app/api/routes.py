from typing import Any
from datetime import datetime

from app.core.config import settings
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
from app.services.metrics_service import metrics_service
from app.services.ml_service import (
    analyze_single_text,
    analyze_batch_texts,
)
from app.services.csv_service import csv_service
from app.services.storage_service import storage_service
from app.services.text_preprocessing import text_preprocessing_service
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

router: APIRouter = APIRouter()


async def get_session_or_404(session: AsyncSession, session_id: int) -> AnalysisSession:
    result = await session.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    analysis_session: AnalysisSession | None = result.scalar_one_or_none()
    if not analysis_session:
        raise HTTPException(
            status_code=404, detail=f"Session with ID {session_id} not found"
        )
    return analysis_session


@router.get("/health", tags=["health"])
async def health_check(
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "up"}


@router.post("/analyze", response_model=TextAnalysisResponse, tags=["analysis"])
async def analyze_text(
    request: TextAnalysisRequest,
) -> TextAnalysisResponse:
    result = await analyze_single_text(request.text)
    return TextAnalysisResponse(
        label=result['label'],
        confidence=result['confidence']
    )


@router.post("/batch-analyze", response_model=BatchAnalysisResponse, tags=["analysis"])
async def batch_analyze(
    session_id: int = Query(..., description="Session ID"),
    session: AsyncSession = Depends(get_session),
) -> BatchAnalysisResponse:
    await get_session_or_404(session, session_id)

    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses: list[TextAnalysis] = result.scalars().all()

    if not text_analyses:
        raise HTTPException(status_code=400, detail="No texts in session")

    texts: list[str] = [ta.text for ta in text_analyses]
    predictions = await analyze_batch_texts(texts)

    for text_analysis, pred_result in zip(text_analyses, predictions):
        text_analysis.pred_label = pred_result['label']
        text_analysis.confidence = pred_result['confidence']

    await session.commit()

    return BatchAnalysisResponse(
        session_id=session_id, processed_count=len(text_analyses)
    )


@router.post("/validate", response_model=ValidationResponse, tags=["validation"])
async def validate_csv(
    file: UploadFile | None = File(default=None),
    session_id: int | None = Query(default=None, description="Session ID for validation"),
    enable_preprocessing: bool = Query(True, description="Enable text preprocessing"),
    session: AsyncSession = Depends(get_session),
) -> ValidationResponse:
    import time
    start_time = time.time()
    
    if session_id is not None:
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
                detail="No rows with true_label and pred_label",
            )

        y_true: list[int] = [ta.true_label for ta in text_analyses]
        y_pred: list[int] = [ta.pred_label for ta in text_analyses]

        if len(y_true) != len(y_pred):
            raise HTTPException(status_code=400, detail="Label count mismatch")

        metrics: dict[str, Any] = metrics_service.calculate_macro_f1(y_true, y_pred)
        
        validation_data = {
            "macro_f1": metrics["macro_f1"],
            "class_metrics": metrics["class_metrics"],
            "rows_count": len(text_analyses),
            "skipped_rows": 0,
            "created_at": datetime.utcnow().isoformat(),
        }
        validation_id = storage_service.save_validation(validation_data)
        
        processing_time = time.time() - start_time

        return ValidationResponse(
            macro_f1=metrics["macro_f1"],
            class_metrics=[ClassMetrics(**cm) for cm in metrics["class_metrics"]],
            validation_id=validation_id,
            processing_time=round(processing_time, 2),
        )
    
    if file is None:
        raise HTTPException(status_code=400, detail="Either file or session_id must be provided")
    
    data, skipped_rows = await csv_service.parse_csv(file, require_label=True)
    
    if not data:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    
    texts = []
    true_labels = []
    for record in data:
        if "label" not in record or record["label"] is None:
            raise HTTPException(
                status_code=400,
                detail="All rows must have 'label' column for validation"
            )
        texts.append(record["text"])
        true_labels.append(record["label"])
    
    if len(texts) > settings.max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"Размер батча превышает максимальный ({settings.max_batch_size} строк)"
        )
    
    import logging
    import sys
    logger = logging.getLogger(__name__)
    print(f"[VALIDATE] Starting validation for {len(texts)} texts", file=sys.stderr, flush=True)
    print(f"[VALIDATE] Enable preprocessing: {enable_preprocessing}", file=sys.stderr, flush=True)
    logger.info(f"Starting validation for {len(texts)} texts, preprocessing={enable_preprocessing}")
    
    if enable_preprocessing:
        preprocessed = text_preprocessing_service.preprocess_batch(texts)
        if len(preprocessed) != len(texts):
            raise HTTPException(
                status_code=500,
                detail=f"Preprocessing changed data length: {len(texts)} -> {len(preprocessed)}"
            )
        texts = [item["normalized"] for item in preprocessed]
        print(f"[VALIDATE] Texts preprocessed, length: {len(texts)}", file=sys.stderr, flush=True)
    
    try:
        print(f"[VALIDATE] Calling analyze_batch_texts for {len(texts)} texts...", file=sys.stderr, flush=True)
        print(f"[VALIDATE] True labels: {true_labels}", file=sys.stderr, flush=True)
        print(f"[VALIDATE] Number of texts: {len(texts)}, Number of labels: {len(true_labels)}", file=sys.stderr, flush=True)
        predictions = await analyze_batch_texts(texts)
        pred_labels = [pred['label'] for pred in predictions]
        print(f"[VALIDATE] Predicted labels: {pred_labels}", file=sys.stderr, flush=True)
        print(f"[VALIDATE] Number of predictions: {len(pred_labels)}", file=sys.stderr, flush=True)
        print(f"[VALIDATE] Predictions completed, calculating metrics", file=sys.stderr, flush=True)
        logger.info(f"Predictions completed, calculating metrics")
        
        if len(true_labels) != len(pred_labels):
            raise HTTPException(
                status_code=500,
                detail=f"Label count mismatch: true_labels={len(true_labels)}, pred_labels={len(pred_labels)}"
            )
        
        metrics: dict[str, Any] = metrics_service.calculate_macro_f1(true_labels, pred_labels)
        print(f"[VALIDATE] Metrics calculated: macro_f1={metrics['macro_f1']}", file=sys.stderr, flush=True)
        logger.info(f"Metrics calculated: macro_f1={metrics['macro_f1']}")
        
        validation_data = {
            "macro_f1": metrics["macro_f1"],
            "class_metrics": metrics["class_metrics"],
            "rows_count": len(data),
            "skipped_rows": skipped_rows,
            "created_at": datetime.utcnow().isoformat(),
        }
        print(f"[VALIDATE] Saving validation to MinIO...", file=sys.stderr, flush=True)
        validation_id = storage_service.save_validation(validation_data)
        print(f"[VALIDATE] Validation saved with id: {validation_id}", file=sys.stderr, flush=True)
        logger.info(f"Validation saved with id: {validation_id}")
        
        processing_time = time.time() - start_time
        
        response = ValidationResponse(
            macro_f1=metrics["macro_f1"],
            class_metrics=[ClassMetrics(**cm) for cm in metrics["class_metrics"]],
            validation_id=validation_id,
            processing_time=round(processing_time, 2),
        )
        print(f"[VALIDATE] Returning validation response", file=sys.stderr, flush=True)
        logger.info(f"Returning validation response")
        return response
    except Exception as e:
        print(f"[VALIDATE] ERROR: {str(e)}", file=sys.stderr, flush=True)
        logger.error(f"Error during validation: {str(e)}", exc_info=True)
        raise


@router.post("/validate-session", response_model=ValidationResponse, tags=["analysis"])
async def validate_session(
    session_id: int = Query(..., description="Session ID for validation"),
    session: AsyncSession = Depends(get_session),
) -> ValidationResponse:
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
            detail="No rows with true_label and pred_label",
        )

    y_true: list[int] = [ta.true_label for ta in text_analyses]
    y_pred: list[int] = [ta.pred_label for ta in text_analyses]

    if len(y_true) != len(y_pred):
        raise HTTPException(status_code=400, detail="Label count mismatch")

    metrics: dict[str, Any] = metrics_service.calculate_macro_f1(y_true, y_pred)

    return ValidationResponse(
        macro_f1=metrics["macro_f1"],
        class_metrics=[ClassMetrics(**cm) for cm in metrics["class_metrics"]],
    )


@router.post("/upload", response_model=CSVUploadResponse, tags=["csv"])
async def upload_csv(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> CSVUploadResponse:
    data, skipped_rows = await csv_service.parse_csv(file, require_label=False)
    
    if not data:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    
    analysis_session = AnalysisSession(
        filename=file.filename or "unknown.csv",
        created_at=datetime.utcnow()
    )
    session.add(analysis_session)
    await session.flush()
    
    for record in data:
        text_analysis = TextAnalysis(
            session_id=analysis_session.id,
            text=record["text"],
            source=record.get("src"),
            true_label=record.get("label"),
        )
        session.add(text_analysis)
    
    await session.commit()
    
    return CSVUploadResponse(
        session_id=analysis_session.id,
        filename=file.filename or "unknown.csv",
        rows_count=len(data)
    )


@router.post("/predict", tags=["prediction"])
async def predict_csv(
    file: UploadFile = File(...),
    enable_preprocessing: bool = Query(True, description="Enable text preprocessing"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    import time
    start_time = time.time()
    
    data, skipped_rows = await csv_service.parse_csv(file, require_label=False)
    
    if not data:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    
    analysis_session = AnalysisSession(
        filename=file.filename or "unknown.csv",
        created_at=datetime.utcnow()
    )
    session.add(analysis_session)
    await session.flush()
    
    texts = [record["text"] for record in data]
    
    if len(texts) > settings.max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"Размер батча превышает максимальный ({settings.max_batch_size} строк)"
        )
    
    if enable_preprocessing:
        preprocessed = text_preprocessing_service.preprocess_batch(texts)
        texts = [item["normalized"] for item in preprocessed]
    
    predictions = await analyze_batch_texts(texts)
    
    chunk_size = 1000
    text_analyses = [
        TextAnalysis(
            session_id=analysis_session.id,
            text=record["text"],
            source=record.get("src"),
            true_label=record.get("label"),
            pred_label=pred_result['label'],
            confidence=pred_result['confidence'],
        )
        for record, pred_result in zip(data, predictions)
    ]
    
    for i in range(0, len(text_analyses), chunk_size):
        chunk = text_analyses[i:i + chunk_size]
        session.add_all(chunk)
        await session.flush()
    
    await session.commit()
    
    predictions_data = []
    for record, pred_result in zip(data, predictions):
        data_item = {
            "text": record["text"],
            "src": record.get("src"),
            "pred_label": pred_result['label'],
        }
        
        if 'probabilities' in pred_result and pred_result['probabilities']:
            try:
                probs = pred_result['probabilities']
                if isinstance(probs, dict):
                    if all(key in probs for key in ['нейтральная', 'положительная', 'негативная']):
                        prob_list = [
                            float(probs.get('нейтральная', 0.0)),
                            float(probs.get('положительная', 0.0)),
                            float(probs.get('негативная', 0.0))
                        ]
                        if any(p > 0.0 for p in prob_list):
                            data_item["pred_proba"] = prob_list
            except (KeyError, TypeError, AttributeError, ValueError) as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not extract probabilities: {e}, pred_result keys: {list(pred_result.keys())}")
        
        predictions_data.append(data_item)
    
    processing_time = time.time() - start_time
    prediction_id = storage_service.save_predictions(predictions_data, processing_time=round(processing_time, 2))
    
    return {
        "status": "success",
        "rows": len(data),
        "skipped_rows": skipped_rows,
        "download_url": f"/api/download/predicted/{prediction_id}",
        "warning": None if skipped_rows == 0 else f"Skipped {skipped_rows} rows with empty text",
        "processing_time": round(processing_time, 2)
    }


@router.get("/sessions", tags=["sessions"])
async def get_sessions(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    total_result = await session.execute(
        select(func.count(AnalysisSession.id))
    )
    total = total_result.scalar() or 0
    
    result = await session.execute(
        select(AnalysisSession)
        .order_by(AnalysisSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()
    
    return {
        "sessions": [
            {
                "id": s.id,
                "filename": s.filename,
                "created_at": s.created_at.isoformat(),
            }
            for s in sessions
        ],
        "total": total
    }


@router.get("/sessions/{session_id}/results", tags=["sessions"])
async def get_session_results(
    session_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    pred_label: int | None = Query(None, ge=0, le=2),
    min_confidence: float | None = Query(None, ge=0.0, le=1.0),
    max_confidence: float | None = Query(None, ge=0.0, le=1.0),
    source: str | None = Query(None),
    search: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await get_session_or_404(session, session_id)
    
    query = select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    
    if pred_label is not None:
        query = query.where(TextAnalysis.pred_label == pred_label)
    if min_confidence is not None:
        query = query.where(TextAnalysis.confidence >= min_confidence)
    if max_confidence is not None:
        query = query.where(TextAnalysis.confidence <= max_confidence)
    if source:
        query = query.where(TextAnalysis.source == source)
    if search:
        query = query.where(TextAnalysis.text.ilike(f"%{search}%"))
    
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0
    
    query = query.order_by(TextAnalysis.id).limit(limit).offset(offset)
    result = await session.execute(query)
    text_analyses = result.scalars().all()
    
    return {
        "results": [
            {
                "id": ta.id,
                "text": ta.text,
                "source": ta.source,
                "pred_label": ta.pred_label,
                "true_label": ta.true_label,
                "confidence": ta.confidence,
            }
            for ta in text_analyses
        ],
        "total": total
    }


@router.get("/sessions/{session_id}/stats", tags=["sessions"])
async def get_session_stats(
    session_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await get_session_or_404(session, session_id)
    
    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses = result.scalars().all()
    
    if not text_analyses:
        return {
            "session_id": session_id,
            "total": 0,
            "distribution": {},
            "avg_confidence": 0.0
        }
    
    distribution = {0: 0, 1: 0, 2: 0}
    total_confidence = 0.0
    
    for ta in text_analyses:
        if ta.pred_label is not None:
            distribution[ta.pred_label] = distribution.get(ta.pred_label, 0) + 1
        if ta.confidence is not None:
            total_confidence += ta.confidence
    
    return {
        "session_id": session_id,
        "total": len(text_analyses),
        "distribution": distribution,
        "avg_confidence": total_confidence / len(text_analyses) if text_analyses else 0.0
    }


@router.get("/predictions/list", tags=["predictions"])
async def list_predictions() -> dict[str, Any]:
    predictions = storage_service.list_predictions()
    return {
        "predictions": predictions,
        "total": len(predictions)
    }


@router.get("/validations/list", tags=["validations"])
async def list_validations() -> dict[str, Any]:
    validations = storage_service.list_validations()
    return {
        "validations": validations,
        "total": len(validations)
    }


@router.get("/download/predicted/{prediction_id}", tags=["download"])
async def download_prediction(prediction_id: str) -> Response:
    csv_content = storage_service.get_csv(prediction_id, include_proba=True)
    if not csv_content:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="prediction_{prediction_id}.csv"'}
    )


@router.get("/download/validation/{validation_id}", tags=["download"])
async def download_validation(validation_id: str) -> Response:
    validation_data = storage_service.get_validation(validation_id)
    if not validation_data:
        raise HTTPException(status_code=404, detail="Validation not found")
    
    import json
    json_content = json.dumps(validation_data, ensure_ascii=False, indent=2)
    
    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="validation_{validation_id}.json"'}
    )


@router.get("/export-csv", tags=["export"])
async def export_csv(
    session_id: int = Query(..., description="Session ID"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await get_session_or_404(session, session_id)
    
    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses = result.scalars().all()
    
    data = [
        {
            "text": ta.text,
            "src": ta.source,
            "pred_label": ta.pred_label,
        }
        for ta in text_analyses
    ]
    
    csv_content = csv_service.export_to_csv(data, include_proba=False)
    
    return {"csv": csv_content}


@router.get("/export-json", tags=["export"])
async def export_json(
    session_id: int = Query(..., description="Session ID"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await get_session_or_404(session, session_id)
    
    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.session_id == session_id)
    )
    text_analyses = result.scalars().all()
    
    data = [
        {
            "text": ta.text,
            "source": ta.source,
            "pred_label": ta.pred_label,
            "true_label": ta.true_label,
            "confidence": ta.confidence,
        }
        for ta in text_analyses
    ]
    
    return {"data": data, "count": len(data)}


@router.put("/results/{result_id}", tags=["results"])
async def update_result(
    result_id: int,
    true_label: int = Query(..., ge=0, le=2, description="True label"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    result = await session.execute(
        select(TextAnalysis).where(TextAnalysis.id == result_id)
    )
    text_analysis = result.scalar_one_or_none()
    
    if not text_analysis:
        raise HTTPException(status_code=404, detail="Result not found")
    
    text_analysis.true_label = true_label
    await session.commit()
    
    return {"status": "ok"}


api_router: APIRouter = APIRouter()
api_router.include_router(router)