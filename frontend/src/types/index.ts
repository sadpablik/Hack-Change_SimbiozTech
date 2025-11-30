export interface TextAnalysisRequest {
  text: string;
}

export interface TextAnalysisResponse {
  label: number;
  confidence: number;
}

export interface CSVUploadResponse {
  session_id: number;
  filename: string;
  rows_count: number;
}

export interface BatchAnalysisResponse {
  session_id: number;
  processed_count: number;
}

export interface ClassMetrics {
  class_label: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ValidationResponse {
  macro_f1: number;
  class_metrics: ClassMetrics[];
  validation_id?: string | null;
  processing_time?: number;
}

export interface ValidationItem {
  validation_id: string;
  created_at: string;
  rows_count: number;
  macro_f1: number;
}

export interface SessionInfo {
  id: number;
  filename: string;
  created_at: string;
  texts_count: number;
  avg_confidence: number | null;
}

export interface SessionsListResponse {
  sessions: SessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionStatsResponse {
  session_id: number;
  filename: string;
  created_at: string;
  total_texts: number;
  analyzed_texts: number;
  avg_confidence: number | null;
  min_confidence: number | null;
  max_confidence: number | null;
  class_distribution: Record<number, number>;
  source_distribution: Record<string, number> | null;
}

export interface TextAnalysisResult {
  id: number;
  text: string;
  pred_label: number;
  confidence: number;
  source: string | null;
  true_label: number | null;
}

export interface ResultsListResponse {
  results: TextAnalysisResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface ResultsFilters {
  pred_label?: number;
  min_confidence?: number;
  max_confidence?: number;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CSVRow {
  text: string;
  source?: string;
  label?: number;
}

export interface ConfusionMatrix {
  [key: string]: number;
}

export interface PredictResponse {
  status: string;
  rows: number;
  download_url: string;
  skipped_rows?: number;
  warning?: string | null;
  processing_time?: number;
}

export interface PreprocessRequest {
  text: string;
}

export interface PreprocessResponse {
  original: string;
  normalized: string;
  tokens: string[];
  lemmas: string[];
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
  }>;
}

export interface ModelStatusResponse {
  model_version: string;
  status: string;
  last_updated: string;
  implementation: string;
}
