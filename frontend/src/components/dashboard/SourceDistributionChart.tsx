import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SourceDistributionChartProps {
  distribution: Record<string, number> | null;
}

export function SourceDistributionChart({ distribution }: SourceDistributionChartProps) {
  if (!distribution || Object.keys(distribution).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Распределение по источникам
        </h3>
        <p className="text-gray-500 dark:text-gray-400">Нет данных об источниках</p>
      </div>
    );
  }

  const data = Object.entries(distribution).map(([source, count]) => ({
    source,
    count,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Распределение по источникам
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="source" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
