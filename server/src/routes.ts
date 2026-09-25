import { Router } from 'express';
import { pool } from './db';
import OpenAI from 'openai';

export const router = Router();

// ---------- meta (top bar selectors) ----------
router.get('/meta', async (_req, res) => {
  const [blocks] = await pool.query(
    `SELECT b.id, b.name, t.id AS task_id, t.name AS task_name
     FROM recommendation_blocks b JOIN tasks t ON t.id=b.task_id ORDER BY b.name`
  );
  const [versions] = await pool.query(
    `SELECT id, task_id, version_label, status FROM model_versions ORDER BY created_at DESC`
  );
  res.json({ blocks, versions, periods: [7, 14, 30, 90] });
});

// ---------- overview ----------
router.get('/overview', async (req, res) => {
  const period = Number(req.query.period) || 30;
  const blockId = req.query.blockId ? Number(req.query.blockId) : null;

  const [blockRows] = await pool.query(
    `SELECT b.id, b.name, b.placement, b.status, t.name AS task_name,
            mv.version_label AS current_version,
            COALESCE(SUM(m.requests_count),0) AS requests_count,
            COALESCE(AVG(m.avg_response_ms),0) AS avg_response_ms,
            COALESCE(AVG(m.p95_response_ms),0) AS p95_response_ms,
            COALESCE(AVG(m.error_rate_pct),0) AS error_rate_pct,
            COALESCE(AVG(m.gpu_util_pct),0) AS gpu_util_pct,
            COALESCE(AVG(m.gpu_mem_util_pct),0) AS gpu_mem_util_pct
     FROM recommendation_blocks b
     JOIN tasks t ON t.id=b.task_id
     LEFT JOIN model_versions mv ON mv.id=b.current_model_version_id
     LEFT JOIN block_metrics_daily m ON m.block_id=b.id AND m.metric_date >= CURDATE() - INTERVAL ? DAY
     WHERE (? IS NULL OR b.id=?)
     GROUP BY b.id ORDER BY b.name`,
    [period, blockId, blockId]
  );

  const rows = blockRows as any[];
  const totals = rows.reduce(
    (acc, r) => {
      acc.requests += Number(r.requests_count);
      acc.errBlocks += Number(r.error_rate_pct) > 1 ? 1 : 0;
      acc.avgSum += Number(r.avg_response_ms);
      acc.p95Sum += Number(r.p95_response_ms);
      acc.gpuSum += Number(r.gpu_util_pct);
      acc.memSum += Number(r.gpu_mem_util_pct);
      return acc;
    },
    { requests: 0, errBlocks: 0, avgSum: 0, p95Sum: 0, gpuSum: 0, memSum: 0 }
  );
  const n = rows.length || 1;
  const summary = {
    requests_count: totals.requests,
    avg_response_ms: Math.round((totals.avgSum / n) * 10) / 10,
    p95_response_ms: Math.round((totals.p95Sum / n) * 10) / 10,
    error_blocks: totals.errBlocks,
    gpu_util_pct: Math.round((totals.gpuSum / n) * 10) / 10,
    gpu_mem_util_pct: Math.round((totals.memSum / n) * 10) / 10,
  };

  const [dailySeries] = await pool.query(
    `SELECT metric_date, SUM(requests_count) AS requests_count, AVG(avg_response_ms) AS avg_response_ms,
            AVG(error_rate_pct) AS error_rate_pct, AVG(gpu_util_pct) AS gpu_util_pct
     FROM block_metrics_daily
     WHERE metric_date >= CURDATE() - INTERVAL ? DAY AND (? IS NULL OR block_id=?)
     GROUP BY metric_date ORDER BY metric_date`,
    [period, blockId, blockId]
  );

  const [events] = await pool.query(
    `SELECT e.occurred_at, b.name AS block_name, e.event_type, e.affected_version, e.result
     FROM events e LEFT JOIN recommendation_blocks b ON b.id=e.block_id
     ORDER BY e.occurred_at DESC LIMIT 20`
  );

  res.json({ summary, blocks: rows, daily: dailySeries, events });
});

// ---------- tasks ----------
router.get('/tasks', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.placement, t.team, t.status, t.updated_at, mv.version_label AS current_version
     FROM tasks t LEFT JOIN model_versions mv ON mv.id=t.current_model_version_id ORDER BY t.name`
  );
  res.json(rows);
});

router.get('/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [[task]]: any = await pool.query(
    `SELECT t.*, mv.version_label AS current_version FROM tasks t
     LEFT JOIN model_versions mv ON mv.id=t.current_model_version_id WHERE t.id=?`,
    [id]
  );
  if (!task) return res.status(404).json({ error: 'not_found' });
  const [versions] = await pool.query(
    `SELECT id, version_label, created_at, author, description, test_results, status
     FROM model_versions WHERE task_id=? ORDER BY created_at DESC`,
    [id]
  );
  res.json({ task, versions });
});

// ---------- data (datasets) ----------
router.get('/datasets', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, source, period_start, period_end, records_count, updated_at, quality_check_result
     FROM datasets ORDER BY name`
  );
  res.json(rows);
});

