"""Сервис для расчета метрик качества модели."""

from typing import Any

import numpy as np
from sklearn.metrics import f1_score, precision_recall_fscore_support


class MetricsService:
    CLASS_LABELS: list[int] = [0, 1, 2]
    DECIMAL_PLACES: int = 4

    @staticmethod
    def calculate_macro_f1(y_true: list[int], y_pred: list[int]) -> dict[str, Any]:
        y_true_array: np.ndarray = np.array(y_true)
        y_pred_array: np.ndarray = np.array(y_pred)

        macro_f1: float = float(
            f1_score(y_true_array, y_pred_array, average="macro", zero_division=0)
        )

        precision: np.ndarray
        recall: np.ndarray
        f1: np.ndarray
        _: np.ndarray
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true_array,
            y_pred_array,
            labels=MetricsService.CLASS_LABELS,
            average=None,
            zero_division=0,
        )

        class_metrics: list[dict[str, Any]] = [
            {
                "class_label": label,
                "precision": round(
                    float(np.nan_to_num(precision[i])),
                    MetricsService.DECIMAL_PLACES,
                ),
                "recall": round(
                    float(np.nan_to_num(recall[i])), MetricsService.DECIMAL_PLACES
                ),
                "f1": round(float(np.nan_to_num(f1[i])), MetricsService.DECIMAL_PLACES),
            }
            for i, label in enumerate(MetricsService.CLASS_LABELS)
        ]

        return {
            "macro_f1": round(macro_f1, MetricsService.DECIMAL_PLACES),
            "class_metrics": class_metrics,
        }


metrics_service: MetricsService = MetricsService()
