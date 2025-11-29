"""Сервис для работы с MinIO объектным хранилищем."""

import io
from typing import Any

from app.core.config import settings
from minio import Minio
from minio.error import S3Error


class MinIOService:
    _client: Minio | None = None
    _bucket_name: str = "predictions"

    @classmethod
    def _get_client(cls) -> Minio:
        """Получает клиент MinIO."""
        if cls._client is None:
            try:
                cls._client = Minio(
                    settings.minio_endpoint,
                    access_key=settings.minio_access_key,
                    secret_key=settings.minio_secret_key,
                    secure=settings.minio_secure,
                )
                cls._ensure_bucket()
            except Exception as e:
                raise RuntimeError(
                    f"Ошибка подключения к MinIO: {e}. Проверьте, что MinIO запущен и доступен по адресу {settings.minio_endpoint}"
                )
        return cls._client

    @classmethod
    def _ensure_bucket(cls) -> None:
        """Создает bucket если его нет."""
        try:
            if not cls._client.bucket_exists(cls._bucket_name):
                cls._client.make_bucket(cls._bucket_name)
        except S3Error as e:
            if "BucketAlreadyOwnedByYou" not in str(e):
                raise RuntimeError(f"Ошибка создания bucket: {e}")
        except Exception as e:
            raise RuntimeError(f"Ошибка проверки bucket: {e}")

    @classmethod
    def save_file(
        cls, object_name: str, content: str | bytes, content_type: str | None = None
    ) -> str:
        """
        Сохраняет файл в MinIO.

        Args:
            object_name: Имя объекта в bucket
            content: Содержимое файла (строка или bytes)
            content_type: MIME тип файла (автоопределяется по расширению если не указан)

        Returns:
            str: Имя объекта
        """
        client = cls._get_client()
        if isinstance(content, str):
            content_bytes = content.encode("utf-8")
        else:
            content_bytes = content

        if content_type is None:
            if object_name.endswith(".json"):
                content_type = "application/json"
            elif object_name.endswith(".csv"):
                content_type = "text/csv"
            else:
                content_type = "application/octet-stream"

        content_stream = io.BytesIO(content_bytes)
        content_length = len(content_bytes)

        try:
            client.put_object(
                cls._bucket_name,
                object_name,
                content_stream,
                content_length,
                content_type=content_type,
            )
            return object_name
        except S3Error as e:
            raise RuntimeError(f"Ошибка сохранения файла в MinIO: {e}")

    @classmethod
    def get_file(cls, object_name: str) -> bytes | None:
        """
        Получает файл из MinIO.

        Args:
            object_name: Имя объекта

        Returns:
            bytes | None: Содержимое файла или None если не найден
        """
        try:
            client = cls._get_client()
            response = client.get_object(cls._bucket_name, object_name)
            content = response.read()
            response.close()
            response.release_conn()
            return content
        except S3Error:
            return None

    @classmethod
    def delete_file(cls, object_name: str) -> bool:
        """
        Удаляет файл из MinIO.

        Args:
            object_name: Имя объекта

        Returns:
            bool: True если удален, False если не найден
        """
        try:
            client = cls._get_client()
            client.remove_object(cls._bucket_name, object_name)
            return True
        except S3Error:
            return False

    @classmethod
    def list_files(cls, prefix: str = "") -> list[dict[str, Any]]:
        """
        Список файлов в bucket.

        Args:
            prefix: Префикс для фильтрации

        Returns:
            list: Список объектов с метаданными
        """
        try:
            client = cls._get_client()
            objects = client.list_objects(
                cls._bucket_name, prefix=prefix, recursive=True
            )
            result = []
            for obj in objects:
                result.append(
                    {
                        "object_name": obj.object_name,
                        "size": obj.size,
                        "last_modified": obj.last_modified.isoformat()
                        if obj.last_modified
                        else None,
                    }
                )
            return result
        except S3Error:
            return []


minio_service: MinIOService = MinIOService()
