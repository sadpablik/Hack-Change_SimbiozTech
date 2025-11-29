import Papa from 'papaparse';
import type { CSVRow } from '../types';

export interface ParsedCSV {
  data: CSVRow[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

/**
 * Парсит CSV файл на клиенте
 */
export async function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('Ошибка парсинга CSV: ' + results.errors[0].message));
          return;
        }

        // Валидация: проверка наличия колонки 'text'
        const firstRow = results.data[0] as Record<string, any>;
        if (!firstRow || !('text' in firstRow)) {
          reject(new Error("CSV должен содержать колонку 'text'"));
          return;
        }

        resolve({
          data: results.data as CSVRow[],
          errors: results.errors,
          meta: results.meta,
        });
      },
      error: (error) => {
        reject(new Error('Ошибка чтения файла: ' + error.message));
      },
    });
  });
}

/**
 * Превью первых N строк CSV
 */
export async function previewCSV(
  file: File,
  rows: number = 5
): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: rows,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('Ошибка парсинга CSV'));
          return;
        }

        const firstRow = results.data[0] as Record<string, any>;
        if (!firstRow || !('text' in firstRow)) {
          reject(new Error("CSV должен содержать колонку 'text'"));
          return;
        }

        resolve(results.data as CSVRow[]);
      },
      error: (error) => {
        reject(new Error('Ошибка чтения файла: ' + error.message));
      },
    });
  });
}

/**
 * Генерирует CSV строку из данных
 */
export function generateCSV(data: Record<string, any>[]): string {
  return Papa.unparse(data, {
    header: true,
  });
}

/**
 * Скачивает CSV файл
 */
export function downloadCSV(csvContent: string, filename: string = 'results.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Валидация размера файла
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`Файл слишком большой. Максимальный размер: ${maxSizeMB}MB`);
  }
}
