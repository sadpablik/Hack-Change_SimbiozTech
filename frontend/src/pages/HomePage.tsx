import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CSVUpload } from '../components/upload/CSVUpload';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { MetricsDisplay } from '../components/validation/MetricsDisplay';
import { ConfusionMatrix } from '../components/validation/ConfusionMatrix';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';
import type { PredictResponse, ValidationResponse } from '../types';

type UploadMode = 'predict' | 'validate';

export function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<UploadMode>('predict');
  const [enablePreprocessing, setEnablePreprocessing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictResponse | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [confusionMatrix, setConfusionMatrix] = useState<number[][] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelectedFile(null);
    setError(null);
    setPredictionResult(null);
    setValidationResult(null);
    setConfusionMatrix(null);
  }, [mode]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setPredictionResult(null);
    setValidationResult(null);
    setConfusionMatrix(null);
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

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsProcessing(false);
    setProgress(0);
    setError(null);
    showToast('Обработка отменена', 'info');
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    abortControllerRef.current = new AbortController();
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setPredictionResult(null);
    setValidationResult(null);
    setConfusionMatrix(null);

    try {
      if (mode === 'predict') {
        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => Math.min(prev + 5, 90));
        }, 200);

        const result = await apiClient.predictCSV(selectedFile, enablePreprocessing, abortControllerRef.current?.signal);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setProgress(100);
        setPredictionResult(result);

        if (result.warning) {
          showToast(result.warning, 'warning');
        } else {
          showToast(`Обработано ${result.rows} строк`, 'success');
        }

        if (result.skipped_rows && result.skipped_rows > 0) {
          showToast(`Пропущено ${result.skipped_rows} строк с пустым полем 'text'`, 'warning');
        }
      } else {
        const response = await apiClient.validateCSV(selectedFile, enablePreprocessing, abortControllerRef.current?.signal);
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        setValidationResult(response);
        const matrix = calculateConfusionMatrix(response);
        setConfusionMatrix(matrix);
        showToast(`Macro-F1: ${response.macro_f1.toFixed(4)}`, 'success');
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted || (err instanceof Error && err.message === 'Запрос отменен')) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Ошибка при обработке файла');
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsProcessing(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!predictionResult) return;

    try {
      const predictionId = predictionResult.download_url.split('/').pop() || '';
      const blob = await apiClient.downloadPredictions(predictionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predictions_${predictionId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Файл успешно скачан', 'success');
    } catch (err) {
      showToast('Ошибка при скачивании файла', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold gradient-text mb-4">
          Анализатор тональности отзывов
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Загрузите CSV файл для анализа тональности текстов с использованием ML-модели
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <button
          onClick={() => setMode('predict')}
          className={`card text-left transition-all ${
            mode === 'predict'
              ? 'ring-2 ring-blue-500 shadow-xl'
              : 'hover:shadow-xl'
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              mode === 'predict' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Предсказание
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Загрузите CSV <strong>без колонки label</strong> для получения предсказаний модели
          </p>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <strong>Что это значит?</strong> Модель проанализирует ваши тексты и определит тональность (0, 1 или 2) для каждого отзыва. Вы получите файл с предсказаниями.
            </p>
          </div>
        </button>

        <button
          onClick={() => setMode('validate')}
          className={`card text-left transition-all ${
            mode === 'validate'
              ? 'ring-2 ring-blue-500 shadow-xl'
              : 'hover:shadow-xl'
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              mode === 'validate' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Валидация
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Загрузите CSV <strong>с колонкой label</strong> для проверки качества модели (macro-F1)
          </p>
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <strong>Что это значит?</strong> У вас уже есть правильные ответы (label). Модель сделает предсказания, и мы сравним их с правильными ответами, чтобы оценить точность модели.
            </p>
          </div>
        </button>
      </div>

      <div className="card mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Настройки обработки
        </h2>
      </div>

        <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <input
            type="checkbox"
            id="preprocessing"
            checked={enablePreprocessing}
            onChange={(e) => setEnablePreprocessing(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="preprocessing"
            className="text-gray-900 dark:text-white font-medium cursor-pointer"
          >
            Включить предобработку текста
          </label>
        </div>

        {enablePreprocessing && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Предобработка включает:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Нормализация текста (удаление лишних пробелов, приведение к единому формату)</li>
            </ul>
            </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Загрузка CSV файла
        </h2>

        {mode === 'predict' && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Требуемые колонки:</strong> text (обязательно), src (опционально)
            </p>
          </div>
        )}

        {mode === 'validate' && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Требуемые колонки:</strong> text (обязательно), label (обязательно, значения 0/1/2), src (опционально)
            </p>
          </div>
        )}

        <CSVUpload key={mode} onFileSelect={handleFileSelect} isLoading={isProcessing} />

        {selectedFile && !isProcessing && !predictionResult && !validationResult && (
          <div className="mt-6">
            <button
              onClick={handleStartAnalysis}
              className="w-full btn-primary text-lg py-4"
            >
              {mode === 'validate' ? 'Начать валидацию' : 'Начать анализ'}
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Идёт обработка...</span>
              <div className="flex items-center space-x-3">
                <span>{progress}%</span>
                <button
                  onClick={handleCancel}
                  className="px-4 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Отменить
                </button>
              </div>
            </div>
            <ProgressBar progress={progress} label="" />
          </div>
        )}

        {error && (
          <div className="mt-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {predictionResult && (
          <div className="mt-6 space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Результаты анализа
                </h2>
              </div>
              <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Обработано строк</p>
                  <p className="text-5xl font-bold gradient-text">
                    {predictionResult.rows}
                  </p>
                  {predictionResult.processing_time && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                      ⏱️ Время обработки: {predictionResult.processing_time} сек
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="btn-primary"
                >
                  💾 Скачать CSV
                </button>
                <button
                  onClick={() => {
                    const predictionId = predictionResult.download_url.split('/').pop();
                    navigate(`/results?predictionId=${predictionId}`);
                  }}
                  className="btn-primary bg-blue-600 hover:bg-blue-700"
                >
                  📊 Просмотреть результаты
                </button>
              </div>
            </div>
          </div>
        )}

        {validationResult && (
          <div className="mt-6 space-y-8">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Результаты валидации
                </h2>
              </div>
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Macro-F1</p>
                  <p className="text-5xl font-bold gradient-text">
                    {validationResult.macro_f1.toFixed(4)}
                  </p>
                  {validationResult.processing_time && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                      ⏱️ Время обработки: {validationResult.processing_time} сек
                    </p>
                  )}
                </div>
              </div>
              <MetricsDisplay metrics={validationResult} />
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

      <div className="card mt-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Легенда классов
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">0</span>
              <span className="font-semibold text-gray-900 dark:text-white">Нейтральная</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Нейтральная тональность отзыва
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">1</span>
              <span className="font-semibold text-gray-900 dark:text-white">Положительная</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Положительная тональность отзыва
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">2</span>
              <span className="font-semibold text-gray-900 dark:text-white">Негативная</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Негативная тональность отзыва
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
