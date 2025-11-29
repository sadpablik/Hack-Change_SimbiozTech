import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatsCards } from '../components/dashboard/StatsCards';
import { ClassDistributionChart } from '../components/dashboard/ClassDistributionChart';
import { SourceDistributionChart } from '../components/dashboard/SourceDistributionChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { apiClient } from '../services/api';
import type { SessionStatsResponse } from '../types';

export function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadStats();
    }
  }, [sessionId]);

  const loadStats = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getSessionStats(Number(sessionId));
      setStats(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorMessage message="Не указан ID сессии" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Дашборд (Сессия #{sessionId})
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/analysis/${sessionId}`)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Результаты
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            На главную
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <StatsCards stats={stats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClassDistributionChart distribution={stats.class_distribution} />
            <SourceDistributionChart distribution={stats.source_distribution} />
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Нет данных для отображения
        </p>
      )}
    </div>
  );
}
