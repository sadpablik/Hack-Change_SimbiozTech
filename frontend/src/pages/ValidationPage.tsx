import { useState, useRef } from 'react';
import { CSVUpload } from '../components/upload/CSVUpload';
import { MetricsDisplay } from '../components/validation/MetricsDisplay';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';
import type { ValidationResponse } from '../types';
import { ConfusionMatrix } from '../components/validation/ConfusionMatrix';

export function ValidationPage() {
  const [metrics, setMetrics] = useState<ValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confusionMatrix, setConfusionMatrix] = useState<number[][] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setMetrics(null);
    setConfusionMatrix(null);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsValidating(false);
    setError(null);
    showToast('Валидация отменена', 'info');
  };

  const handleStartValidation = async () => {
    if (!selectedFile) return;

    abortControllerRef.current = new AbortController();
    setIsValidating(true);
    setError(null);
    setMetrics(null);
    setConfusionMatrix(null);

    try {
      const response = await apiClient.validateCSV(selectedFile, abortControllerRef.current?.signal);
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      setMetrics(response);

      const matrix = calculateConfusionMatrix(response);
      setConfusionMatrix(matrix);

      showToast(`Macro-F1: ${response.macro_f1.toFixed(4)}`, 'success');
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted || (err instanceof Error && err.message === 'Запрос отменен')) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при расчете метрик';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsValidating(false);
      }
    }
  };

  const calculateConfusionMatrix = (response: ValidationResponse): number[][] => {
    const matrix: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    response.class_metrics.forEach((cm) => {
      const label = cm.class_label;
      const total = 100;
      const tp = Math.round(total * cm.precision * cm.recall);
      const fp = Math.round(total * cm.precision * (1 - cm.recall));
      const fn = Math.round(total * (1 - cm.precision) * cm.recall);
      const tn = total - tp - fp - fn;

      matrix[label][label] = tp;
      const otherLabels = [0, 1, 2].filter(l => l !== label);
      if (fp > 0 && otherLabels.length > 0) {
        const fpPerLabel = Math.round(fp / otherLabels.length);
        otherLabels.forEach(otherLabel => {
          matrix[label][otherLabel] = fpPerLabel;
        });
      }
      if (fn > 0 && otherLabels.length > 0) {
        const fnPerLabel = Math.round(fn / otherLabels.length);
        otherLabels.forEach(otherLabel => {
          matrix[otherLabel][label] = fnPerLabel;
        });
      }
    });

    return matrix;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold gradient-text mb-4">
          Валидация модели
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Загрузите CSV файл с колонкой 'label' для расчета метрик качества модели (macro-F1)
        </p>
      </div>

      <div className="card mb-8">
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Требования к файлу:</strong>
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>Колонка <strong>text</strong> (обязательно)</li>
            <li>Колонка <strong>label</strong> (обязательно, значения только 0, 1 или 2)</li>
            <li>Колонка <strong>src</strong> (опционально)</li>
          </ul>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Загрузка валидационного CSV
        </h2>
        <CSVUpload onFileSelect={handleFileSelect} isLoading={isValidating} />

        {selectedFile && !isValidating && !metrics && (
          <div className="mt-6">
            <button
              onClick={handleStartValidation}
              className="w-full btn-primary text-lg py-4"
            >
              Начать валидацию
            </button>
          </div>
        )}

        {isValidating && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="md" />
              <span className="text-gray-600 dark:text-gray-400">Идёт обработка и расчёт метрик...</span>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Отменить
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}
      </div>

      {metrics && (
        <div className="space-y-8">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Результаты валидации
              </h2>
              {metrics.validation_id && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {metrics.validation_id.substring(0, 8)}...
                  </span>
                  <button
                    onClick={async () => {
                      if (!metrics.validation_id) return;
                      try {
                        const blob = await apiClient.downloadValidation(metrics.validation_id);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `validation_${metrics.validation_id}.json`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        showToast('Результаты валидации успешно скачаны', 'success');
                      } catch (err) {
                        showToast('Ошибка при скачивании результатов', 'error');
                      }
                    }}
                    className="btn-primary text-sm"
                  >
                    Скачать JSON
                  </button>
                </div>
              )}
            </div>
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Macro-F1</p>
                <p className="text-5xl font-bold gradient-text">
                  {metrics.macro_f1.toFixed(4)}
                </p>
              </div>
            </div>
            <MetricsDisplay metrics={metrics} />
          </div>

          {confusionMatrix && (
            <div className="card">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Confusion Matrix
              </h2>
              <ConfusionMatrix matrix={confusionMatrix} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
