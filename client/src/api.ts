import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

export type Block = { id: number; name: string; task_id: number; task_name: string };
export type Version = { id: number; task_id: number; version_label: string; status: string };
export type Meta = { blocks: Block[]; versions: Version[]; periods: number[] };

export type OverviewBlock = {
  id: number; name: string; placement: string; status: string; task_name: string;
  current_version: string; requests_count: string; avg_response_ms: string; p95_response_ms: string;
  error_rate_pct: string; gpu_util_pct: string; gpu_mem_util_pct: string;
};
export type OverviewSummary = {
  requests_count: number; avg_response_ms: number; p95_response_ms: number;
  error_blocks: number; gpu_util_pct: number; gpu_mem_util_pct: number;
};
export type OverviewEvent = { occurred_at: string; block_name: string; event_type: string; affected_version: string; result: string };
export type OverviewDaily = { metric_date: string; requests_count: number; avg_response_ms: number; error_rate_pct: number; gpu_util_pct: number };
export type Overview = { summary: OverviewSummary; blocks: OverviewBlock[]; daily: OverviewDaily[]; events: OverviewEvent[] };

export type Task = { id: number; name: string; placement: string; team: string; status: string; updated_at: string; current_version: string };
export type TaskDetail = {
  id: number; name: string; placement: string; purpose: string; team: string; data_source: string;
  hardware: string; sla_response_ms: number; quality_target: string; status: string; current_version: string;
};
export type ModelVersion = { id: number; version_label: string; created_at: string; author: string; description: string; test_results: string; status: string };

export type Dataset = { id: number; name: string; source: string; period_start: string; period_end: string; records_count: number; updated_at: string; quality_check_result: string };
export type DatasetIssue = { id: number; dataset_id?: number; dataset_name?: string; field: string; issue_type: string; affected_records: number; fix_status: string };

export type ProfilingRun = { id: number; task_name: string; version_label: string; run_type: string; started_at: string; duration_ms: number; result: string; responsible: string };
export type ProfilingStage = { id: number; stage_name: string; time_ms: number; share_pct: number; gpu_util_pct: number; memory_mb: number; ops_count: number };
export type HardwareDevice = { id: number; device_name: string; util_pct: number; memory_used_mb: number; peak_memory_mb: number; errors_count: number };

export type Experiment = { id: number; name: string; task_name: string; base_version: string; responsible: string; started_at: string; status: string };
export type ExperimentResult = { experiment_id: number; name: string; response_time_ms: number; rps: number; memory_mb: number; train_time_s: number; quality_score: number; errors_count: number };

export type Deployment = { id: number; task_name: string; version_label: string; block_name: string; started_at: string; traffic_share_pct: number; status: string };
export type DeploymentError = { id: number; occurred_at: string; task_name: string; version_label: string; error_type: string; affected_requests: number; fix_status: string };

export type Report = { id: number; name: string; category: string; period_start: string; period_end: string; metrics_included: string; created_at: string; author: string; block_name: string | null };

export type SettingsUser = { id: number; full_name: string; email: string; role: string; available_tasks: string };
export type HardwareSummary = { device_name: string; avg_util_pct: number; avg_memory_used_mb: number; peak_memory_mb: number; errors_count: number };
export type MetricDef = { id: number; name: string; unit: string; threshold: string };
