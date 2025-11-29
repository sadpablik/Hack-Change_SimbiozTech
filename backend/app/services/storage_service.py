"""Сервис для хранения предсказаний в MinIO."""

import uuid
from datetime import datetime
from typing import Any

from app.services.csv_service import csv_service
from app.services.minio_service import minio_service


class StorageService:
    @classmethod
    def save_predictions(cls, predictions: list[dict[str, Any]]) -> str:
        """Сохраняет предсказания в MinIO и возвращает prediction_id."""
        prediction_id = str(uuid.uuid4())
        csv_content = csv_service.export_to_csv(predictions, include_proba=True)
        object_name = f"predictions/{prediction_id}.csv"
        minio_service.save_file(object_name, csv_content)
        return prediction_id

    @classmethod
    def get_predictions(cls, prediction_id: str) -> list[dict[str, Any]] | None:
        """Получает предсказания из MinIO (не используется, оставлено для совместимости)."""
        return None

    @classmethod
    def get_csv(cls, prediction_id: str, include_proba: bool = False) -> str | None:
        """Получает CSV файл из MinIO."""
        object_name = f"predictions/{prediction_id}.csv"
        content = minio_service.get_file(object_name)
        if content is None:
            return None
        return content.decode("utf-8")

    @classmethod
    def list_predictions(cls) -> list[dict[str, Any]]:
        """Возвращает список всех предсказаний с метаданными из MinIO."""
        files = minio_service.list_files(prefix="predictions/")
        result = []
        for file_info in files:
            object_name = file_info["object_name"]
            prediction_id = object_name.replace("predictions/", "").replace(".csv", "")
            rows_count = 0
            if file_info.get("size", 0) > 0:
                csv_content = minio_service.get_file(object_name)
                if csv_content:
                    lines = csv_content.decode("utf-8").split("\n")
                    rows_count = max(
                        0, len([line for line in lines if line.strip()]) - 1
                    )
            result.append(
                {
                    "prediction_id": prediction_id,
                    "created_at": file_info.get(
                        "last_modified", datetime.utcnow().isoformat()
                    ),
                    "rows_count": rows_count,
                }
            )
        return sorted(result, key=lambda x: x["created_at"], reverse=True)

    @classmethod
    def cleanup_old(cls, max_age_hours: int = 24) -> None:
        """Удаляет старые файлы из MinIO."""
        files = minio_service.list_files(prefix="predictions/")
        now = datetime.utcnow()
        for file_info in files:
            if file_info.get("last_modified"):
                try:
                    last_modified = datetime.fromisoformat(file_info["last_modified"])
                    age_hours = (now - last_modified).total_seconds() / 3600
                    if age_hours > max_age_hours:
                        minio_service.delete_file(file_info["object_name"])
                except (ValueError, TypeError):
                    continue


storage_service: StorageService = StorageService()
