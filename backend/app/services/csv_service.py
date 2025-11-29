"""Сервис для работы с CSV файлами согласно ТЗ."""

import io
from typing import Any

import pandas as pd
from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE: int = 500 * 1024 * 1024


class CSVValidationError(Exception):
    def __init__(self, code: str, message: str, row: int | None = None) -> None:
        self.code = code
        self.message = message
        self.row = row
        super().__init__(self.message)


class CSVService:
    REQUIRED_COLUMN: str = "text"
    OPTIONAL_COLUMNS: set[str] = {"src", "label"}
    VALID_LABELS: set[int] = {0, 1, 2}
    MAX_TEXT_LENGTH: int = 10000

    @staticmethod
    def _detect_delimiter(content: bytes) -> str:
        try:
            text = content.decode("utf-8-sig")
            first_line = text.split("\n")[0] if "\n" in text else text
            comma_count = first_line.count(",")
            semicolon_count = first_line.count(";")
            if semicolon_count > comma_count:
                return ";"
            return ","
        except Exception:
            return ","

    @staticmethod
    def _validate_encoding(content: bytes) -> str:
        try:
            text = content.decode("utf-8-sig")
            return text
        except UnicodeDecodeError as e:
            raise CSVValidationError(
                code="INVALID_ENCODING",
                message=f"Файл должен быть в кодировке UTF-8: {str(e)}",
            )

    @staticmethod
    async def parse_csv(
        file: UploadFile, require_label: bool = False
    ) -> tuple[list[dict[str, Any]], list[int]]:
        try:
            contents: bytes = await file.read()

            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": "INVALID_CSV",
                            "message": f"Размер файла превышает максимальный ({MAX_FILE_SIZE / 1024 / 1024}MB)",
                        }
                    },
                )

            try:
                text_content = CSVService._validate_encoding(contents)
            except CSVValidationError as e:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": e.code,
                            "message": e.message,
                            "row": e.row,
                        }
                    },
                )

            delimiter = CSVService._detect_delimiter(contents)

            try:
                chunk_size = 10000
                file_size = len(text_content)

                if file_size > 10 * 1024 * 1024:
                    chunks = []
                    for chunk in pd.read_csv(
                        io.StringIO(text_content),
                        delimiter=delimiter,
                        quotechar='"',
                        skipinitialspace=True,
                        on_bad_lines="skip",
                        chunksize=chunk_size,
                    ):
                        chunks.append(chunk)
                    df: pd.DataFrame = pd.concat(chunks, ignore_index=True)
                else:
                    df: pd.DataFrame = pd.read_csv(
                        io.StringIO(text_content),
                        delimiter=delimiter,
                        quotechar='"',
                        skipinitialspace=True,
                        on_bad_lines="skip",
                    )
            except pd.errors.EmptyDataError:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": "INVALID_CSV",
                            "message": "CSV файл пуст",
                        }
                    },
                )
            except pd.errors.ParserError as e:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": "INVALID_CSV",
                            "message": f"Ошибка парсинга CSV: {str(e)}",
                        }
                    },
                )

            df.columns = df.columns.str.strip().str.lower()

            if CSVService.REQUIRED_COLUMN not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": "INVALID_CSV",
                            "message": f"Отсутствует обязательная колонка '{CSVService.REQUIRED_COLUMN}'",
                        }
                    },
                )

            if require_label:
                if "label" not in df.columns:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error": {
                                "code": "INVALID_CSV",
                                "message": "Для проверки качества требуется колонка 'label'",
                            }
                        },
                    )

            data: list[dict[str, Any]] = []
            skipped_rows: list[int] = []

            for idx, row in df.iterrows():
                row_num = idx + 2

                text_value = row.get(CSVService.REQUIRED_COLUMN)

                if pd.isna(text_value) or (
                    isinstance(text_value, str) and not text_value.strip()
                ):
                    skipped_rows.append(row_num)
                    continue

                text_value = str(text_value) if not pd.isna(text_value) else ""

                if len(text_value) > CSVService.MAX_TEXT_LENGTH:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error": {
                                "code": "INVALID_CSV",
                                "message": f"Строка {row_num}: текст превышает максимальную длину ({CSVService.MAX_TEXT_LENGTH} символов)",
                                "row": row_num,
                            }
                        },
                    )

                record: dict[str, Any] = {"text": text_value}

                if "src" in df.columns:
                    src_value = row.get("src")
                    record["src"] = str(src_value) if not pd.isna(src_value) else ""

                if "label" in df.columns:
                    label_value = row.get("label")

                    if not pd.isna(label_value):
                        try:
                            label_int = int(float(label_value))
                            if label_int not in CSVService.VALID_LABELS:
                                raise HTTPException(
                                    status_code=400,
                                    detail={
                                        "error": {
                                            "code": "INVALID_LABELS",
                                            "message": f"Строка {row_num}: label должен быть одним из {{0, 1, 2}}, получено {label_int}",
                                            "row": row_num,
                                        }
                                    },
                                )
                            record["label"] = label_int
                        except (ValueError, TypeError):
                            raise HTTPException(
                                status_code=400,
                                detail={
                                    "error": {
                                        "code": "INVALID_LABELS",
                                        "message": f"Строка {row_num}: label должен быть числом (0, 1 или 2)",
                                        "row": row_num,
                                    }
                                },
                            )
                    elif require_label:
                        raise HTTPException(
                            status_code=400,
                            detail={
                                "error": {
                                    "code": "INVALID_LABELS",
                                    "message": f"Строка {row_num}: label обязателен для проверки качества",
                                    "row": row_num,
                                }
                            },
                        )

                data.append(record)

            return data, skipped_rows

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": {
                        "code": "PREDICTION_FAILED",
                        "message": f"Ошибка обработки файла: {str(e)}",
                    }
                },
            )

    @staticmethod
    def export_to_csv(data: list[dict[str, Any]], include_proba: bool = False) -> str:
        if not data:
            return ""

        all_columns: set[str] = set()
        for record in data:
            all_columns.update(record.keys())

        column_order: list[str] = ["text"]
        if "src" in all_columns:
            column_order.append("src")
        column_order.append("pred_label")
        if include_proba and "pred_proba" in all_columns:
            column_order.append("pred_proba")

        if len(data) > 100000:
            output = io.StringIO()
            output.write(",".join(column_order) + "\n")

            for record in data:
                row_values = []
                for col in column_order:
                    if col in record:
                        value = record[col]
                        if col == "pred_proba" and isinstance(value, list):
                            row_values.append(str(value))
                        elif isinstance(value, str) and (
                            "," in value or '"' in value or "\n" in value
                        ):
                            escaped_value = value.replace('"', '""')
                            row_values.append(f'"{escaped_value}"')
                        else:
                            row_values.append(str(value))
                    else:
                        row_values.append("")
                output.write(",".join(row_values) + "\n")

            return output.getvalue()
        else:
            df_data: list[dict[str, Any]] = []
            for record in data:
                filtered_record: dict[str, Any] = {}
                for col in column_order:
                    if col in record:
                        value = record[col]
                        if col == "pred_proba" and isinstance(value, list):
                            filtered_record[col] = str(value)
                        else:
                            filtered_record[col] = value
                df_data.append(filtered_record)

            df: pd.DataFrame = pd.DataFrame(df_data)

            for col in column_order:
                if col not in df.columns:
                    df[col] = ""

            df = df[[col for col in column_order if col in df.columns]]

            output: io.StringIO = io.StringIO()
            df.to_csv(output, index=False, encoding="utf-8", sep=",")
            return output.getvalue()


csv_service: CSVService = CSVService()
