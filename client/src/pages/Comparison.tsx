import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Table, Tabs, useTab, fmtDec } from '../components/ui';

type ExpOption = { id: number; name: string; task_name: string };
type CompareResult = {
  base: { id: number; name: string; task_name: string };
  target: { id: number; name: string; task_name: string };
  comparable: boolean;
  metrics: { metric: string; unit: string; before: number; after: number; change: number; verdict: string }[];
  conditionDiffs: { parameter: string; base: string; target: string; impact: string }[];
};

export function Comparison() {
  const [options, setOptions] = useState<ExpOption[]>([]);
  const [baseId, setBaseId] = useState<number | ''>('');
  const [targetId, setTargetId] = useState<number | ''>('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [tab, setTab] = useTab(['Производительность', 'Качество рекомендаций', 'Ресурсы']);

  useEffect(() => {
    api.get('/comparison/experiments').then((r) => setOptions(r.data));
  }, []);

  useEffect(() => {
    if (!baseId || !targetId || baseId === targetId) {
      setResult(null);
      return;
    }
    api.get('/comparison', { params: { baseId, targetId } }).then((r) => setResult(r.data));
  }, [baseId, targetId]);

  const groups: Record<string, string[]> = {
    'Производительность': ['Время ответа', 'Пропускная способность'],
    'Качество рекомендаций': ['Качество рекомендаций', 'Число ошибок'],
    'Ресурсы': ['Расход памяти', 'Время обучения'],
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Сравнение</h1>
          <p>Сопоставление показателей исходного и изменённого запусков одной задачи</p>
        </div>
      </div>

      <Card title="Выбор запусков для сравнения">
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div className="field">
            <label>Исходный эксперимент</label>
            <select className="select-inline" value={baseId} onChange={(e) => setBaseId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Выберите…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.task_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Изменённый эксперимент</label>
            <select className="select-inline" value={targetId} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Выберите…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.task_name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {!result && <div className="muted">Выберите два разных завершённых эксперимента, чтобы увидеть сравнение.</div>}

      {result && (
        <>
          {!result.comparable && (
            <div className="notice">Отметка о несопоставимости: условия запусков различаются — сравнение показателей может быть некорректным.</div>
          )}

          <Tabs tabs={['Производительность', 'Качество рекомендаций', 'Ресурсы']} active={tab} onChange={setTab} />

          <Card title={`Сравнение показателей: ${result.base.name} → ${result.target.name}`}>
            <Table
              columns={[
                { key: 'metric', label: 'Показатель' },
                { key: 'before', label: 'Исходное значение', align: 'right', render: (r) => `${fmtDec(r.before, 2)} ${r.unit}` },
                { key: 'after', label: 'Новое значение', align: 'right', render: (r) => `${fmtDec(r.after, 2)} ${r.unit}` },
                { key: 'change', label: 'Изменение', align: 'right', render: (r) => `${r.change > 0 ? '+' : ''}${fmtDec(r.change, 1)}%` },
                {
                  key: 'verdict', label: 'Результат проверки',
                  render: (r) => (
                    <span className={`badge badge-${r.verdict === 'regression' ? 'bad' : r.verdict === 'watch' ? 'warn' : 'ok'}`}>
                      {r.verdict === 'regression' ? 'Ухудшение' : r.verdict === 'watch' ? 'Без изменений' : 'Улучшение'}
                    </span>
                  ),
                },
              ]}
              rows={result.metrics.filter((m) => groups[tab].includes(m.metric))}
            />
          </Card>

          <Card title="Различия условий">
            <Table
              columns={[
                { key: 'parameter', label: 'Параметр' },
                { key: 'base', label: 'Исходный запуск' },
                { key: 'target', label: 'Изменённый запуск' },
                { key: 'impact', label: 'Влияние на сравнение' },
              ]}
              rows={result.conditionDiffs}
              empty="Различий в оборудовании и данных не обнаружено — запуски сопоставимы."
            />
          </Card>
        </>
      )}
    </div>
  );
}
