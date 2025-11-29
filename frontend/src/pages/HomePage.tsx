import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CSVUpload } from '../components/upload/CSVUpload';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';
import type { PredictResponse } from '../types';

type UploadMode = 'predict' | 'validate';

export function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<UploadMode>('predict');
  const [enablePreprocessing, setEnablePreprocessing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setPredictionResult(null);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setPredictionResult(null);

    try {
      if (mode === 'predict') {
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 5, 90));
        }, 200);

        const result = await apiClient.predictCSV(selectedFile);
        clearInterval(progressInterval);
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

        setTimeout(() => {
          const predictionId = result.download_url.split('/').pop();
          navigate(`/results?predictionId=${predictionId}`);
        }, 1000);
      } else {
        navigate('/validation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при обработке файла');
    } finally {
      setIsProcessing(false);
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
          onClick={() => {
            setMode('predict');
            setSelectedFile(null);
          }}
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
          onClick={() => {
            setMode('validate');
            setSelectedFile(null);
          }}
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
              <li>Токенизация</li>
              <li>Лемматизация</li>
              <li>NER (извлечение именованных сущностей)</li>
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

        <CSVUpload onFileSelect={handleFileSelect} isLoading={isProcessing} />

        {selectedFile && !isProcessing && !predictionResult && (
          <div className="mt-6">
            <button
              onClick={handleStartAnalysis}
              className="w-full btn-primary text-lg py-4"
            >
              Начать анализ
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Идёт обработка...</span>
              <span>{progress}%</span>
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
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Обработка завершена успешно!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Обработано строк: {predictionResult.rows}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="btn-primary"
              >
                Скачать CSV
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card mt-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Легенда классов
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">0</span>
              <span className="font-semibold text-gray-900 dark:text-white">Отрицательный</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Негативная тональность отзыва
            </p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">1</span>
              <span className="font-semibold text-gray-900 dark:text-white">Нейтральный</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Нейтральная тональность отзыва
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">2</span>
              <span className="font-semibold text-gray-900 dark:text-white">Положительный</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Позитивная тональность отзыва
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
