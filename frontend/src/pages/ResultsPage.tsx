import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { apiClient } from '../services/api';
import { ClassDistribution } from '../components/analysis/ClassDistribution';

interface PredictionRow {
  text: string;
  src?: string;
  pred_label: number;
  pred_proba?: number[];
}

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const predictionId = searchParams.get('predictionId');
  const [data, setData] = useState<PredictionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [editedLabels, setEditedLabels] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);

  useEffect(() => {
    if (predictionId) {
      loadData();
    }
  }, [predictionId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const loadData = async () => {
    if (!predictionId) {
      setError('Не указан ID предсказания');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Загрузка данных для predictionId:', predictionId);
      const blob = await apiClient.downloadPredictions(predictionId);
      console.log('Получен blob, размер:', blob.size);

      const text = await blob.text();
      console.log('Текст получен, длина:', text.length, 'первые 200 символов:', text.substring(0, 200));

      if (!text || text.trim().length === 0) {
        throw new Error('Получен пустой файл от сервера');
      }

      const rows = parseCSV(text);
      console.log('Распарсено строк:', rows.length);

      if (rows.length === 0) {
        throw new Error('Не удалось распарсить данные из CSV файла. Возможно, файл имеет неверный формат.');
      }

      setData(rows);
      console.log('Данные установлены, количество:', rows.length);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки данных';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const parseCSV = (csvText: string): PredictionRow[] => {
    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      });

      if (result.errors.length > 0 && result.data.length === 0) {
        console.error('Ошибки парсинга CSV:', result.errors);
        throw new Error('Ошибка парсинга CSV: ' + result.errors[0].message);
      }

      const rows: PredictionRow[] = [];

      for (const record of result.data as any[]) {
        if (!record || !record.text) continue;

        const row: PredictionRow = {
          text: String(record.text || '').trim(),
          pred_label: parseInt(String(record.pred_label || '0')) || 0,
        };

        if (record.src) {
          row.src = String(record.src).trim();
        }

        if (record.pred_proba) {
          const probaStr = String(record.pred_proba);
          try {
            row.pred_proba = JSON.parse(probaStr.replace(/'/g, '"'));
          } catch {
            try {
              row.pred_proba = JSON.parse(probaStr);
            } catch {
              // ignore
            }
          }
        }

        if (row.text) {
          rows.push(row);
        }
      }

      return rows;
    } catch (err) {
      console.error('Ошибка парсинга CSV:', err);
      throw err;
    }
  };

  const filteredData = data.filter(row => {
    if (filter !== null && row.pred_label !== filter) return false;
    if (search && !row.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedData = filteredData.slice(startIdx, endIdx);

  const getLabelColor = (label: number) => {
    switch (label) {
      case 0: return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 1: return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 2: return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
    }
  };

  const getLabelText = (label: number) => {
    switch (label) {
      case 0: return 'Отрицательный';
      case 1: return 'Нейтральный';
      case 2: return 'Положительный';
      default: return 'Неизвестно';
    }
  };

  const handleDownload = async () => {
    if (!predictionId) return;

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

  const handleExportCorrections = () => {
    const correctedData = data.map((row, idx) => ({
      ...row,
      pred_label: editedLabels[idx] ?? row.pred_label,
    }));

    const csv = [
      ['text', 'src', 'pred_label', 'pred_proba'].filter(col =>
        col === 'text' || correctedData.some(r => col === 'src' ? r.src : true)
      ).join(','),
      ...correctedData.map(row => {
        const values = [
          `"${row.text.replace(/"/g, '""')}"`,
          row.src ? `"${row.src.replace(/"/g, '""')}"` : '',
          row.pred_label,
          row.pred_proba ? JSON.stringify(row.pred_proba) : '',
        ];
        return values.filter((v, i) => i === 0 || v !== '').join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corrected_predictions_${predictionId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast('Корректировки успешно экспортированы', 'success');
  };

  const hasCorrections = Object.keys(editedLabels).length > 0;

  if (!predictionId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <ErrorMessage message="Не указан ID предсказания" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <div className="flex flex-col justify-center items-center min-h-[400px] space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400">Загрузка результатов...</p>
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
            <button onClick={() => navigate('/')} className="btn-primary">
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">
            Нет данных для отображения
          </p>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/')} className="btn-primary">
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0 && !isLoading && !error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">
            Нет данных для отображения. Возможно, файл еще обрабатывается или произошла ошибка.
          </p>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/')} className="btn-primary">
              Вернуться на главную
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
            Результаты анализа
          </h1>
          {predictionId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ID: {predictionId}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <button onClick={handleDownload} className="btn-primary">
            Скачать CSV
          </button>
          {hasCorrections && (
            <button onClick={handleExportCorrections} className="btn-primary bg-green-600 hover:bg-green-700">
              Экспорт корректировок ({Object.keys(editedLabels).length})
            </button>
          )}
          <button onClick={() => navigate('/')} className="btn-secondary">
            На главную
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="card mb-6">
          <ClassDistribution data={data} />
        </div>
      )}

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Поиск по тексту
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Введите текст для поиска..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Фильтр по классу
            </label>
            <select
              value={filter ?? ''}
              onChange={(e) => setFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="input-field"
            >
              <option value="">Все классы</option>
              <option value="0">0 - Отрицательный</option>
              <option value="1">1 - Нейтральный</option>
              <option value="2">2 - Положительный</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Текст
                </th>
                {data[0]?.src && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Источник
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Класс
                </th>
                {data[0]?.pred_proba && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Вероятности
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Нет данных для отображения
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const originalIdx = data.indexOf(row);
                  return (
                    <tr key={`${originalIdx}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-md">
                        <div className="truncate" title={row.text}>
                          {row.text}
                        </div>
                      </td>
                      {row.src && (
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {row.src}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <select
                          value={editedLabels[originalIdx] ?? row.pred_label}
                          onChange={(e) => {
                            const newLabel = parseInt(e.target.value);
                            setEditedLabels({ ...editedLabels, [originalIdx]: newLabel });
                          }}
                          className={`text-xs font-medium rounded-lg px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${getLabelColor(editedLabels[originalIdx] ?? row.pred_label)}`}
                        >
                          <option value="0">0 - Отрицательный</option>
                          <option value="1">1 - Нейтральный</option>
                          <option value="2">2 - Положительный</option>
                        </select>
                        {editedLabels[originalIdx] !== undefined && editedLabels[originalIdx] !== row.pred_label && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(изменено)</span>
                        )}
                      </td>
                    {row.pred_proba && (
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex space-x-2">
                          {row.pred_proba.map((p, i) => (
                            <span key={i} className="text-xs">
                              {i}: {p.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Показано: {startIdx + 1}-{Math.min(endIdx, filteredData.length)} из {filteredData.length} строк (всего: {data.length})
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Страница {currentPage} из {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
