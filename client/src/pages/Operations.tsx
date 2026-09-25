import { useEffect, useState } from 'react';
import { api, type Deployment, type DeploymentError, type Overview as OverviewData } from '../api';
import { Card, StatusBadge, Table, Tabs, useTab, fmtDate, fmtDec, fmtNum } from '../components/ui';
import { useApp } from '../AppContext';

export function Operations() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [errors, setErrors] = useState<DeploymentError[]>([]);
  const [tab, setTab] = useTab(['Действующие версии', 'Внедрение', 'Наблюдение', 'Ошибки']);
  const [selected, setSelected] = useState<Deployment | null>(null);
  const { period } = useApp();
  const [monitoring, setMonitoring] = useState<OverviewData | null>(null);

  useEffect(() => {
    api.get('/operations/deployments').then((r) => setDeployments(r.data));
    api.get('/operations/errors').then((r) => setErrors(r.data));
  }, []);

  useEffect(() => {
    if (tab === 'Наблюдение') {
      api.get('/overview', { params: { period } }).then((r) => setMonitoring(r.data));
    }
  }, [tab, period]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Работа сервиса</h1>
          <p>Действующие версии моделей, внедрение и наблюдение за рекомендациями в проде</p>
        </div>
      </div>

      <Tabs tabs={['Действующие версии', 'Внедрение', 'Наблюдение', 'Ошибки']} active={tab} onChange={setTab} />

      {tab === 'Действующие версии' && (
        <Card title="Действующие версии">
          <Table
            columns={[
              { key: 'task_name', label: 'Задача' },
              { key: 'version_label', label: 'Версия' },
              { key: 'block_name', label: 'Место показа' },
              { key: 'started_at', label: 'Дата запуска', render: (r) => fmtDate(r.started_at) },
              { key: 'traffic_share_pct', label: 'Доля запросов, %', align: 'right', render: (r) => fmtDec(r.traffic_share_pct) },
              { key: 'status', label: 'Состояние', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={deployments}
            onRowClick={(r) => { setSelected(r); setTab('Внедрение'); }}
          />
        </Card>
      )}

      {tab === 'Внедрение' && (
        selected ? (
          <Card title={`Внедрение — ${selected.task_name}`}>
            <div className="field-grid">
              <div className="field"><label>Задача</label><div>{selected.task_name}</div></div>
              <div className="field"><label>Проверенная версия</label><div>{selected.version_label}</div></div>
              <div className="field"><label>Среда запуска</label><div>prod</div></div>
              <div className="field"><label>Доля запросов для новой версии</label><div>{fmtDec(selected.traffic_share_pct)}%</div></div>
              <div className="field"><label>Дата начала</label><div>{fmtDate(selected.started_at)}</div></div>
              <div className="field"><label>Состояние</label><div><StatusBadge status={selected.status} /></div></div>
            </div>
          </Card>
        ) : <div className="muted">Выберите строку на вкладке «Действующие версии», чтобы увидеть параметры внедрения.</div>
      )}

      {tab === 'Наблюдение' && (
        monitoring ? (
          <Card title="Наблюдение за сервисом">
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">Обработано запросов</div><div className="stat-value">{fmtNum(monitoring.summary.requests_count)}</div></div>
              <div className="stat-card"><div className="stat-label">Среднее время ответа</div><div className="stat-value">{fmtDec(monitoring.summary.avg_response_ms)} мс</div></div>
              <div className="stat-card"><div className="stat-label">Загрузка GPU</div><div className="stat-value">{fmtDec(monitoring.summary.gpu_util_pct)}%</div></div>
              <div className="stat-card"><div className="stat-label">Блоков с ошибками</div><div className="stat-value">{monitoring.summary.error_blocks}</div></div>
            </div>
            <Table
              columns={[
                { key: 'name', label: 'Блок' },
                { key: 'requests_count', label: 'Запросов', align: 'right', render: (r) => fmtNum(r.requests_count) },
                { key: 'avg_response_ms', label: 'Время ответа, мс', align: 'right', render: (r) => fmtDec(r.avg_response_ms) },
                { key: 'error_rate_pct', label: 'Доля ошибок, %', align: 'right', render: (r) => fmtDec(r.error_rate_pct, 2) },
                { key: 'status', label: 'Состояние', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={monitoring.blocks}
            />
          </Card>
        ) : <div className="muted">Загрузка...</div>
      )}

      {tab === 'Ошибки' && (
        <Card title="Ошибки">
          <Table
            columns={[
              { key: 'occurred_at', label: 'Время', render: (r) => fmtDate(r.occurred_at) },
              { key: 'task_name', label: 'Задача' },
              { key: 'version_label', label: 'Версия' },
              { key: 'error_type', label: 'Тип ошибки' },
              { key: 'affected_requests', label: 'Затронуто запросов', align: 'right', render: (r) => fmtNum(r.affected_requests) },
              { key: 'fix_status', label: 'Состояние устранения', render: (r) => <StatusBadge status={r.fix_status} /> },
            ]}
            rows={errors}
          />
        </Card>
      )}
    </div>
  );
}
