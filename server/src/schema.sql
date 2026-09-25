-- Sportmaster GPU Recommendation Console — schema
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS sportmaster_gpu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sportmaster_gpu;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS deployment_errors;
DROP TABLE IF EXISTS deployments;
DROP TABLE IF EXISTS experiment_results;
DROP TABLE IF EXISTS experiments;
DROP TABLE IF EXISTS hardware_devices;
DROP TABLE IF EXISTS profiling_stages;
DROP TABLE IF EXISTS profiling_runs;
DROP TABLE IF EXISTS dataset_issues;
DROP TABLE IF EXISTS dataset_tasks;
DROP TABLE IF EXISTS datasets;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS block_metrics_daily;
DROP TABLE IF EXISTS recommendation_blocks;
DROP TABLE IF EXISTS model_versions;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS metrics_catalog;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role VARCHAR(80) NOT NULL,
  available_tasks VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  placement VARCHAR(200) NOT NULL,
  purpose TEXT,
  team VARCHAR(150),
  data_source VARCHAR(200),
  hardware VARCHAR(150),
  sla_response_ms INT,
  quality_target VARCHAR(200),
  status ENUM('active','paused','draft') DEFAULT 'active',
  current_model_version_id INT DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE model_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  version_label VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL,
  author VARCHAR(150),
  description TEXT,
  test_results VARCHAR(255),
  status ENUM('in_review','approved','deployed','archived','rejected') DEFAULT 'in_review',
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

ALTER TABLE tasks ADD FOREIGN KEY (current_model_version_id) REFERENCES model_versions(id) ON DELETE SET NULL;

CREATE TABLE recommendation_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  placement VARCHAR(200) NOT NULL,
  task_id INT NOT NULL,
  current_model_version_id INT DEFAULT NULL,
  status ENUM('ok','degraded','error','paused') DEFAULT 'ok',
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (current_model_version_id) REFERENCES model_versions(id) ON DELETE SET NULL
);

CREATE TABLE block_metrics_daily (
  id INT AUTO_INCREMENT PRIMARY KEY,
  block_id INT NOT NULL,
  metric_date DATE NOT NULL,
  requests_count INT NOT NULL,
  avg_response_ms DECIMAL(7,2) NOT NULL,
  p95_response_ms DECIMAL(7,2) NOT NULL,
  error_rate_pct DECIMAL(5,3) NOT NULL,
  gpu_util_pct DECIMAL(5,2) NOT NULL,
  gpu_mem_util_pct DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (block_id) REFERENCES recommendation_blocks(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_block_date (block_id, metric_date)
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  occurred_at DATETIME NOT NULL,
  block_id INT DEFAULT NULL,
  event_type VARCHAR(100) NOT NULL,
  affected_version VARCHAR(50),
  result VARCHAR(200),
  FOREIGN KEY (block_id) REFERENCES recommendation_blocks(id) ON DELETE SET NULL
);

CREATE TABLE datasets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  source VARCHAR(200),
  period_start DATE,
  period_end DATE,
  data_types VARCHAR(255),
  records_count BIGINT,
  updated_at DATETIME,
  usage_policy VARCHAR(255),
  quality_check_result ENUM('passed','warning','failed') DEFAULT 'passed'
);

CREATE TABLE dataset_tasks (
  dataset_id INT NOT NULL,
  task_id INT NOT NULL,
  PRIMARY KEY (dataset_id, task_id),
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE dataset_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT NOT NULL,
  field VARCHAR(150) NOT NULL,
  issue_type VARCHAR(150) NOT NULL,
  affected_records INT NOT NULL,
  fix_status ENUM('open','in_progress','fixed') DEFAULT 'open',
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE profiling_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  model_version_id INT DEFAULT NULL,
  dataset_id INT DEFAULT NULL,
  run_type ENUM('train','inference') NOT NULL,
  hardware_config VARCHAR(200),
  batch_size INT,
  started_at DATETIME NOT NULL,
  duration_ms INT NOT NULL,
  responsible VARCHAR(150),
  result VARCHAR(200),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (model_version_id) REFERENCES model_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE SET NULL
);

CREATE TABLE profiling_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_id INT NOT NULL,
  stage_name VARCHAR(150) NOT NULL,
  time_ms INT NOT NULL,
  share_pct DECIMAL(5,2) NOT NULL,
  gpu_util_pct DECIMAL(5,2),
  memory_mb INT,
  ops_count BIGINT,
  FOREIGN KEY (run_id) REFERENCES profiling_runs(id) ON DELETE CASCADE
);

CREATE TABLE hardware_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_id INT DEFAULT NULL,
  device_name VARCHAR(150) NOT NULL,
  util_pct DECIMAL(5,2),
  memory_used_mb INT,
  peak_memory_mb INT,
  errors_count INT DEFAULT 0,
  FOREIGN KEY (run_id) REFERENCES profiling_runs(id) ON DELETE CASCADE
);

CREATE TABLE experiments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  task_id INT NOT NULL,
  base_version_id INT DEFAULT NULL,
  change_description TEXT,
  changed_params VARCHAR(255),
  dataset_id INT DEFAULT NULL,
  hardware VARCHAR(150),
  responsible VARCHAR(150),
  started_at DATETIME NOT NULL,
  status ENUM('planned','running','completed','failed') DEFAULT 'planned',
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (base_version_id) REFERENCES model_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE SET NULL
);

CREATE TABLE experiment_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  experiment_id INT NOT NULL UNIQUE,
  response_time_ms DECIMAL(7,2),
  rps DECIMAL(9,2),
  memory_mb INT,
  train_time_s INT,
  quality_score DECIMAL(5,2),
  errors_count INT DEFAULT 0,
  log_excerpt TEXT,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE TABLE deployments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  block_id INT DEFAULT NULL,
  model_version_id INT NOT NULL,
  environment VARCHAR(100) NOT NULL,
  traffic_share_pct DECIMAL(5,2) NOT NULL,
  started_at DATETIME NOT NULL,
  responsible VARCHAR(150),
  stop_condition VARCHAR(255),
  rollback_version_id INT DEFAULT NULL,
  status ENUM('rolling_out','active','rolled_back','stopped') DEFAULT 'active',
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES recommendation_blocks(id) ON DELETE SET NULL,
  FOREIGN KEY (model_version_id) REFERENCES model_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (rollback_version_id) REFERENCES model_versions(id) ON DELETE SET NULL
);

CREATE TABLE deployment_errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deployment_id INT NOT NULL,
  occurred_at DATETIME NOT NULL,
  error_type VARCHAR(150) NOT NULL,
  affected_requests INT NOT NULL,
  fix_status ENUM('open','in_progress','fixed') DEFAULT 'open',
  FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category ENUM('tasks','experiments','periods') NOT NULL,
  period_start DATE,
  period_end DATE,
  block_id INT DEFAULT NULL,
  metrics_included VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  author VARCHAR(150),
  FOREIGN KEY (block_id) REFERENCES recommendation_blocks(id) ON DELETE SET NULL
);

CREATE TABLE metrics_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(50),
  threshold VARCHAR(100)
);

SET FOREIGN_KEY_CHECKS = 1;
