import { useMemo } from 'react';
import { CLASS_LABELS, CLASS_COLORS, CLASS_COLORS_DARK } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';

interface TopWordsProps {
  data: Array<{ text: string; pred_label: number }>;
  topN?: number;
}

interface WordFrequency {
  word: string;
  frequency: number;
}

const STOP_WORDS = new Set([
  'и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'из', 'к', 'о', 'у', 'за', 'со', 'об', 'во', 'не', 'что', 'как', 'так', 'это', 'или', 'но', 'а', 'же', 'бы', 'ли', 'то', 'же', 'он', 'она', 'они', 'мы', 'вы', 'ты', 'я', 'его', 'её', 'их', 'мой', 'твой', 'наш', 'ваш', 'свой', 'этот', 'тот', 'такой', 'какой', 'который', 'где', 'когда', 'куда', 'откуда', 'почему', 'зачем', 'как', 'сколько', 'чей', 'чья', 'чьё', 'чьи'
]);

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function calculateTopWords(
  data: Array<{ text: string; pred_label: number }>,
  label: number,
  topN: number
): WordFrequency[] {
  const wordFreq = new Map<string, number>();
  
  data
    .filter(item => item.pred_label === label)
    .forEach(({ text }) => {
      const words = extractWords(text);
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });
  
  return Array.from(wordFreq.entries())
    .map(([word, frequency]) => ({ word, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, topN);
}

export function TopWords({ data, topN = 20 }: TopWordsProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? CLASS_COLORS_DARK : CLASS_COLORS;
  
  const topWordsByLabel = useMemo(() => {
    return {
      0: calculateTopWords(data, 0, topN),
      1: calculateTopWords(data, 1, topN),
      2: calculateTopWords(data, 2, topN),
    };
  }, [data, topN]);
  
  const labels = [0, 1, 2];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {labels.map((label) => {
        const words = topWordsByLabel[label];
        const color = colors[label];
        
        return (
          <div key={label} className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Топ-{topN} слов: {CLASS_LABELS[label]}
            </h3>
            {words.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Нет данных для отображения
              </p>
            ) : (
              <div className="space-y-2">
                {words.map(({ word, frequency }, index) => (
                  <div
                    key={word}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className="text-xs font-bold text-gray-500 dark:text-gray-400 w-6 text-center"
                      >
                        #{index + 1}
                      </span>
                      <span
                        className="font-medium text-gray-900 dark:text-white"
                        style={{ color: index < 5 ? color : undefined }}
                      >
                        {word}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {frequency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


