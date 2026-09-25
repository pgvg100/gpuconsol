import { useEffect, useState } from 'react';
import { api, type Dataset, type DatasetIssue } from '../api';
import { Card, StatusBadge, Table, Tabs, useTab, fmtNum, fmtDateOnly, fmtDate } from '../components/ui';

type DatasetDetail = { dataset: Dataset & { data_types: string; source: string; usage_policy: string }; tasks: { id: number; name: string }[]; issues: DatasetIssue[] };

export function DataPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [tab, setTab] = useTab(['Наборы данных', 'Состав', 'Проверка качества']);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [allIssues, setAllIssues] = useState<DatasetIssue[]>([]);

  useEffect(() => {
    api.get('/datasets').then((r) => setDatasets(r.data));
    api.get('/dataset-issues').then((r) => setAllIssues(r.data));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    api.get(`/datasets/${selectedId}`).then((r) => setDetail(r.data));
  }, [selectedId]);

  function openDataset(id: number) {
    setSelectedId(id);
    setTab('Состав');
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Данные</h1>
          <p>Наборы данных для обучения и проверки моделей рекомендаций</p>
        </div>
      </div>

      <Tabs tabs={['Наборы данных', 'Состав', 'Проверка качества']} active={tab} onChange={setTab} />

      {tab === 'Наборы данных' && (
        <Card title="Наборы данных">
          <Table
            columns={[
              { key: 'id', label: '№' },
              { key: 'name', label: 'Название' },
              { key: 'source', label: 'Источник' },
              { key: 'period_start', label: 'Период', render: (r) => `${fmtDateOnly(r.period_start)} — ${fmtDateOnly(r.period_end)}` },
              { key: 'records_count', label: 'Объём, записей', align: 'right', render: (r) => fmtNum(r.records_count) },
              { key: 'updated_at', label: 'Дата обновления', render: (r) => fmtDate(r.updated_at) },
              { key: 'quality_check_result', label: 'Результат проверки', render: (r) => <StatusBadge status={r.quality_check_result} /> },
            ]}
            rows={datasets}
            onRowClick={(r) => openDataset(r.id)}
          />
        </Card>
      )}

      {tab === 'Состав' && (
        detail ? (
          <Card title={detail.dataset.name}>
            <div className="field-grid">
              <div className="field"><label>Источник</label><div>{detail.dataset.source}</div></div>
              <div className="field"><label>Период формирования</label><div>{fmtDateOnly(detail.dataset.period_start)} — {fmtDateOnly(detail.dataset.period_end)}</div></div>
              <div className="field"><label>Типы сведений</label><div>{detail.dataset.data_types}</div></div>
              <div className="field"><label>Число записей</label><div>{fmtNum(detail.dataset.records_count)}</div></div>
              <div className="field"><label>Дата обновления</label><div>{fmtDate(detail.dataset.updated_at)}</div></div>
              <div className="field"><label>Разрешённый способ использования</label><div>{detail.dataset.usage_policy}</div></div>
              <div className="field"><label>Связанные задачи</label><div>{detail.tasks.map((t) => t.name).join(', ') || '—'}</div></div>
              <div className="field"><label>Результат проверки</label><div><StatusBadge status={detail.dataset.quality_check_result} /></div></div>
            </div>
          </Card>
        ) : <div className="muted">Выберите набор данных в списке, чтобы увидеть его состав.</div>
      )}

      {tab === 'Проверка качества' && (
        <Card title="Проблемы качества">
          <Table
            columns={[
              { key: 'dataset_name', label: 'Набор' },
              { key: 'field', label: 'Поле' },
              { key: 'issue_type', label: 'Тип проблемы' },
              { key: 'affected_records', label: 'Затронуто записей', align: 'right', render: (r) => fmtNum(r.affected_records) },
              { key: 'fix_status', label: 'Состояние исправления', render: (r) => <StatusBadge status={r.fix_status} /> },
            ]}
            rows={allIssues}
          />
        </Card>
      )}
    </div>
  );
}
