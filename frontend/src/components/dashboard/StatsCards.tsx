import type { SessionStatsResponse } from '../../types';
import { formatConfidence, formatNumber } from '../../utils/formatters';

interface StatsCardsProps {
  stats: SessionStatsResponse;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Всего текстов</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatNumber(stats.total_texts)}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Проанализировано</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatNumber(stats.analyzed_texts)}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Средняя уверенность</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {stats.avg_confidence ? formatConfidence(stats.avg_confidence) : '-'}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Диапазон уверенности</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {stats.min_confidence && stats.max_confidence
            ? `${formatConfidence(stats.min_confidence)} - ${formatConfidence(stats.max_confidence)}`
            : '-'}
        </p>
      </div>
    </div>
  );
}