router.get('/datasets/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [[dataset]]: any = await pool.query(`SELECT * FROM datasets WHERE id=?`, [id]);
  if (!dataset) return res.status(404).json({ error: 'not_found' });
  const [tasks] = await pool.query(
    `SELECT t.id, t.name FROM dataset_tasks dt JOIN tasks t ON t.id=dt.task_id WHERE dt.dataset_id=?`,
    [id]
  );
  const [issues] = await pool.query(`SELECT * FROM dataset_issues WHERE dataset_id=?`, [id]);
  res.json({ dataset, tasks, issues });
});

router.get('/dataset-issues', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT di.*, d.name AS dataset_name FROM dataset_issues di JOIN datasets d ON d.id=di.dataset_id
     ORDER BY di.affected_records DESC`
  );
  res.json(rows);
});

// ---------- profiling ----------
router.get('/profiling/runs', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT r.id, t.name AS task_name, mv.version_label, r.run_type, r.started_at, r.duration_ms, r.result, r.responsible
     FROM profiling_runs r JOIN tasks t ON t.id=r.task_id LEFT JOIN model_versions mv ON mv.id=r.model_version_id
     ORDER BY r.started_at DESC`
  );
  res.json(rows);
});

router.get('/profiling/runs/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [[run]]: any = await pool.query(
    `SELECT r.*, t.name AS task_name, mv.version_label, d.name AS dataset_name
     FROM profiling_runs r JOIN tasks t ON t.id=r.task_id
     LEFT JOIN model_versions mv ON mv.id=r.model_version_id
     LEFT JOIN datasets d ON d.id=r.dataset_id WHERE r.id=?`,
    [id]
  );
  if (!run) return res.status(404).json({ error: 'not_found' });
  const [stages] = await pool.query(`SELECT * FROM profiling_stages WHERE run_id=? ORDER BY id`, [id]);
  const [devices] = await pool.query(`SELECT * FROM hardware_devices WHERE run_id=? ORDER BY id`, [id]);
  res.json({ run, stages, devices });
});

// ---------- optimizations ----------
router.get('/optimizations/experiments', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT e.id, e.name, t.name AS task_name, mv.version_label AS base_version, e.responsible, e.started_at, e.status
     FROM experiments e JOIN tasks t ON t.id=e.task_id LEFT JOIN model_versions mv ON mv.id=e.base_version_id
     ORDER BY e.started_at DESC`
  );
  res.json(rows);
});

router.get('/optimizations/experiments/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [[experiment]]: any = await pool.query(
    `SELECT e.*, t.name AS task_name, mv.version_label AS base_version, d.name AS dataset_name
     FROM experiments e JOIN tasks t ON t.id=e.task_id
     LEFT JOIN model_versions mv ON mv.id=e.base_version_id
     LEFT JOIN datasets d ON d.id=e.dataset_id WHERE e.id=?`,
    [id]
  );
  if (!experiment) return res.status(404).json({ error: 'not_found' });
  const [[result]]: any = await pool.query(`SELECT * FROM experiment_results WHERE experiment_id=?`, [id]);
  res.json({ experiment, result: result || null });
});

router.get('/optimizations/results', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT e.id AS experiment_id, e.name, r.response_time_ms, r.rps, r.memory_mb, r.train_time_s, r.quality_score, r.errors_count
     FROM experiment_results r JOIN experiments e ON e.id=r.experiment_id ORDER BY e.started_at DESC`
  );
  res.json(rows);
});

