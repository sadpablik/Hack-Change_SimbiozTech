"""Сервис для работы с CSV файлами."""

import io
from typing import Any

import pandas as pd
from fastapi import HTTPException, UploadFile


class CSVService:
    """Сервис для парсинга и экспорта CSV файлов."""

    REQUIRED_COLUMN: str = "text"
    OPTIONAL_COLUMNS: set[str] = {"source", "label"}

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
            contents: bytes = await file.read()
            df: pd.DataFrame = pd.read_csv(io.BytesIO(contents))

            if CSVService.REQUIRED_COLUMN not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"CSV файл должен содержать колонку '{CSVService.REQUIRED_COLUMN}'",
                )

            data: list[dict[str, Any]] = df.to_dict("records")

            for i, row in enumerate(data, start=1):
                text_value: Any = row.get(CSVService.REQUIRED_COLUMN)
                if not text_value or pd.isna(text_value):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Строка {i}: поле '{CSVService.REQUIRED_COLUMN}' не может быть пустым",
                    )

            return data

        except pd.errors.EmptyDataError:
            raise HTTPException(status_code=400, detail="CSV файл пуст")
        except pd.errors.ParserError as e:
            raise HTTPException(
                status_code=400, detail=f"Ошибка парсинга CSV: {str(e)}"
            )
        except HTTPException:
            raise
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

        df: pd.DataFrame = pd.DataFrame(data)
        column_order: list[str] = ["text", "pred_label", "confidence"]
        column_order.extend(
            col for col in ["source", "true_label"] if col in df.columns
        )

        df = df[[col for col in column_order if col in df.columns]]
        output: io.StringIO = io.StringIO()
        df.to_csv(output, index=False, encoding="utf-8")
        return output.getvalue()


csv_service: CSVService = CSVService()
