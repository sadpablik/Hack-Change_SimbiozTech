"""Сервис для расчета метрик качества модели."""

from typing import Any

import numpy as np
from sklearn.metrics import precision_recall_fscore_support


class MetricsService:
    """Сервис для расчета метрик качества модели."""

    @staticmethod
    def calculate_macro_f1(y_true: list[int], y_pred: list[int]) -> dict[str, Any]:
        """
        Рассчитывает macro-F1 метрику и детальные метрики по классам.

        Формула macro-F1:
        - Для каждого класса i ∈ {0, 1, 2}:
          - Precision_i = TP_i / (TP_i + FP_i)
          - Recall_i = TP_i / (TP_i + FN_i)
          - F1_i = 2 * (Precision_i * Recall_i) / (Precision_i + Recall_i)
        - Macro-F1 = (F1_0 + F1_1 + F1_2) / 3

        Args:
            y_true: Список истинных меток
            y_pred: Список предсказанных меток

        Returns:
            Словарь с метриками:
            - macro_f1: общая macro-F1 метрика
            - class_metrics: список метрик для каждого класса
        """
        y_true_array = np.array(y_true)
        y_pred_array = np.array(y_pred)

        # Используем sklearn для расчета метрик
        precision, recall, f1, support = precision_recall_fscore_support(
            y_true_array, y_pred_array, labels=[0, 1, 2], average=None, zero_division=0
        )

        # Рассчитываем macro-F1 как среднее F1 по всем классам
        macro_f1 = float(np.mean(f1))

        # Формируем детальные метрики по классам
        class_metrics = []
        for i, label in enumerate([0, 1, 2]):
            # Обработка edge cases: если Precision + Recall = 0, F1 = 0
            precision_i = float(precision[i]) if not np.isnan(precision[i]) else 0.0
            recall_i = float(recall[i]) if not np.isnan(recall[i]) else 0.0
            f1_i = float(f1[i]) if not np.isnan(f1[i]) else 0.0

            class_metrics.append(
                {
                    "class_label": label,
                    "precision": round(precision_i, 4),
                    "recall": round(recall_i, 4),
                    "f1": round(f1_i, 4),
                }
            )

        return {
            "macro_f1": round(macro_f1, 4),
            "class_metrics": class_metrics,
        }


metrics_service = MetricsService()
