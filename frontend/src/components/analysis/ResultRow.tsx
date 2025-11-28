import { useState } from 'react';
import type { TextAnalysisResult } from '../../types';
import { CLASS_LABELS, CLASS_COLORS, CLASS_COLORS_DARK } from '../../utils/constants';
import { formatConfidence } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';

interface ResultRowProps {
  result: TextAnalysisResult;
  onLabelChange?: (id: number, trueLabel: number) => void;
  isManual?: boolean;
}

export function ResultRow({ result, onLabelChange, isManual = false }: ResultRowProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<number | null>(result.true_label ?? null);

  const colors = theme === 'dark' ? CLASS_COLORS_DARK : CLASS_COLORS;
  const labelColor = colors[result.pred_label] || colors[1];

  const handleLabelClick = () => {
    if (onLabelChange) {
      setIsEditing(true);
    }
  };

  const handleLabelSelect = (label: number) => {
    setSelectedLabel(label);
    if (onLabelChange) {
      onLabelChange(result.id, label);
    }
    setIsEditing(false);
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md">
        <div className="truncate" title={result.text}>
          {result.text}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center space-x-2">
          <span
            className="px-2 py-1 rounded text-xs font-medium text-white"
            style={{ backgroundColor: labelColor }}
          >
            {CLASS_LABELS[result.pred_label]}
          </span>
          {isManual && (
            <span className="text-xs text-blue-600 dark:text-blue-400" title="Ручная метка">
              ✏️
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {formatConfidence(result.confidence)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {result.source || '-'}
      </td>
      <td className="px-4 py-3 text-sm">
        {isEditing ? (
          <div className="flex space-x-1">
            {[0, 1, 2].map((label) => (
              <button
                key={label}
                onClick={() => handleLabelSelect(label)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedLabel === label
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {CLASS_LABELS[label]}
              </button>
            ))}
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700"
            >
              Отмена
            </button>
          </div>
        ) : (
          <div className="relative">
            {result.true_label !== null ? (
              <span
                className="px-2 py-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-80"
                style={{ backgroundColor: colors[result.true_label] }}
                onClick={handleLabelClick}
                title="Кликните для изменения"
              >
                {CLASS_LABELS[result.true_label]}
              </span>
            ) : (
              <button
                onClick={handleLabelClick}
                className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Добавить ручную метку"
              >
                Установить
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
