import { useEffect, useState } from 'react';
import { api, type SettingsUser, type HardwareSummary, type MetricDef } from '../api';
import { Card, Table, Tabs, useTab, fmtDec, fmtNum } from '../components/ui';

export function Settings() {
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [hardware, setHardware] = useState<HardwareSummary[]>([]);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [tab, setTab] = useTab(['Пользователи', 'Права', 'Оборудование', 'Показатели']);

  useEffect(() => {
    api.get('/settings/users').then((r) => setUsers(r.data));
    api.get('/settings/hardware').then((r) => setHardware(r.data));
    api.get('/settings/metrics').then((r) => setMetrics(r.data));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Настройки</h1>
          <p>Пользователи, права доступа, оборудование и правила измерения показателей</p>
        </div>
      </div>

      <Tabs tabs={['Пользователи', 'Права', 'Оборудование', 'Показатели']} active={tab} onChange={setTab} />

      {tab === 'Пользователи' && (
        <Card title="Пользователи">
          <Table
            columns={[
              { key: 'full_name', label: 'Учётная запись' },
              { key: 'email', label: 'Почта' },
              { key: 'role', label: 'Роль' },
              { key: 'available_tasks', label: 'Доступные задачи' },
            ]}
            rows={users}
          />
        </Card>
      )}

      {tab === 'Права' && (
        <Card title="Права доступа по ролям">
          <Table
            columns={[
              { key: 'role', label: 'Роль' },
              { key: 'full_name', label: 'Сотрудник' },
              { key: 'available_tasks', label: 'Доступные задачи' },
            ]}
            rows={users}
          />
        </Card>
      )}

      {tab === 'Оборудование' && (
        <Card title="Оборудование">
          <Table
            columns={[
              { key: 'device_name', label: 'Устройство' },
              { key: 'avg_util_pct', label: 'Средняя загрузка, %', align: 'right', render: (r) => fmtDec(r.avg_util_pct) },
              { key: 'avg_memory_used_mb', label: 'Занятая память, МБ', align: 'right', render: (r) => fmtNum(r.avg_memory_used_mb) },
              { key: 'peak_memory_mb', label: 'Пиковое потребление, МБ', align: 'right', render: (r) => fmtNum(r.peak_memory_mb) },
              { key: 'errors_count', label: 'Ошибки', align: 'right' },
            ]}
            rows={hardware}
          />
        </Card>
      )}

      {tab === 'Показатели' && (
        <Card title="Показатели">
          <Table
            columns={[
              { key: 'name', label: 'Название показателя' },
              { key: 'unit', label: 'Единица измерения' },
              { key: 'threshold', label: 'Допустимая граница' },
            ]}
            rows={metrics}
          />
        </Card>
      )}
    </div>
  );
}