// ---------- comparison ----------
router.get('/comparison/experiments', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT e.id, e.name, t.name AS task_name FROM experiments e JOIN tasks t ON t.id=e.task_id
     WHERE e.status='completed' ORDER BY e.started_at DESC`
  );
  res.json(rows);
});

router.get('/comparison', async (req, res) => {
  const baseId = Number(req.query.baseId);
  const targetId = Number(req.query.targetId);
  if (!baseId || !targetId) return res.status(400).json({ error: 'baseId и targetId обязательны' });

  const fetchOne = async (id: number) => {
    const [[row]]: any = await pool.query(
      `SELECT e.id, e.name, e.task_id, e.dataset_id, e.hardware, t.name AS task_name, d.name AS dataset_name, r.*
       FROM experiments e JOIN tasks t ON t.id=e.task_id
       LEFT JOIN datasets d ON d.id=e.dataset_id
       LEFT JOIN experiment_results r ON r.experiment_id=e.id WHERE e.id=?`,
      [id]
    );
    return row;
  };
  const [base, target] = await Promise.all([fetchOne(baseId), fetchOne(targetId)]);
  if (!base || !target) return res.status(404).json({ error: 'not_found' });

  const metricDefs = [
    { key: 'response_time_ms', label: 'Время ответа', unit: 'мс', lowerIsBetter: true, threshold: 0.15 },
    { key: 'rps', label: 'Пропускная способность', unit: 'запросов/с', lowerIsBetter: false, threshold: 0.1 },
    { key: 'memory_mb', label: 'Расход памяти', unit: 'МБ', lowerIsBetter: true, threshold: 0.2 },
    { key: 'train_time_s', label: 'Время обучения', unit: 'с', lowerIsBetter: true, threshold: 0.2 },
    { key: 'quality_score', label: 'Качество рекомендаций', unit: 'балл', lowerIsBetter: false, threshold: 0.03 },
    { key: 'errors_count', label: 'Число ошибок', unit: 'шт', lowerIsBetter: true, threshold: 0 },
  ];
  const metrics = metricDefs.map((m) => {
    const before = Number(base[m.key] ?? 0);
    const after = Number(target[m.key] ?? 0);
    const change = before === 0 ? 0 : ((after - before) / before) * 100;
    let verdict: 'ok' | 'watch' | 'regression' = 'ok';
    if (m.key === 'quality_score' && after < before) verdict = 'regression';
    else if (m.lowerIsBetter && after > before * (1 + m.threshold)) verdict = 'regression';
    else if (!m.lowerIsBetter && after < before * (1 - m.threshold)) verdict = 'regression';
    else if (Math.abs(change) < 2) verdict = 'watch';
    return { metric: m.label, unit: m.unit, before, after, change: Math.round(change * 10) / 10, verdict };
  });

  const conditionDiffs: any[] = [];
  if (base.hardware !== target.hardware) {
    conditionDiffs.push({ parameter: 'Оборудование', base: base.hardware, target: target.hardware, impact: 'Влияет на сопоставимость результатов' });
  }
  if (base.dataset_id !== target.dataset_id) {
    conditionDiffs.push({ parameter: 'Набор данных', base: base.dataset_name, target: target.dataset_name, impact: 'Разные данные — сравнение некорректно' });
  }
  const comparable = conditionDiffs.length === 0;

  res.json({
    base: { id: base.id, name: base.name, task_name: base.task_name },
    target: { id: target.id, name: target.name, task_name: target.task_name },
    comparable,
    metrics,
    conditionDiffs,
  });
});

// ---------- operations ----------
router.get('/operations/deployments', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT dp.id, t.name AS task_name, mv.version_label, b.name AS block_name, dp.started_at, dp.traffic_share_pct, dp.status
     FROM deployments dp JOIN tasks t ON t.id=dp.task_id
     LEFT JOIN model_versions mv ON mv.id=dp.model_version_id
     LEFT JOIN recommendation_blocks b ON b.id=dp.block_id
     ORDER BY dp.started_at DESC`
  );
  res.json(rows);
});

router.get('/operations/errors', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT de.id, de.occurred_at, t.name AS task_name, mv.version_label, de.error_type, de.affected_requests, de.fix_status
     FROM deployment_errors de
     JOIN deployments dp ON dp.id=de.deployment_id
     JOIN tasks t ON t.id=dp.task_id
     LEFT JOIN model_versions mv ON mv.id=dp.model_version_id
     ORDER BY de.occurred_at DESC`
  );
  res.json(rows);
});

// ---------- reports ----------
router.get('/reports', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT r.id, r.name, r.category, r.period_start, r.period_end, r.metrics_included, r.created_at, r.author, b.name AS block_name
     FROM reports r LEFT JOIN recommendation_blocks b ON b.id=r.block_id ORDER BY r.created_at DESC`
  );
  res.json(rows);
});

// ---------- settings ----------
router.get('/settings/users', async (_req, res) => {
  const [rows] = await pool.query(`SELECT id, full_name, email, role, available_tasks FROM users ORDER BY full_name`);
  res.json(rows);
});

router.get('/settings/hardware', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT device_name, ROUND(AVG(util_pct),1) AS avg_util_pct, ROUND(AVG(memory_used_mb)) AS avg_memory_used_mb,
            MAX(peak_memory_mb) AS peak_memory_mb, SUM(errors_count) AS errors_count
     FROM hardware_devices GROUP BY device_name ORDER BY device_name`
  );
  res.json(rows);
});

router.get('/settings/metrics', async (_req, res) => {
  const [rows] = await pool.query(`SELECT * FROM metrics_catalog ORDER BY name`);
  res.json(rows);
});

// ---------- AI insight ----------
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

router.post('/ai/summary', async (req, res) => {
  if (!openai) return res.status(503).json({ error: 'OPENAI_API_KEY не настроен на сервере' });
  try {
    const { summary, blocks } = req.body || {};
    const prompt = `Ты аналитик GPU-сервиса рекомендаций ООО «Спортмастер». Кратко (4-6 предложений, по-русски, без markdown-заголовков) опиши состояние сервиса на основе данных и дай 1-2 практические рекомендации.
Сводные показатели: ${JSON.stringify(summary)}.
Показатели по блокам: ${JSON.stringify((blocks || []).slice(0, 10))}.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Ты — аналитик MLOps, пишешь кратко, по делу, на русском языке.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });

    const text = completion.choices[0]?.message?.content?.trim() || 'Не удалось получить ответ.';
    res.json({ summary: text });
  } catch (err: any) {
    console.error('OpenAI error:', err?.message || err);
    res.status(502).json({ error: 'Ошибка обращения к OpenAI', detail: err?.message });
  }
});
