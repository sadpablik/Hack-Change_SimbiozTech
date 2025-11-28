import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CLASS_LABELS, CLASS_COLORS } from '../../utils/constants';

interface ClassDistributionChartProps {
  distribution: Record<number, number>;
}

export function ClassDistributionChart({ distribution }: ClassDistributionChartProps) {
  const data = Object.entries(distribution).map(([label, value]) => ({
    name: CLASS_LABELS[Number(label)],
    value,
  }));

  const COLORS = [CLASS_COLORS[0], CLASS_COLORS[1], CLASS_COLORS[2]];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Распределение по классам
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
