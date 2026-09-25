import { useEffect, useState } from 'react';
import { api, type Report } from '../api';
import { Card, Table, Tabs, useTab, fmtDate, fmtDateOnly } from '../components/ui';

const CATEGORY_TAB: Record<string, string> = { tasks: 'По задачам', experiments: 'По экспериментам', periods: 'По периодам' };

export function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useTab(['По задачам', 'По экспериментам', 'По периодам']);

  useEffect(() => {
    api.get('/reports').then((r) => setReports(r.data));
  }, []);

  const catKey = Object.keys(CATEGORY_TAB).find((k) => CATEGORY_TAB[k] === tab)!;
  const filtered = reports.filter((r) => r.category === catKey);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Отчёты</h1>
          <p>Сохранённые отчёты по задачам, экспериментам и периодам</p>
        </div>
      </div>

      <Tabs tabs={['По задачам', 'По экспериментам', 'По периодам']} active={tab} onChange={setTab} />

      <Card title="Отчёты">
        <Table
          columns={[
            { key: 'name', label: 'Название' },
            { key: 'period_start', label: 'Период', render: (r) => `${fmtDateOnly(r.period_start)} — ${fmtDateOnly(r.period_end)}` },
            { key: 'block_name', label: 'Блок', render: (r) => r.block_name || 'Все блоки' },
            { key: 'metrics_included', label: 'Состав показателей' },
            { key: 'created_at', label: 'Дата формирования', render: (r) => fmtDate(r.created_at) },
            { key: 'author', label: 'Автор' },
          ]}
          rows={filtered}
        />
      </Card>
    </div>
  );
}
