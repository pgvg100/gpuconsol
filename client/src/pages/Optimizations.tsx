import { useEffect, useState } from 'react';
import { api, type Experiment, type ExperimentResult } from '../api';
import { Card, StatusBadge, Table, Tabs, useTab, fmtDec, fmtDate, fmtNum } from '../components/ui';

export function Optimizations() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [tab, setTab] = useTab(['Предложения', 'Эксперименты', 'Результаты']);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api.get('/optimizations/experiments').then((r) => setExperiments(r.data));
    api.get('/optimizations/results').then((r) => setResults(r.data));
  }, []);

  async function openExperiment(id: number) {
    const r = await api.get(`/optimizations/experiments/${id}`);
    setSelected(r.data);
  }

  const proposals = experiments.filter((e) => e.status === 'planned' || e.status === 'running');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Оптимизации</h1>
          <p>Предложения по ускорению, эксперименты и их результаты</p>
        </div>
      </div>

      <Tabs tabs={['Предложения', 'Эксперименты', 'Результаты']} active={tab} onChange={setTab} />

      {tab === 'Предложения' && (
        <Card title="Предложения к проверке" action={<span className="muted">Запланированные и выполняющиеся эксперименты</span>}>
          <Table
            columns={[
              { key: 'name', label: 'Название' },
              { key: 'task_name', label: 'Связанная задача' },
              { key: 'base_version', label: 'Исходная версия' },
              { key: 'responsible', label: 'Ответственный' },
              { key: 'started_at', label: 'Дата', render: (r) => fmtDate(r.started_at) },
              { key: 'status', label: 'Состояние', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={proposals}
            onRowClick={(r) => openExperiment(r.id)}
            empty="Нет активных предложений — все эксперименты завершены."
          />
        </Card>
      )}

      {tab === 'Эксперименты' && (
        <Card title="Эксперименты">
          <Table
            columns={[
              { key: 'id', label: '№' },
              { key: 'name', label: 'Название' },
              { key: 'base_version', label: 'Исходная версия' },
              { key: 'responsible', label: 'Ответственный' },
              { key: 'started_at', label: 'Дата', render: (r) => fmtDate(r.started_at) },
              { key: 'status', label: 'Состояние', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={experiments}
            onRowClick={(r) => openExperiment(r.id)}
          />
        </Card>
      )}

      {tab === 'Результаты' && (
        <>
          <Card title="Результаты завершённых экспериментов">
            <Table
              columns={[
                { key: 'name', label: 'Эксперимент' },
                { key: 'response_time_ms', label: 'Время ответа, мс', align: 'right', render: (r) => fmtDec(r.response_time_ms) },
                { key: 'rps', label: 'Запросов/с', align: 'right', render: (r) => fmtDec(r.rps) },
                { key: 'memory_mb', label: 'Память, МБ', align: 'right', render: (r) => fmtNum(r.memory_mb) },
                { key: 'train_time_s', label: 'Время обучения, с', align: 'right', render: (r) => fmtNum(r.train_time_s) },
                { key: 'quality_score', label: 'Качество', align: 'right', render: (r) => fmtDec(r.quality_score, 3) },
                { key: 'errors_count', label: 'Ошибки', align: 'right' },
              ]}
              rows={results}
              onRowClick={(r) => openExperiment(r.experiment_id)}
            />
          </Card>
          {selected && (
            <Card title={`Параметры запуска — ${selected.experiment.name}`}>
              <div className="field-grid">
                <div className="field"><label>Изменённые параметры</label><div className="mono">{selected.experiment.changed_params}</div></div>
                <div className="field"><label>Описание изменения</label><div>{selected.experiment.change_description}</div></div>
                <div className="field"><label>Оборудование</label><div>{selected.experiment.hardware}</div></div>
                <div className="field"><label>Ответственный</label><div>{selected.experiment.responsible}</div></div>
              </div>
              {selected.result && (
                <>
                  <div style={{ height: 14 }} />
                  <div className="field"><label>Журнал выполнения</label><div className="mono muted">{selected.result.log_excerpt}</div></div>
                </>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
