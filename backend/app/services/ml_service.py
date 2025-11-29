"""Сервис для работы с ML-моделью анализа тональности."""

import random
from typing import Any

import numpy as np


class MLService:
    def __init__(self) -> None:
        self.model: Any = None
        self._is_loaded: bool = False
        self.model_version: str = "stub-1.0.0"

    async def load_model(self, model_path: str | None = None) -> None:
        self._is_loaded = True

    def predict(self, text: str) -> tuple[int, float]:
        if not self._is_loaded:
            raise RuntimeError("Модель не загружена")
        label: int = random.randint(0, 2)
        confidence: float = round(random.uniform(0.7, 0.9), 4)
        return label, confidence

    def predict_with_proba(self, text: str) -> tuple[int, list[float]]:
        if not self._is_loaded:
            raise RuntimeError("Модель не загружена")
        proba = np.random.dirichlet([1, 1, 1])
        proba = [round(float(p), 4) for p in proba]
        label: int = int(np.argmax(proba))
        return label, proba

    def predict_batch(self, texts: list[str]) -> list[tuple[int, float]]:
        if not self._is_loaded:
            raise RuntimeError("Модель не загружена")
        return [
            (random.randint(0, 2), round(random.uniform(0.7, 0.9), 4)) for _ in texts
        ]

    def predict_batch_with_proba(
        self, texts: list[str]
    ) -> list[tuple[int, list[float]]]:
        if not self._is_loaded:
            raise RuntimeError("Модель не загружена")
        results: list[tuple[int, list[float]]] = []
        for _ in texts:
            proba = np.random.dirichlet([1, 1, 1])
            proba = [round(float(p), 4) for p in proba]
            label: int = int(np.argmax(proba))
            results.append((label, proba))
        return results


ml_service: MLService = MLService()
