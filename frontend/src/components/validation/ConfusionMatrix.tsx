interface ConfusionMatrixProps {
  matrix: number[][];
}

export function ConfusionMatrix({ matrix }: ConfusionMatrixProps) {
  const getColorIntensity = (value: number, max: number) => {
    if (max === 0) return 'bg-gray-100 dark:bg-gray-700';
    const intensity = value / max;
    if (intensity > 0.7) return 'bg-green-500';
    if (intensity > 0.4) return 'bg-yellow-500';
    if (intensity > 0.1) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabelName = (label: number) => {
    switch (label) {
      case 0: return 'Отрицательный';
      case 1: return 'Нейтральный';
      case 2: return 'Положительный';
      default: return `Класс ${label}`;
    }
  };

  const maxValue = Math.max(...matrix.flat(), 1);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Реально / Предсказано
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                0 - Отрицательный
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                1 - Нейтральный
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                2 - Положительный
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {matrix.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {i} - {getLabelName(i)}
                </td>
                {row.map((value, j) => (
                  <td
                    key={j}
                    className={`px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-white ${getColorIntensity(value, maxValue)}`}
                  >
                    {value.toFixed(0)}
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
