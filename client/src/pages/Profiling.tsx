import { useEffect, useState } from 'react';
import { api, type ProfilingRun, type ProfilingStage, type HardwareDevice } from '../api';
import { Card, StatusBadge, Table, Tabs, useTab, fmtNum, fmtDate, fmtDec } from '../components/ui';

export function Profiling() {
  const [runs, setRuns] = useState<ProfilingRun[]>([]);
  const [tab, setTab] = useTab(['Запуски', 'Этапы обработки', 'Оборудование']);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stages, setStages] = useState<ProfilingStage[]>([]);
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [runInfo, setRunInfo] = useState<any>(null);

  useEffect(() => {
    api.get('/profiling/runs').then((r) => setRuns(r.data));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    api.get(`/profiling/runs/${selectedId}`).then((r) => {
      setStages(r.data.stages);
      setDevices(r.data.devices);
      setRunInfo(r.data.run);
    });
  }, [selectedId]);

  function openRun(id: number) {
    setSelectedId(id);
    setTab('Этапы обработки');
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Профилирование</h1>
          <p>На каком этапе программа тратит время и ресурсы графического процессора</p>
        </div>
      </div>

      <Tabs tabs={['Запуски', 'Этапы обработки', 'Оборудование']} active={tab} onChange={setTab} />

      {tab === 'Запуски' && (
        <Card title="Запуски">
          <Table
            columns={[
              { key: 'id', label: '№' },
              { key: 'task_name', label: 'Задача' },
              { key: 'version_label', label: 'Версия' },
              { key: 'run_type', label: 'Тип обработки', render: (r) => (r.run_type === 'train' ? 'Обучение' : 'Выдача рекомендаций') },
              { key: 'started_at', label: 'Начало', render: (r) => fmtDate(r.started_at) },
              { key: 'duration_ms', label: 'Длительность', align: 'right', render: (r) => (r.run_type === 'train' ? `${fmtDec(r.duration_ms / 60000, 1)} мин` : `${fmtNum(r.duration_ms)} мс`) },
              { key: 'result', label: 'Результат' },
            ]}
            rows={runs}
            onRowClick={(r) => openRun(r.id)}
          />
        </Card>
      )}

      {tab === 'Этапы обработки' && (
        selectedId ? (
          <Card title={`Этапы — запуск №${selectedId} (${runInfo?.task_name || ''}, ${runInfo?.version_label || ''})`}>
            <Table
              columns={[
                { key: 'stage_name', label: 'Этап' },
                { key: 'time_ms', label: 'Время, мс', align: 'right', render: (r) => fmtNum(r.time_ms) },
                { key: 'share_pct', label: 'Доля времени, %', align: 'right', render: (r) => fmtDec(r.share_pct) },
                { key: 'gpu_util_pct', label: 'Загрузка GPU, %', align: 'right', render: (r) => fmtDec(r.gpu_util_pct) },
                { key: 'memory_mb', label: 'Память, МБ', align: 'right', render: (r) => fmtNum(r.memory_mb) },
                { key: 'ops_count', label: 'Число операций', align: 'right', render: (r) => fmtNum(r.ops_count) },
              ]}
              rows={stages}
            />
          </Card>
        ) : <div className="muted">Выберите запуск на вкладке «Запуски».</div>
      )}

      {tab === 'Оборудование' && (
        selectedId ? (
          <Card title={`Оборудование — запуск №${selectedId}`}>
            <Table
              columns={[
                { key: 'device_name', label: 'Устройство' },
                { key: 'util_pct', label: 'Загрузка, %', align: 'right', render: (r) => fmtDec(r.util_pct) },
                { key: 'memory_used_mb', label: 'Занятая память, МБ', align: 'right', render: (r) => fmtNum(r.memory_used_mb) },
                { key: 'peak_memory_mb', label: 'Пиковое потребление, МБ', align: 'right', render: (r) => fmtNum(r.peak_memory_mb) },
                { key: 'errors_count', label: 'Ошибки', align: 'right', render: (r) => (r.errors_count > 0 ? <StatusBadge status="error" /> : '0') },
              ]}
              rows={devices}
            />
          </Card>
        ) : <div className="muted">Выберите запуск на вкладке «Запуски».</div>
      )}
    </div>
  );
}
