"""Сервис для работы с CSV файлами."""

import csv
import io
from typing import Any

import pandas as pd
from fastapi import HTTPException, UploadFile


class CSVService:
    """Сервис для парсинга и экспорта CSV файлов."""

    @staticmethod
    async def parse_csv(file: UploadFile) -> list[dict[str, Any]]:
        """
        Парсит CSV файл и возвращает список словарей.

        Args:
            file: Загруженный CSV файл

        Returns:
            Список словарей с данными из CSV

        Raises:
            HTTPException: Если файл некорректен или отсутствует обязательная колонка 'text'
        """
        try:
            # Читаем содержимое файла
            contents = await file.read()
            file.seek(
                0
            )  # Возвращаем указатель в начало для возможного повторного чтения

            # Парсим CSV с помощью pandas
            df = pd.read_csv(io.BytesIO(contents))

            # Проверяем наличие обязательной колонки 'text'
            if "text" not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail="CSV файл должен содержать колонку 'text'",
                )

            # Конвертируем в список словарей
            data = df.to_dict("records")

            # Валидация: проверяем, что все тексты не пустые
            for i, row in enumerate(data):
                if not row.get("text") or pd.isna(row.get("text")):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Строка {i + 1}: поле 'text' не может быть пустым",
                    )

            return data

        except pd.errors.EmptyDataError:
            raise HTTPException(status_code=400, detail="CSV файл пуст")
        except pd.errors.ParserError as e:
            raise HTTPException(
                status_code=400, detail=f"Ошибка парсинга CSV: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Ошибка обработки файла: {str(e)}"
            )

    @staticmethod
    def export_to_csv(data: list[dict[str, Any]]) -> str:
        """
        Экспортирует данные в CSV формат.

        Args:
            data: Список словарей с данными для экспорта

        Returns:
            CSV строка
        """
        if not data:
            return ""

        # Создаем DataFrame
        df = pd.DataFrame(data)

        # Упорядочиваем колонки: text, pred_label, confidence, source (если есть), true_label (если есть)
        columns_order = ["text", "pred_label", "confidence"]
        if "source" in df.columns:
            columns_order.append("source")
        if "true_label" in df.columns:
            columns_order.append("true_label")

        # Оставляем только существующие колонки
        columns_order = [col for col in columns_order if col in df.columns]
        df = df[columns_order]

        # Конвертируем в CSV строку
        output = io.StringIO()
        df.to_csv(output, index=False, encoding="utf-8")
        return output.getvalue()


csv_service = CSVService()
