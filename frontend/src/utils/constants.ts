// Константы приложения

export const MAX_FILE_SIZE_MB = 10;
export const PREVIEW_ROWS = 5;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

export const CLASS_LABELS: Record<number, string> = {
  0: 'Негативный',
  1: 'Нейтральный',
  2: 'Позитивный',
};

export const CLASS_COLORS: Record<number, string> = {
  0: '#ef4444', // red
  1: '#6b7280', // gray
  2: '#10b981', // green
};

export const CLASS_COLORS_DARK: Record<number, string> = {
  0: '#dc2626',
  1: '#9ca3af',
  2: '#059669',
};
