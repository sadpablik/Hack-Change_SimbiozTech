import axios, { AxiosInstance, AxiosError, CanceledError } from 'axios';
import { showToast } from '../utils/toast';
import type {
  CSVUploadResponse,
  BatchAnalysisResponse,
  TextAnalysisResponse,
  ValidationResponse,
  SessionsListResponse,
  SessionStatsResponse,
  ResultsListResponse,
  ResultsFilters,
  TextAnalysisRequest,
  PredictResponse,
  PreprocessRequest,
  PreprocessResponse,
  ModelStatusResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 1800000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          config: {
            url: error.config?.url,
            method: error.config?.method,
          }
        });
        
        if (error.response) {
          const data = error.response.data as { detail?: string | { error?: { code?: string; message?: string; row?: number } } };

          let message = 'Произошла ошибка';
          if (typeof data.detail === 'string') {
            message = data.detail;
          } else if (data.detail?.error?.message) {
            message = data.detail.error.message;
            if (data.detail.error.row) {
              message += ` (строка ${data.detail.error.row})`;
            }
          } else if (error.message) {
            message = error.message;
          }

          showToast(message, 'error');
          throw new Error(message);
        }
        
        let networkMessage = 'Ошибка сети';
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          networkMessage = 'Превышено время ожидания ответа от сервера';
        } else if (error.code === 'ECONNREFUSED') {
          networkMessage = 'Не удалось подключиться к серверу';
        } else if (error.message) {
          networkMessage = `Ошибка сети: ${error.message}`;
        }
        
        showToast(networkMessage, 'error');
        throw new Error(networkMessage);
      }
    );
  }

  async uploadCSV(file: File): Promise<CSVUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<CSVUploadResponse>(
      '/api/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async batchAnalyze(sessionId: number): Promise<BatchAnalysisResponse> {
    const response = await this.client.post<BatchAnalysisResponse>(
      `/api/batch-analyze?session_id=${sessionId}`
    );
    return response.data;
  }

  async analyzeText(text: string): Promise<TextAnalysisResponse> {
    const response = await this.client.post<TextAnalysisResponse>(
      '/api/analyze',
      { text } as TextAnalysisRequest
    );
    return response.data;
  }

  async validate(sessionId: number): Promise<ValidationResponse> {
    const response = await this.client.post<ValidationResponse>(
      `/api/validate?session_id=${sessionId}`
    );
    return response.data;
  }

  cancelRequest(requestId: string) {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  async predictCSV(file: File, enablePreprocessing: boolean = true, signal?: AbortSignal): Promise<PredictResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<PredictResponse>(
      `/api/predict?enable_preprocessing=${enablePreprocessing}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 1800000,
        signal,
      }
    );
    return response.data;
  }

  async validateCSV(file: File, enablePreprocessing: boolean = true, signal?: AbortSignal): Promise<ValidationResponse> {
    const formData = new FormData();
    formData.append('file', file);

    console.log('[API] Starting validation for file:', file.name, 'size:', file.size);
    
    try {
      const response = await this.client.post<ValidationResponse>(
        `/api/validate`,
        formData,
        {
          params: {
            enable_preprocessing: enablePreprocessing,
          },
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 1800000,
          signal,
        }
      );
      console.log('[API] Validation response received:', response.data);
      return response.data;
    } catch (error) {
      if (error instanceof CanceledError || axios.isCancel(error)) {
        console.log('[API] Validation cancelled');
        throw new Error('Запрос отменен');
      }
      console.error('[API] Validation error:', error);
      throw error;
    }
  }

  async downloadPredictions(predictionId: string): Promise<Blob> {
    const response = await this.client.get(
      `/api/download/predicted/${predictionId}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  async listPredictions(): Promise<{
    predictions: Array<{
      prediction_id: string;
      created_at: string;
      rows_count: number;
    }>;
    total: number;
  }> {
    const response = await this.client.get('/api/predictions/list');
    return response.data;
  }

  async listValidations(): Promise<{
    validations: Array<{
      validation_id: string;
      created_at: string;
      rows_count: number;
      macro_f1: number;
    }>;
    total: number;
  }> {
    const response = await this.client.get('/api/validations/list');
    return response.data;
  }

  async downloadValidation(validationId: string): Promise<Blob> {
    const response = await this.client.get(
      `/api/download/validation/${validationId}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  async preprocessText(text: string): Promise<PreprocessResponse> {
    const response = await this.client.post<PreprocessResponse>(
      '/api/preprocess',
      { text } as PreprocessRequest
    );
    return response.data;
  }

  async getModelStatus(): Promise<ModelStatusResponse> {
    const response = await this.client.get<ModelStatusResponse>(
      '/api/model/status'
    );
    return response.data;
  }

  async getSessions(
    limit: number = 10,
    offset: number = 0
  ): Promise<SessionsListResponse> {
    const response = await this.client.get<SessionsListResponse>(
      `/api/sessions`,
      {
        params: { limit, offset },
      }
    );
    return response.data;
  }

  async getSessionStats(
    sessionId: number
  ): Promise<SessionStatsResponse> {
    const response = await this.client.get<SessionStatsResponse>(
      `/api/sessions/${sessionId}/stats`
    );
    return response.data;
  }

  async getResults(
    sessionId: number,
    filters: ResultsFilters = {}
  ): Promise<ResultsListResponse> {
    const params: Record<string, string | number> = {
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };

    if (filters.pred_label !== undefined) {
      params.pred_label = filters.pred_label;
    }
    if (filters.min_confidence !== undefined) {
      params.min_confidence = filters.min_confidence;
    }
    if (filters.max_confidence !== undefined) {
      params.max_confidence = filters.max_confidence;
    }
    if (filters.source) {
      params.source = filters.source;
    }
    if (filters.search) {
      params.search = filters.search;
    }

    const response = await this.client.get<ResultsListResponse>(
      `/api/sessions/${sessionId}/results`,
      { params }
    );
    return response.data;
  }

  async exportCSV(sessionId: number): Promise<string> {
    const response = await this.client.get<{ csv: string }>(
      `/api/export-csv?session_id=${sessionId}`
    );
    return response.data.csv;
  }

  async exportJSON(sessionId: number): Promise<{ data: any[]; count: number }> {
    const response = await this.client.get<{ data: any[]; count: number }>(
      `/api/export-json?session_id=${sessionId}`
    );
    return response.data;
  }

  async updateResult(
    resultId: number,
    trueLabel: number
  ): Promise<void> {
    await this.client.put(
      `/api/results/${resultId}?true_label=${trueLabel}`,
      null
    );
  }

  async healthCheck(): Promise<{ status: string; database: string }> {
    const response = await this.client.get<{ status: string; database: string }>(
      '/api/health'
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
