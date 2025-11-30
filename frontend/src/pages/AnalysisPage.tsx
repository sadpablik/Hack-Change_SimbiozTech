import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResultsTable } from '../components/analysis/ResultsTable';
import { FiltersPanel } from '../components/analysis/FiltersPanel';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';
import type { ResultsFilters } from '../types';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';

export function AnalysisPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ResultsFilters>({
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
  });
  const [sources, setSources] = useState<string[]>([]);
  const [manualLabels, setManualLabels] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSources();
    }
  }, [sessionId]);

  const loadSources = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await apiClient.getResults(Number(sessionId), { limit: 500, offset: 0 });
      const uniqueSources = Array.from(
        new Set(response.results.map((r) => r.source).filter((s): s is string => s !== null))
      );
      setSources(uniqueSources);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки данных';
      setError(errorMessage);
      console.error('Ошибка загрузки источников:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLabelChange = async (id: number, trueLabel: number) => {
    try {
      await apiClient.updateResult(id, trueLabel);
      setManualLabels((prev) => ({ ...prev, [id]: trueLabel }));
      showToast('Метка успешно обновлена', 'success');
    } catch (err) {
      console.error('Ошибка обновления метки:', err);
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
          Результаты анализа (Сессия #{sessionId})
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/dashboard/${sessionId}`)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Дашборд
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            На главную
          </button>
        </div>
      </div>

      {error && (
        <ErrorMessage
          message={typeof error === 'string' ? error : 'Произошла ошибка при загрузке данных'}
          onDismiss={() => setError(null)}
        />
      )}

      <FiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
        sources={sources}
      />

      <ResultsTable
        sessionId={Number(sessionId)}
        filters={filters}
        onFiltersChange={setFilters}
        onLabelChange={handleLabelChange}
        manualLabels={manualLabels}
      />
    </div>
  );
}
