import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CSVPreview } from './CSVPreview';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { previewCSV, validateFileSize } from '../../services/csvService';
import { MAX_FILE_SIZE_MB } from '../../utils/constants';
import type { CSVRow } from '../../types';

interface CSVUploadProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export function CSVUpload({ onUpload, isLoading = false }: CSVUploadProps) {
  const [previewData, setPreviewData] = useState<CSVRow[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError(null);
      setSelectedFile(file);

      try {
        validateFileSize(file, MAX_FILE_SIZE_MB);
        const preview = await previewCSV(file, 5);
        setPreviewData(preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка при чтении файла');
        setSelectedFile(null);
        setPreviewData(null);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError(null);
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      setPreviewData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файла');
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isDragActive
              ? 'Отпустите файл здесь'
              : 'Перетащите CSV файл сюда или нажмите для выбора'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Максимальный размер: {MAX_FILE_SIZE_MB}MB
          </p>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {previewData && selectedFile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Выбран файл: {selectedFile.name}
            </p>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewData(null);
                setError(null);
              }}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              Отменить
            </button>
          </div>
          <CSVPreview data={previewData} />
          <button
            onClick={handleUpload}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Загрузка...
              </>
            ) : (
              'Загрузить файл'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
