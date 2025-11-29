import { CLASS_LABELS, CLASS_COLORS } from '../../utils/constants';

interface ConfusionMatrixProps {
  matrix: number[][];
  className?: string;
}

export function ConfusionMatrix({ matrix, className = '' }: ConfusionMatrixProps) {
  const getColorIntensity = (value: number, max: number) => {
    const intensity = value / max;
    return `rgba(59, 130, 246, ${intensity})`;
  };

  const maxValue = Math.max(...matrix.flat());

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Confusion Matrix
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Предсказано / Реально
              </th>
              {[0, 1, 2].map((label) => (
                <th
                  key={label}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {CLASS_LABELS[label]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, trueLabel) => (
              <tr key={trueLabel}>
                <td className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {CLASS_LABELS[trueLabel]}
                </td>
                {row.map((value, predLabel) => (
                  <td
                    key={predLabel}
                    className="px-4 py-2 text-center text-sm border border-gray-200 dark:border-gray-700"
                    style={{
                      backgroundColor: getColorIntensity(value, maxValue),
                      color: value > maxValue / 2 ? 'white' : 'black',
                    }}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
