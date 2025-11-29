import re
from typing import Any


class TextPreprocessingService:
    @staticmethod
    def normalize(text: str) -> str:
        if not text or not isinstance(text, str):
            return ""

        text = re.sub(r"\s+", " ", text)
        text = text.strip()
        return text

    @staticmethod
    def preprocess(text: str) -> dict[str, Any]:
        if not text:
            return {
                "original": "",
                "normalized": "",
            }

        normalized = TextPreprocessingService.normalize(text)

        return {
            "original": text,
            "normalized": normalized,
        }

    @staticmethod
    def preprocess_batch(texts: list[str]) -> list[dict[str, Any]]:
        """Оптимизированная батч-обработка с использованием list comprehension."""
        if not texts:
            return []
        # Оптимизация: нормализуем все тексты сразу через list comprehension
        normalized_texts = [re.sub(r"\s+", " ", text).strip() if text and isinstance(text, str) else "" for text in texts]
        return [
            {
                "original": text,
                "normalized": normalized,
            }
            for text, normalized in zip(texts, normalized_texts)
        ]


text_preprocessing_service: TextPreprocessingService = TextPreprocessingService()