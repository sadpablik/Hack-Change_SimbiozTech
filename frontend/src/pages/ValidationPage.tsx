import { useState } from 'react';
import { CSVUpload } from '../components/upload/CSVUpload';
import { MetricsDisplay } from '../components/validation/MetricsDisplay';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';
import type { ValidationResponse, CSVUploadResponse } from '../types';

export function ValidationPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<ValidationResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const response: CSVUploadResponse = await apiClient.uploadCSV(file);
      setSessionId(response.session_id);
      showToast('Файл загружен, запускаем анализ...', 'info');
      // Запускаем батч-анализ перед валидацией
      await apiClient.batchAnalyze(response.session_id);
      showToast('Анализ завершен, можно рассчитать метрики', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файла');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleValidate = async () => {
    if (!sessionId) return;

    setIsValidating(true);
    setError(null);
    try {
      const response = await apiClient.validate(sessionId);
      setMetrics(response);
      showToast(`Macro-F1: ${response.macro_f1.toFixed(4)}`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при расчете метрик');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Валидация модели
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Загрузите CSV файл с колонкой 'label' для расчета метрик качества модели
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Загрузка тестового набора данных
        </h2>
        <CSVUpload onUpload={handleUpload} isLoading={isUploading} />
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {sessionId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Расчет метрик
          </h2>
          {isValidating ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <button
              onClick={handleValidate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Рассчитать macro-F1 и метрики
            </button>
          )}
        </div>
      )}

      {metrics && <MetricsDisplay metrics={metrics} />}
    </div>
  );
}
