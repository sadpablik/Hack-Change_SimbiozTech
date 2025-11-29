import type { ValidationResponse } from '../../types';

interface MetricsDisplayProps {
  metrics: ValidationResponse;
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  const getLabelName = (label: number) => {
    switch (label) {
      case 0: return 'Отрицательный';
      case 1: return 'Нейтральный';
      case 2: return 'Положительный';
      default: return `Класс ${label}`;
    }
  };

  const getLabelColor = (label: number) => {
    switch (label) {
      case 0: return 'text-red-600 dark:text-red-400';
      case 1: return 'text-yellow-600 dark:text-yellow-400';
      case 2: return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
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
                <tr key={metric.class_label} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${getLabelColor(metric.class_label)}`}>
                      {metric.class_label} - {getLabelName(metric.class_label)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {metric.precision.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {metric.recall.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
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
