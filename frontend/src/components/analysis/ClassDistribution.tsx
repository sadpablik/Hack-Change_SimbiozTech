import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList, Label } from 'recharts';

interface ClassDistributionProps {
  data: Array<{ pred_label: number }>;
}

type ChartType = 'bar' | 'pie';

const COLORS = ['#ef4444', '#eab308', '#22c55e'];
const GRADIENT_IDS = ['gradient-negative', 'gradient-neutral', 'gradient-positive'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = payload.reduce((sum: number, item: any) => sum + item.value, 0);
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.name}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Количество: <span className="font-semibold text-gray-900 dark:text-white">{data.value.toLocaleString('ru-RU')}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Процент: <span className="font-semibold text-gray-900 dark:text-white">{percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="dark:fill-gray-300"
      style={{ fontSize: '10px', fontWeight: '600' }}
    >
      {`${(percent * 100).toFixed(1)}%`}
      <tspan x={x} dy="12" style={{ fontSize: '9px' }}>
        {`(${value})`}
      </tspan>
    </text>
  );
};


export function ClassDistribution({ data }: ClassDistributionProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  
  const distribution = data.reduce((acc, row) => {
    const label = row.pred_label;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  const chartData = [
    {
      name: 'Нейтральная',
      value: distribution[0] || 0,
      label: 0,
      percentage: total > 0 ? ((distribution[0] || 0) / total * 100).toFixed(1) : '0',
      color: COLORS[0]
    },
    {
      name: 'Положительная',
      value: distribution[1] || 0,
      label: 1,
      percentage: total > 0 ? ((distribution[1] || 0) / total * 100).toFixed(1) : '0',
      color: COLORS[1]
    },
    {
      name: 'Негативная',
      value: distribution[2] || 0,
      label: 2,
      percentage: total > 0 ? ((distribution[2] || 0) / total * 100).toFixed(1) : '0',
      color: COLORS[2]
    },
  ];

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (chartType) {
      case 'bar':
  return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart {...commonProps}>
            <defs>
              {GRADIENT_IDS.map((id, index) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[index]} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={COLORS[index]} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} className="dark:stroke-gray-700" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} className="dark:text-gray-400" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} className="dark:text-gray-400" tickFormatter={(value) => value.toLocaleString('ru-RU')} />
            <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1000} animationBegin={0}>
              {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#${GRADIENT_IDS[entry.label]})`} style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }} />
              ))}
                <LabelList dataKey="value" position="top" formatter={(value: number) => value.toLocaleString('ru-RU')} style={{ fill: '#374151', fontSize: '12px', fontWeight: 'bold' }} className="dark:fill-gray-300" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        );
      
      case 'pie':
        return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient key={`pie-gradient-${index}`} id={`pie-gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
                label={CustomLabel}
                outerRadius={110}
                innerRadius={50}
              fill="#8884d8"
              dataKey="value"
              animationDuration={1000}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#pie-gradient-${index})`}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Количество: <span className="font-semibold text-gray-900 dark:text-white">{data.value.toLocaleString('ru-RU')}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Процент: <span className="font-semibold text-gray-900 dark:text-white">{data.percentage}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Распределение классов
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Тип визуализации:</span>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="bar">Гистограмма</option>
            <option value="pie">Круговая</option>
          </select>
        </div>
      </div>
      {renderChart()}
        <div className="mt-4 flex justify-center gap-6 flex-wrap">
          {chartData.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
              {item.name}: <span className="font-semibold text-gray-900 dark:text-white">{item.value.toLocaleString('ru-RU')} ({item.percentage}%)</span>
              </span>
            </div>
          ))}
        </div>
      <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        Всего: <span className="font-semibold text-gray-700 dark:text-gray-300">{total.toLocaleString('ru-RU')}</span>
      </div>
    </div>
  );
}
