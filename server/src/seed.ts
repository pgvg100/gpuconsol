import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function rnd(min: number, max: number, digits = 0) {
  const v = Math.random() * (max - min) + min;
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, rnd(0, 59), 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function dateOnly(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('Применяю схему...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await conn.query(schema);
  await conn.query(`USE ${process.env.DB_NAME || 'sportmaster_gpu'}`);

  const ins = async (sql: string, params: any[] = []) => {
    const [res]: any = await conn.query(sql, params);
    return res.insertId as number;
  };

  console.log('Пользователи...');
  const users = [
    ['Ирина Соколова', 'i.sokolova@sportmaster.ru', 'Администратор', 'Все задачи'],
    ['Дмитрий Волков', 'd.volkov@sportmaster.ru', 'ML-инженер', 'Похожие товары, Сопутствующие товары'],
    ['Анна Кузнецова', 'a.kuznecova@sportmaster.ru', 'ML-инженер', 'Персональные подборки'],
    ['Сергей Морозов', 's.morozov@sportmaster.ru', 'Инженер эксплуатации', 'Все задачи'],
    ['Ольга Никитина', 'o.nikitina@sportmaster.ru', 'Аналитик данных', 'Все задачи'],
    ['Павел Егоров', 'p.egorov@sportmaster.ru', 'Руководитель направления', 'Все задачи'],
  ];
  for (const u of users) await ins('INSERT INTO users (full_name, email, role, available_tasks) VALUES (?,?,?,?)', u);

  console.log('Задачи...');
  const taskIds: number[] = [];
  taskIds.push(await ins(
    `INSERT INTO tasks (name, placement, purpose, team, data_source, hardware, sla_response_ms, quality_target, status)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    ['Подбор похожих товаров', 'Карточка товара (сайт и приложение)',
     'Показ товаров, похожих на просматриваемый, для увеличения глубины просмотра и конверсии',
     'ML-рекомендации', 'Каталог товаров + история просмотров', 'NVIDIA A100 40GB ×2', 120, 'Recall@10 ≥ 0.35', 'active']
  ));
  taskIds.push(await ins(
    `INSERT INTO tasks (name, placement, purpose, team, data_source, hardware, sla_response_ms, quality_target, status)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    ['Подбор сопутствующих товаров', 'Карточка товара и корзина',
     'Кросс-категорийные рекомендации товаров, дополняющих выбранный',
     'ML-рекомендации', 'История совместных покупок', 'NVIDIA A100 40GB ×2', 150, 'CTR ≥ 4.5%', 'active']
  ));
  taskIds.push(await ins(
    `INSERT INTO tasks (name, placement, purpose, team, data_source, hardware, sla_response_ms, quality_target, status)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    ['Формирование персональных подборок', 'Главная страница сайта и приложения',
     'Персональная лента рекомендаций на основе профиля и истории покупателя',
     'ML-персонализация', 'Профиль покупателя + история заказов и просмотров', 'NVIDIA A100 80GB ×4', 200, 'NDCG@20 ≥ 0.42', 'active']
  ));

  console.log('Версии моделей...');
  const versionLabels = ['v1.0', 'v1.1', 'v2.0-rc1', 'v2.0'];
  const versionStatuses = ['archived', 'archived', 'in_review', 'deployed'];
  const versionIdsByTask: number[][] = [];
  const authors = ['Дмитрий Волков', 'Анна Кузнецова', 'Ольга Никитина'];
  for (const taskId of taskIds) {
    const ids: number[] = [];
    for (let i = 0; i < versionLabels.length; i++) {
      const id = await ins(
        `INSERT INTO model_versions (task_id, version_label, created_at, author, description, test_results, status)
         VALUES (?,?,?,?,?,?,?)`,
        [taskId, versionLabels[i], daysAgo((versionLabels.length - i) * 20), pick(authors),
         i === 0 ? 'Базовая модель на коллаборативной фильтрации' :
         i === 1 ? 'Добавлены признаки сезонности и остатков на складе' :
         i === 2 ? 'Переход на двухбашенную нейросеть, кандидат в прод' :
         'Двухбашенная нейросеть + переранжирование, текущая боевая версия',
         i < 2 ? 'Пройдено, метрики в норме' : i === 2 ? 'На проверке качества' : 'Пройдено, ускорение подтверждено',
         versionStatuses[i]]
      );
      ids.push(id);
    }
    versionIdsByTask.push(ids);
    await conn.query('UPDATE tasks SET current_model_version_id=? WHERE id=?', [ids[3], taskId]);
  }

  console.log('Рекомендательные блоки...');
  const blockDefs = [
    ['Похожие товары — карточка (сайт)', 'Карточка товара, сайт', 0],
    ['Похожие товары — карточка (приложение)', 'Карточка товара, приложение', 0],
    ['С этим товаром покупают', 'Карточка товара, сайт', 1],
    ['Сопутствующие товары — корзина', 'Корзина, сайт и приложение', 1],
    ['Персональная подборка — главная (сайт)', 'Главная страница, сайт', 2],
    ['Вам может понравиться — приложение', 'Главная страница, приложение', 2],
  ] as const;
  const blockIds: number[] = [];
  const blockTaskIdx: number[] = [];
  for (const [name, placement, taskIdx] of blockDefs) {
    const status = Math.random() < 0.15 ? 'degraded' : 'ok';
    const id = await ins(
      `INSERT INTO recommendation_blocks (name, placement, task_id, current_model_version_id, status)
       VALUES (?,?,?,?,?)`,
      [name, placement, taskIds[taskIdx], versionIdsByTask[taskIdx][3], status]
    );
    blockIds.push(id);
    blockTaskIdx.push(taskIdx);
  }

  console.log('Метрики блоков за 30 дней...');
  const baseRequests = [180000, 90000, 140000, 70000, 260000, 150000];
  for (let b = 0; b < blockIds.length; b++) {
    for (let d = 29; d >= 0; d--) {
      const jitter = rnd(0.85, 1.15, 3);
      const requests = Math.round(baseRequests[b] * jitter);
      const avg = rnd(38, 95, 1);
      const p95 = avg + rnd(35, 90, 1);
      const err = rnd(0.05, 1.4, 3);
      const gpu = rnd(52, 88, 1);
      const mem = rnd(38, 78, 1);
      await conn.query(
        `INSERT INTO block_metrics_daily (block_id, metric_date, requests_count, avg_response_ms, p95_response_ms, error_rate_pct, gpu_util_pct, gpu_mem_util_pct)
         VALUES (?,?,?,?,?,?,?,?)`,
        [blockIds[b], dateOnly(d), requests, avg, p95, err, gpu, mem]
      );
    }
  }

  console.log('Последние события...');
  const eventTypes = [
    ['Проверка качества запущена', 'Успешно'],
    ['Оптимизация завершена', 'Ускорение на 18%'],
    ['Смена версии модели', 'Выкат в прод'],
    ['Обнаружена ошибка', 'Рост доли ошибок'],
    ['Откат версии', 'Возврат к предыдущей версии'],
  ];
  for (let i = 0; i < 16; i++) {
    const b = Math.floor(Math.random() * blockIds.length);
    const [type, result] = pick(eventTypes);
    await ins(
      `INSERT INTO events (occurred_at, block_id, event_type, affected_version, result) VALUES (?,?,?,?,?)`,
      [daysAgo(rnd(0, 28), rnd(7, 20)), blockIds[b], type, pick(versionLabels), result]
    );
  }

  console.log('Наборы данных...');
  const datasetDefs = [
    ['Просмотры и клики — сайт/приложение', 'Кликстрим (Kafka → DWH)', 90, 'события просмотра, клики, время на странице', 120_400_000, 'Обезличенные агрегаты, доступ по роли ML-инженер', 'passed', [0, 1, 2]],
    ['История заказов', 'OMS (система заказов)', 730, 'заказы, состав корзины, суммы', 18_500_000, 'Доступ по роли аналитик/ML-инженер, персональные данные скрыты', 'warning', [1, 2]],
    ['Каталог товаров', 'PIM (управление товарными данными)', 1, 'атрибуты товаров, категории, остатки, изображения', 640_000, 'Открыт для всех ролей сервиса', 'passed', [0, 1, 2]],
    ['Профили покупателей (агрегаты)', 'CDP (клиентская платформа)', 365, 'сегменты, предпочтения категорий, средний чек', 9_200_000, 'Только агрегированные сегменты, персональные ID запрещены', 'failed', [2]],
  ] as const;
  const datasetIds: number[] = [];
  for (const [name, source, periodDays, types, records, policy, quality, relatedTasks] of datasetDefs) {
    const id = await ins(
      `INSERT INTO datasets (name, source, period_start, period_end, data_types, records_count, updated_at, usage_policy, quality_check_result)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, source, dateOnly(periodDays), dateOnly(0), types, records, daysAgo(rnd(0, 3)), policy, quality]
    );
    datasetIds.push(id);
    for (const t of relatedTasks) {
      await conn.query('INSERT INTO dataset_tasks (dataset_id, task_id) VALUES (?,?)', [id, taskIds[t]]);
    }
  }

  console.log('Проблемы качества данных...');
  const issues: [number, string, string, number, string][] = [
    [datasetIds[1], 'discount_amount', 'Пропущенные значения', 42300, 'in_progress'],
    [datasetIds[1], 'customer_id', 'Дублирующиеся записи', 1850, 'open'],
    [datasetIds[3], 'segment_code', 'Несоответствие формата', 96000, 'open'],
    [datasetIds[3], 'avg_check', 'Пропущенные значения', 15200, 'fixed'],
    [datasetIds[0], 'session_id', 'Дублирующиеся записи', 7600, 'fixed'],
  ];
  for (const row of issues) {
    await ins(`INSERT INTO dataset_issues (dataset_id, field, issue_type, affected_records, fix_status) VALUES (?,?,?,?,?)`, row);
  }

  console.log('Запуски профилирования...');
  const stageNames = ['Подготовка данных', 'Загрузка на GPU', 'Вычисления модели', 'Формирование ответа'];
  const runIds: number[] = [];
  for (let i = 0; i < 9; i++) {
    const taskIdx = i % 3;
    const runType = i % 3 === 0 ? 'train' : 'inference';
    const duration = runType === 'train' ? Math.round(rnd(1_800_000, 5_400_000)) : Math.round(rnd(60, 400));
    const runId = await ins(
      `INSERT INTO profiling_runs (task_id, model_version_id, dataset_id, run_type, hardware_config, batch_size, started_at, duration_ms, responsible, result)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [taskIds[taskIdx], pick(versionIdsByTask[taskIdx]), pick(datasetIds), runType,
       pick(['4× NVIDIA A100 80GB, NVLink', '2× NVIDIA A100 40GB', '1× NVIDIA T4 16GB']),
       pick([64, 128, 256, 512]), daysAgo(rnd(0, 25), rnd(6, 22)), duration, pick(authors),
       Math.random() < 0.2 ? 'Обнаружено узкое место на этапе подготовки данных' : 'Успешно']
    );
    runIds.push(runId);

    let remaining = 100;
    for (let s = 0; s < stageNames.length; s++) {
      const share = s === stageNames.length - 1 ? remaining : rnd(8, Math.min(45, remaining - 5), 1);
      remaining = Math.round((remaining - share) * 10) / 10;
      await ins(
        `INSERT INTO profiling_stages (run_id, stage_name, time_ms, share_pct, gpu_util_pct, memory_mb, ops_count)
         VALUES (?,?,?,?,?,?,?)`,
        [runId, stageNames[s], Math.round(duration * share / 100), share, rnd(20, 92, 1), Math.round(rnd(512, 18000)), Math.round(rnd(1e6, 5e8))]
      );
    }

    const deviceCount = pick([1, 2, 4]);
    for (let g = 0; g < deviceCount; g++) {
      await ins(
        `INSERT INTO hardware_devices (run_id, device_name, util_pct, memory_used_mb, peak_memory_mb, errors_count)
         VALUES (?,?,?,?,?,?)`,
        [runId, `GPU ${g}: NVIDIA A100 80GB`, rnd(45, 95, 1), Math.round(rnd(8000, 62000)), Math.round(rnd(9000, 78000)), Math.random() < 0.1 ? 1 : 0]
      );
    }
  }

  console.log('Эксперименты...');
  const expDefs = [
    ['Увеличение batch size с 128 до 256', 'batch_size: 128→256'],
    ['Переход инференса на FP16', 'precision: fp32→fp16'],
    ['Слияние операций (kernel fusion)', 'op_fusion: включено'],
    ['Кэширование эмбеддингов товаров', 'embedding_cache: включено'],
    ['Квантование модели INT8', 'quantization: int8'],
    ['Уменьшение размера векторного индекса', 'index_dim: 256→128'],
  ];
  const expStatuses = ['completed', 'completed', 'completed', 'running', 'planned', 'failed'];
  for (let i = 0; i < expDefs.length; i++) {
    const taskIdx = i % 3;
    const [name, params] = expDefs[i];
    const expId = await ins(
      `INSERT INTO experiments (name, task_id, base_version_id, change_description, changed_params, dataset_id, hardware, responsible, started_at, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [name, taskIds[taskIdx], versionIdsByTask[taskIdx][3], `Проверка гипотезы: ${name.toLowerCase()}`, params,
       pick(datasetIds), '4× NVIDIA A100 80GB', pick(authors), daysAgo(rnd(1, 20)), expStatuses[i]]
    );
    if (expStatuses[i] === 'completed' || expStatuses[i] === 'failed') {
      await ins(
        `INSERT INTO experiment_results (experiment_id, response_time_ms, rps, memory_mb, train_time_s, quality_score, errors_count, log_excerpt)
         VALUES (?,?,?,?,?,?,?,?)`,
        [expId, rnd(28, 90, 1), rnd(800, 4200, 1), Math.round(rnd(9000, 42000)), Math.round(rnd(900, 5200)),
         rnd(0.32, 0.46, 3), expStatuses[i] === 'failed' ? Math.round(rnd(5, 40)) : Math.round(rnd(0, 3)),
         expStatuses[i] === 'failed' ? 'OOM на этапе вычислений модели, батч превысил лимит памяти' : 'Прогон завершён без ошибок']
      );
    }
  }

  console.log('Внедрения и ошибки...');
  const environments = ['prod'];
  for (let b = 0; b < blockIds.length; b++) {
    const taskIdx = blockTaskIdx[b];
    const isCanary = Math.random() < 0.25;
    const depId = await ins(
      `INSERT INTO deployments (task_id, block_id, model_version_id, environment, traffic_share_pct, started_at, responsible, stop_condition, rollback_version_id, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [taskIds[taskIdx], blockIds[b], versionIdsByTask[taskIdx][3], pick(environments),
       isCanary ? rnd(10, 30) : 100, daysAgo(rnd(1, 15)), pick(authors),
       'Доля ошибок > 1.5% за 30 минут или рост p95 более чем в 2 раза',
       versionIdsByTask[taskIdx][1], isCanary ? 'rolling_out' : 'active']
    );
    if (Math.random() < 0.5) {
      await ins(
        `INSERT INTO deployment_errors (deployment_id, occurred_at, error_type, affected_requests, fix_status) VALUES (?,?,?,?,?)`,
        [depId, daysAgo(rnd(0, 10), rnd(8, 21)), pick(['Таймаут ответа GPU', 'Ошибка формата признаков', 'Недоступность сервиса эмбеддингов', 'Превышение памяти GPU']),
         Math.round(rnd(50, 4000)), pick(['open', 'in_progress', 'fixed'])]
      );
    }
  }

  console.log('Отчёты...');
  const reportDefs = [
    ['Отчёт по задачам за сентябрь', 'tasks', 30, null, 'время ответа, ошибки, загрузка GPU'],
    ['Итоги экспериментов Q3', 'experiments', 90, null, 'время ответа, RPS, качество рекомендаций'],
    ['Недельный отчёт по периодам', 'periods', 7, blockIds[4], 'запросы, время ответа, ошибки'],
    ['Отчёт по блоку "С этим товаром покупают"', 'tasks', 30, blockIds[2], 'CTR, время ответа, загрузка GPU'],
    ['Сравнение периодов: до/после оптимизации', 'periods', 60, null, 'время ответа, память, качество'],
  ] as const;
  for (const [name, category, periodDays, blockId, metrics] of reportDefs) {
    await ins(
      `INSERT INTO reports (name, category, period_start, period_end, block_id, metrics_included, author) VALUES (?,?,?,?,?,?,?)`,
      [name, category, dateOnly(periodDays), dateOnly(0), blockId, metrics, pick(authors)]
    );
  }

  console.log('Справочник показателей...');
  const metrics = [
    ['Среднее время ответа', 'мс', '≤ 150'],
    ['Время ответа P95', 'мс', '≤ 300'],
    ['Доля ошибок', '%', '≤ 1.0'],
    ['Загрузка GPU', '%', '60 – 85'],
    ['Использование памяти GPU', '%', '≤ 90'],
    ['Пропускная способность', 'запросов/с', '—'],
    ['NDCG@20', 'балл', '≥ 0.42'],
    ['CTR рекомендаций', '%', '≥ 4.5'],
  ];
  for (const m of metrics) await ins('INSERT INTO metrics_catalog (name, unit, threshold) VALUES (?,?,?)', m);

  console.log('Готово. База данных sportmaster_gpu заполнена.');
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
