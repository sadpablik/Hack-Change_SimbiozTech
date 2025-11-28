import type { ValidationResponse } from '../../types';
import { ConfusionMatrix } from '../dashboard/ConfusionMatrix';

interface MetricsDisplayProps {
  metrics: ValidationResponse;
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  // Создаем confusion matrix из метрик
  // Это упрощенная версия - в реальности нужны данные из бэкенда
  const confusionMatrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Macro-F1 Score</p>
        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
          {metrics.macro_f1.toFixed(4)}
        </p>
      </div>

      <ConfusionMatrix matrix={confusionMatrix} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Метрики по классам
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Класс
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Precision
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Recall
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  F1-Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {metrics.class_metrics.map((metric) => (
                <tr key={metric.class_label}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    Класс {metric.class_label}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {metric.precision.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {metric.recall.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {metric.f1.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
