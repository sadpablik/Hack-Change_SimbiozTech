import { useState, useEffect } from 'react';
import { ResultRow } from './ResultRow';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { downloadCSV, generateCSV } from '../../services/csvService';
import { apiClient } from '../../services/api';
import type { TextAnalysisResult, ResultsFilters } from '../../types';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';

interface ResultsTableProps {
  sessionId: number;
  filters: ResultsFilters;
  onFiltersChange: (filters: ResultsFilters) => void;
  onLabelChange?: (id: number, trueLabel: number) => void;
  manualLabels?: Record<number, number>;
}

export function ResultsTable({
  sessionId,
  filters,
  onFiltersChange,
  onLabelChange,
  manualLabels = {},
}: ResultsTableProps) {
  const [results, setResults] = useState<TextAnalysisResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = filters.limit || DEFAULT_PAGE_SIZE;

  useEffect(() => {
    loadResults();
  }, [sessionId, filters]);

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getResults(sessionId, {
        ...filters,
        offset: currentPage * pageSize,
        limit: Math.min(pageSize, 500), // Ограничиваем максимум 500
      });
      setResults(response.results);
      setTotal(response.total);
    } catch (error) {
      console.error('Ошибка загрузки результатов:', error);
      // Показываем понятное сообщение об ошибке
      if (error instanceof Error) {
        alert(`Ошибка загрузки результатов: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvContent = await apiClient.exportCSV(sessionId);
      downloadCSV(csvContent, `results_session_${sessionId}.csv`);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Ошибка при экспорте CSV');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Результаты анализа ({total})
        </h2>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Скачать CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Нет результатов для отображения
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Текст
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Предсказание
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Уверенность
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Источник
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ручная метка
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((result) => (
                  <ResultRow
                    key={result.id}
                    result={result}
                    onLabelChange={onLabelChange}
                    isManual={manualLabels[result.id] !== undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Страница {currentPage + 1} из {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setCurrentPage(0);
                    onFiltersChange({ ...filters, offset: 0 });
                  }}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Первая
                </button>
                <button
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    onFiltersChange({ ...filters, offset: newPage * pageSize });
                  }}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                <button
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    onFiltersChange({ ...filters, offset: newPage * pageSize });
                  }}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед
                </button>
                <button
                  onClick={() => {
                    const newPage = totalPages - 1;
                    setCurrentPage(newPage);
                    onFiltersChange({ ...filters, offset: newPage * pageSize });
                  }}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Последняя
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
