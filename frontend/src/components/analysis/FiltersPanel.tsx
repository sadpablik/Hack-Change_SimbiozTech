import { useState, useEffect } from 'react';
import type { ResultsFilters } from '../../types';
import { CLASS_LABELS } from '../../utils/constants';

interface FiltersPanelProps {
  filters: ResultsFilters;
  onFiltersChange: (filters: ResultsFilters) => void;
  sources: string[];
  className?: string;
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  sources,
  className = '',
}: FiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState<ResultsFilters>(filters);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key: keyof ResultsFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    const newFilters = { ...localFilters, search: value || undefined };
    setLocalFilters(newFilters);

    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      onFiltersChange(newFilters);
    }, 300);

    setSearchDebounce(timeout);
  };

  const clearFilters = () => {
    const cleared: ResultsFilters = {
      limit: filters.limit,
      offset: filters.offset,
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const hasActiveFilters =
    localFilters.pred_label !== undefined ||
    localFilters.min_confidence !== undefined ||
    localFilters.max_confidence !== undefined ||
    localFilters.source !== undefined ||
    localFilters.search !== undefined;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Фильтр по классу */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Класс тональности
          </label>
          <select
            value={localFilters.pred_label ?? ''}
            onChange={(e) =>
              updateFilter('pred_label', e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Все</option>
            <option value="0">{CLASS_LABELS[0]}</option>
            <option value="1">{CLASS_LABELS[1]}</option>
            <option value="2">{CLASS_LABELS[2]}</option>
          </select>
        </div>

        {/* Фильтр по источнику */}
        {sources.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Источник
            </label>
            <select
              value={localFilters.source ?? ''}
              onChange={(e) => updateFilter('source', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Все</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Поиск по тексту */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Поиск по тексту
          </label>
          <input
            type="text"
            value={localFilters.search ?? ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Введите ключевое слово..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Диапазон уверенности */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Уверенность модели
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Минимум
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={localFilters.min_confidence ?? ''}
                onChange={(e) =>
                  updateFilter('min_confidence', e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Максимум
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={localFilters.max_confidence ?? ''}
                onChange={(e) =>
                  updateFilter('max_confidence', e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="1.0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
