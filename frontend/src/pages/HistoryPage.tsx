import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';

interface PredictionItem {
  prediction_id: string;
  created_at: string;
  rows_count: number;
}

interface ValidationItem {
  validation_id: string;
  created_at: string;
  rows_count: number;
  macro_f1: number;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'predictions' | 'validations'>('predictions');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [predictionsData, validationsData] = await Promise.all([
        apiClient.listPredictions(),
        apiClient.listValidations(),
      ]);
      setPredictions(predictionsData.predictions);
      setValidations(validationsData.validations);
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки истории анализов';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleView = (predictionId: string) => {
    navigate(`/results?predictionId=${predictionId}`);
  };

  const handleDownload = async (predictionId: string) => {
    try {
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

  const handleDownloadValidation = async (validationId: string) => {
    try {
      const blob = await apiClient.downloadValidation(validationId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation_${validationId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Результаты валидации успешно скачаны', 'success');
    } catch (err) {
      showToast('Ошибка при скачивании результатов', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <div className="flex flex-col justify-center items-center min-h-[400px] space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400">Загрузка истории анализов...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
          <div className="mt-4">
            <button onClick={loadHistory} className="btn-primary">
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            История анализов
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Просмотр и управление прошедшими анализами
          </p>
        </div>
        <button onClick={loadHistory} className="btn-secondary">
          Обновить
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'predictions'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Предсказания ({predictions.length})
          </button>
          <button
            onClick={() => setActiveTab('validations')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'validations'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Валидации ({validations.length})
          </button>
        </div>
      </div>

      {activeTab === 'predictions' && (
        predictions.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                История предсказаний пуста
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                Выполните анализ файла, чтобы увидеть его здесь
              </p>
              <button onClick={() => navigate('/')} className="btn-primary">
                Перейти к анализу
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Дата создания
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Количество строк
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ID предсказания
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {predictions.map((pred) => (
                    <tr key={pred.prediction_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(pred.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {pred.rows_count.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {pred.prediction_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleView(pred.prediction_id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Просмотр
                          </button>
                          <button
                            onClick={() => handleDownload(pred.prediction_id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Скачать
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
              Всего предсказаний: {predictions.length}
            </div>
          </div>
        )
      )}

      {activeTab === 'validations' && (
        validations.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                История валидаций пуста
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                Выполните валидацию модели, чтобы увидеть результаты здесь
              </p>
              <button onClick={() => navigate('/validation')} className="btn-primary">
                Перейти к валидации
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Дата создания
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Количество строк
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Macro-F1
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ID валидации
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {validations.map((val) => (
                    <tr key={val.validation_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(val.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {val.rows_count.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          val.macro_f1 >= 0.8 ? 'text-green-600 dark:text-green-400' :
                          val.macro_f1 >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {val.macro_f1.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {val.validation_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDownloadValidation(val.validation_id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Скачать JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
              Всего валидаций: {validations.length}
            </div>
          </div>
        )
      )}
    </div>
  );
}
