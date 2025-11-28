import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CSVUpload } from '../components/upload/CSVUpload';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';
import type { SessionInfo, CSVUploadResponse } from '../types';
import { formatDate, formatConfidence } from '../utils/formatters';

export function HomePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await apiClient.getSessions(10, 0);
      setSessions(response.sessions);
    } catch (err) {
      console.error('Ошибка загрузки сессий:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const response: CSVUploadResponse = await apiClient.uploadCSV(file);
      setCurrentSessionId(response.session_id);
      showToast(`Файл успешно загружен. Создана сессия #${response.session_id}`, 'success');
      await loadSessions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при загрузке файла';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentSessionId) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);

    try {
      // Симуляция прогресса
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      await apiClient.batchAnalyze(currentSessionId);
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      showToast('Анализ завершен успешно', 'success');

      setTimeout(() => {
        navigate(`/analysis/${currentSessionId}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при анализе');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Анализ тональности текстов
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Загрузите CSV файл с отзывами для анализа тональности
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Загрузка CSV файла
        </h2>
        <CSVUpload onUpload={handleUpload} isLoading={isUploading} />
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {currentSessionId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Запуск анализа
          </h2>
          {isAnalyzing ? (
            <div className="space-y-2">
              <ProgressBar progress={analysisProgress} label="Обработка данных..." />
            </div>
          ) : (
            <button
              onClick={handleAnalyze}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Начать анализ
            </button>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Последние сессии
        </h2>
        {isLoadingSessions ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Нет загруженных сессий
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Файл
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Текстов
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Уверенность
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {session.filename}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(session.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {session.texts_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {session.avg_confidence ? formatConfidence(session.avg_confidence) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => navigate(`/analysis/${session.id}`)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
