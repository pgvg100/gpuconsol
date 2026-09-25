import { useEffect, useState } from 'react';
import { api, type Task, type TaskDetail, type ModelVersion } from '../api';
import { Card, StatusBadge, Table, Tabs, useTab, fmtDate } from '../components/ui';

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useTab(['Все задачи', 'Карточка задачи', 'История версий']);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ task: TaskDetail; versions: ModelVersion[] } | null>(null);

  useEffect(() => {
    api.get('/tasks').then((r) => setTasks(r.data));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    api.get(`/tasks/${selectedId}`).then((r) => setDetail(r.data));
  }, [selectedId]);

  function openTask(id: number) {
    setSelectedId(id);
    setTab('Карточка задачи');
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Задачи</h1>
          <p>Подбор похожих товаров, сопутствующих товаров и персональные подборки</p>
        </div>
      </div>

      <Tabs tabs={['Все задачи', 'Карточка задачи', 'История версий']} active={tab} onChange={setTab} />

      {tab === 'Все задачи' && (
        <Card title="Задачи">
          <Table
            columns={[
              { key: 'id', label: '№' },
              { key: 'name', label: 'Название' },
              { key: 'placement', label: 'Место показа' },
              { key: 'team', label: 'Команда' },
              { key: 'current_version', label: 'Версия модели' },
              { key: 'updated_at', label: 'Дата изменения', render: (r) => fmtDate(r.updated_at) },
              { key: 'status', label: 'Состояние', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={tasks}
            onRowClick={(r) => openTask(r.id)}
          />
        </Card>
      )}

      {tab === 'Карточка задачи' && (
        detail ? (
          <Card title={detail.task.name}>
            <div className="field-grid">
              <div className="field"><label>Место показа</label><div>{detail.task.placement}</div></div>
              <div className="field"><label>Назначение</label><div>{detail.task.purpose}</div></div>
              <div className="field"><label>Ответственная команда</label><div>{detail.task.team}</div></div>
              <div className="field"><label>Источник входных данных</label><div>{detail.task.data_source}</div></div>
              <div className="field"><label>Текущая модель</label><div>{detail.task.current_version}</div></div>
              <div className="field"><label>Используемое оборудование</label><div>{detail.task.hardware}</div></div>
              <div className="field"><label>Допустимое время ответа</label><div>{detail.task.sla_response_ms} мс</div></div>
              <div className="field"><label>Требование к качеству</label><div>{detail.task.quality_target}</div></div>
              <div className="field"><label>Состояние</label><div><StatusBadge status={detail.task.status} /></div></div>
            </div>
          </Card>
        ) : <div className="muted">Выберите задачу в списке «Все задачи», чтобы открыть карточку.</div>
      )}

      {tab === 'История версий' && (
        detail ? (
          <Card title={`Версии модели — ${detail.task.name}`}>
            <Table
              columns={[
                { key: 'version_label', label: 'Версия' },
                { key: 'created_at', label: 'Дата создания', render: (r) => fmtDate(r.created_at) },
                { key: 'author', label: 'Автор' },
                { key: 'description', label: 'Описание' },
                { key: 'test_results', label: 'Результаты проверки' },
                { key: 'status', label: 'Состояние', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={detail.versions}
            />
          </Card>
        ) : <div className="muted">Выберите задачу, чтобы увидеть историю версий её модели.</div>
      )}
    </div>
  );
}
