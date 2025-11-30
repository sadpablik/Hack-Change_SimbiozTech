import json
import uuid
from datetime import datetime
from typing import Any

from app.services.csv_service import csv_service
from app.services.minio_service import minio_service


class StorageService:
    @classmethod
    def save_predictions(cls, predictions: list[dict[str, Any]], processing_time: float | None = None) -> str:
        prediction_id = str(uuid.uuid4())
        csv_content = csv_service.export_to_csv(predictions, include_proba=True)
        object_name = f"predictions/{prediction_id}.csv"
        minio_service.save_file(object_name, csv_content)
        
        if processing_time is not None:
            metadata = {
                "prediction_id": prediction_id,
                "processing_time": processing_time,
                "rows_count": len(predictions),
                "created_at": datetime.utcnow().isoformat(),
            }
            metadata_object_name = f"predictions/{prediction_id}.meta.json"
            metadata_content = json.dumps(metadata, ensure_ascii=False, indent=2)
            try:
                minio_service.save_file(metadata_object_name, metadata_content)
            except Exception:
                pass
        
        return prediction_id

    @classmethod
    def get_predictions(cls, prediction_id: str) -> list[dict[str, Any]] | None:
        return None

    @classmethod
    def get_csv(cls, prediction_id: str, include_proba: bool = False) -> str | None:
        object_name = f"predictions/{prediction_id}.csv"
        content = minio_service.get_file(object_name)
        if content is None:
            return None
        return content.decode("utf-8")

    @classmethod
    def list_predictions(cls) -> list[dict[str, Any]]:
        files = minio_service.list_files(prefix="predictions/")
        result = []
        for file_info in files:
            object_name = file_info["object_name"]
            if not object_name.endswith(".csv"):
                continue
            prediction_id = object_name.replace("predictions/", "").replace(".csv", "")
            rows_count = 0
            processing_time = None
            
            metadata_object_name = f"predictions/{prediction_id}.meta.json"
            metadata_content = minio_service.get_file(metadata_object_name)
            if metadata_content:
                try:
                    metadata = json.loads(metadata_content.decode("utf-8"))
                    rows_count = metadata.get("rows_count", 0)
                    processing_time = metadata.get("processing_time")
                    created_at = metadata.get("created_at", file_info.get("last_modified", datetime.utcnow().isoformat()))
                except (json.JSONDecodeError, KeyError):
                    created_at = file_info.get("last_modified", datetime.utcnow().isoformat())
            else:
                created_at = file_info.get("last_modified", datetime.utcnow().isoformat())
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
                    "created_at": created_at,
                    "rows_count": rows_count,
                    "processing_time": processing_time,
                }
            )
        return sorted(result, key=lambda x: x["created_at"], reverse=True)

    @classmethod
    def save_validation(cls, validation_data: dict[str, Any]) -> str:
        validation_id = str(uuid.uuid4())
        json_content = json.dumps(validation_data, ensure_ascii=False, indent=2)
        object_name = f"validations/{validation_id}.json"
        try:
            minio_service.save_file(object_name, json_content)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error saving validation to MinIO: {str(e)}", exc_info=True)
        return validation_id

    @classmethod
    def get_validation(cls, validation_id: str) -> dict[str, Any] | None:
        object_name = f"validations/{validation_id}.json"
        content = minio_service.get_file(object_name)
        if content is None:
            return None
        try:
            return json.loads(content.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    @classmethod
    def list_validations(cls) -> list[dict[str, Any]]:
        files = minio_service.list_files(prefix="validations/")
        result = []
        for file_info in files:
            object_name = file_info["object_name"]
            validation_id = object_name.replace("validations/", "").replace(".json", "")
            validation_data = cls.get_validation(validation_id)
            rows_count = validation_data.get("rows_count", 0) if validation_data else 0
            processing_time = validation_data.get("processing_time") if validation_data else None
            result.append(
                {
                    "validation_id": validation_id,
                    "created_at": validation_data.get("created_at", file_info.get(
                        "last_modified", datetime.utcnow().isoformat()
                    )) if validation_data else file_info.get(
                        "last_modified", datetime.utcnow().isoformat()
                    ),
                    "rows_count": rows_count,
                    "macro_f1": validation_data.get("macro_f1", 0.0)
                    if validation_data
                    else 0.0,
                    "processing_time": processing_time,
                }
            )
        return sorted(result, key=lambda x: x["created_at"], reverse=True)

    @classmethod
    def cleanup_old(cls, max_age_hours: int = 24) -> None:
        files = minio_service.list_files(prefix="predictions/")
        validation_files = minio_service.list_files(prefix="validations/")
        now = datetime.utcnow()
        for file_info in files + validation_files:
            if file_info.get("last_modified"):
                try:
                    last_modified = datetime.fromisoformat(file_info["last_modified"])
                    age_hours = (now - last_modified).total_seconds() / 3600
                    if age_hours > max_age_hours:
                        minio_service.delete_file(file_info["object_name"])
                except (ValueError, TypeError):
                    continue


storage_service: StorageService = StorageService()
