import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from 'recharts';
import { api, type Overview as OverviewData } from '../api';
import { useApp } from '../AppContext';
import { Card, StatCard, StatusBadge, Table, Tabs, useTab, fmtNum, fmtDec, fmtDate } from '../components/ui';

export function Overview() {
  const { period, blockId } = useApp();
  const [data, setData] = useState<OverviewData | null>(null);
  const [tab, setTab] = useTab(['Состояние', 'Нагрузка', 'Последние изменения']);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api.get('/overview', { params: { period, blockId: blockId ?? undefined } }).then((r) => setData(r.data));
  }, [period, blockId]);

  async function requestAiSummary() {
    if (!data) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const r = await api.post('/ai/summary', { summary: data.summary, blocks: data.blocks });
      setAiText(r.data.summary);
    } catch (e: any) {
      setAiError(e?.response?.data?.error || 'Не удалось получить AI-анализ');
    } finally {
      setAiLoading(false);
    }
  }

  if (!data) return <div className="muted">Загрузка...</div>;
  const { summary, blocks, daily, events } = data;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Обзор</h1>
          <p>Состояние системы товарных рекомендаций за последние {period} дней</p>
        </div>
      </div>

      <Tabs tabs={['Состояние', 'Нагрузка', 'Последние изменения']} active={tab} onChange={setTab} />

      {tab === 'Состояние' && (
        <>
          <div className="stat-grid">
            <StatCard label="Обработано запросов" value={fmtNum(summary.requests_count)} tone="hero" />
            <StatCard label="Среднее время ответа" value={`${fmtDec(summary.avg_response_ms)} мс`} />
            <StatCard label="Время ответа P95" value={`${fmtDec(summary.p95_response_ms)} мс`} />
            <StatCard
              label="Блоков с повышенной долей ошибок"
              value={String(summary.error_blocks)}
              tone={summary.error_blocks > 0 ? 'warn' : 'ok'}
            />
            <StatCard label="Загрузка GPU" value={`${fmtDec(summary.gpu_util_pct)}%`} tone={summary.gpu_util_pct > 85 ? 'warn' : undefined} />
            <StatCard label="Использование памяти GPU" value={`${fmtDec(summary.gpu_mem_util_pct)}%`} />
          </div>

          <Card
            title="AI-анализ состояния"
            action={
              <button className="btn" onClick={requestAiSummary} disabled={aiLoading}>
                {aiLoading ? 'Анализирую…' : 'Сформировать анализ'}
              </button>
            }
          >
            {aiError && <div className="notice">{aiError}</div>}
            {aiText ? <div className="ai-box">{aiText}</div> : <div className="muted">Нажмите «Сформировать анализ», чтобы получить краткую сводку от модели GPT по текущим показателям.</div>}
          </Card>

          <Card title="Рекомендательные блоки">
            <Table
              columns={[
                { key: 'name', label: 'Блок' },
                { key: 'placement', label: 'Место показа' },
                { key: 'current_version', label: 'Версия модели' },
                { key: 'requests_count', label: 'Запросов', align: 'right', render: (r) => fmtNum(r.requests_count) },
                { key: 'avg_response_ms', label: 'Время ответа, мс', align: 'right', render: (r) => fmtDec(r.avg_response_ms) },
                { key: 'error_rate_pct', label: 'Доля ошибок, %', align: 'right', render: (r) => fmtDec(r.error_rate_pct, 2) },
                { key: 'status', label: 'Состояние', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={blocks}
            />
          </Card>
        </>
      )}

      {tab === 'Нагрузка' && (
        <Card title="Запросы и загрузка GPU по дням">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e51c2b" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#e51c2b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e0d4" />
              <XAxis dataKey="metric_date" tick={{ fill: '#9a9f8f', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: '#9a9f8f', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e4e0d4', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="requests_count" stroke="#e51c2b" fill="url(#reqGrad)" name="Запросов" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ height: 18 }} />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e0d4" />
              <XAxis dataKey="metric_date" tick={{ fill: '#9a9f8f', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: '#9a9f8f', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e4e0d4', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="gpu_util_pct" stroke="#1642c9" dot={false} name="Загрузка GPU, %" />
              <Line type="monotone" dataKey="error_rate_pct" stroke="#c81e3a" dot={false} name="Доля ошибок, %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === 'Последние изменения' && (
        <Card title="Последние события">
          <Table
            columns={[
              { key: 'occurred_at', label: 'Время', render: (r) => fmtDate(r.occurred_at) },
              { key: 'block_name', label: 'Блок' },
              { key: 'event_type', label: 'Событие' },
              { key: 'affected_version', label: 'Версия' },
              { key: 'result', label: 'Результат' },
            ]}
            rows={events}
          />
        </Card>
      )}
    </div>
  );
}
