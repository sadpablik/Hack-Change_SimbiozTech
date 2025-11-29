"""Сервис для хранения предсказаний в памяти."""

import uuid
from datetime import datetime
from typing import Any

from app.services.csv_service import csv_service


class StorageService:
    _storage: dict[str, dict[str, Any]] = {}

    @classmethod
    def save_predictions(cls, predictions: list[dict[str, Any]]) -> str:
        prediction_id = str(uuid.uuid4())
        cls._storage[prediction_id] = {
            "predictions": predictions,
            "created_at": datetime.utcnow().isoformat(),
        }
        return prediction_id

    @classmethod
    def get_predictions(cls, prediction_id: str) -> list[dict[str, Any]] | None:
        if prediction_id not in cls._storage:
            return None
        return cls._storage[prediction_id]["predictions"]

    @classmethod
    def get_csv(cls, prediction_id: str, include_proba: bool = False) -> str | None:
        predictions = cls.get_predictions(prediction_id)
        if predictions is None:
            return None
        return csv_service.export_to_csv(predictions, include_proba=include_proba)

    @classmethod
    def cleanup_old(cls, max_age_hours: int = 24) -> None:
        now = datetime.utcnow()
        to_delete = []
        for pred_id, data in cls._storage.items():
            created_at = datetime.fromisoformat(data["created_at"])
            age_hours = (now - created_at).total_seconds() / 3600
            if age_hours > max_age_hours:
                to_delete.append(pred_id)
        for pred_id in to_delete:
            del cls._storage[pred_id]


storage_service: StorageService = StorageService()
