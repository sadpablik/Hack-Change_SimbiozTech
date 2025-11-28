import axios, { AxiosInstance, AxiosError } from 'axios';
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
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor для обработки ошибок
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const message =
            (error.response.data as { detail?: string })?.detail ||
            error.message ||
            'Произошла ошибка';
          showToast(message, 'error');
          throw new Error(message);
        }
        showToast('Ошибка сети', 'error');
        throw error;
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
