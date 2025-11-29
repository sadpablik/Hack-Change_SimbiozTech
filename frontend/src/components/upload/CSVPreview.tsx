import type { CSVRow } from '../../types';

interface CSVPreviewProps {
  data: CSVRow[];
  className?: string;
}

export function CSVPreview({ data, className = '' }: CSVPreviewProps) {
  if (data.length === 0) {
    return null;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate"
                  title={String(row[col as keyof CSVRow] || '')}
                >
                  {String(row[col as keyof CSVRow] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Показано первых {data.length} строк
      </p>
    </div>
  );
}
