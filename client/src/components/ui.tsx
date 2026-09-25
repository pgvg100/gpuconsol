import type { ReactNode } from 'react';
import { useState } from 'react';

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card-head">
          {title && <h3>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'bad' | 'hero' }) {
  return (
    <div className={`stat-card ${tone ? 'tone-' + tone : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    ok: { label: 'Норма', tone: 'ok' },
    active: { label: 'Активна', tone: 'ok' },
    approved: { label: 'Одобрено', tone: 'ok' },
    deployed: { label: 'В проде', tone: 'ok' },
    passed: { label: 'Пройдено', tone: 'ok' },
    fixed: { label: 'Исправлено', tone: 'ok' },
    completed: { label: 'Завершён', tone: 'ok' },
    running: { label: 'Выполняется', tone: 'warn' },
    rolling_out: { label: 'Раскатка', tone: 'warn' },
    in_review: { label: 'На проверке', tone: 'warn' },
    warning: { label: 'Есть замечания', tone: 'warn' },
    in_progress: { label: 'В работе', tone: 'warn' },
    planned: { label: 'Запланирован', tone: 'warn' },
    degraded: { label: 'Деградация', tone: 'warn' },
    open: { label: 'Открыта', tone: 'bad' },
    error: { label: 'Ошибка', tone: 'bad' },
    failed: { label: 'Неуспех', tone: 'bad' },
    rejected: { label: 'Отклонено', tone: 'bad' },
    rolled_back: { label: 'Откат', tone: 'bad' },
    paused: { label: 'Приостановлено', tone: 'neutral' },
    archived: { label: 'В архиве', tone: 'neutral' },
    draft: { label: 'Черновик', tone: 'neutral' },
    stopped: { label: 'Остановлено', tone: 'neutral' },
  };
  const m = map[status] || { label: status, tone: 'neutral' };
  return <span className={`badge badge-${m.tone}`}>{m.label}</span>;
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t} className={`tab ${active === t ? 'tab-active' : ''}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function Table<T extends Record<string, any>>({
  columns,
  rows,
  onRowClick,
  empty = 'Нет данных',
}: {
  columns: { key: string; label: string; render?: (row: T) => ReactNode; align?: 'right' }[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: string;
}) {
  if (!rows.length) return <div className="table-empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.align === 'right' ? { textAlign: 'right' } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? 'row-clickable' : ''}>
              {columns.map((c) => (
                <td key={c.key} style={c.align === 'right' ? { textAlign: 'right' } : undefined}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function useTab(tabs: string[]) {
  return useState(tabs[0]);
}

export function fmtNum(n: number | string) {
  const v = typeof n === 'string' ? Number(n) : n;
  return new Intl.NumberFormat('ru-RU').format(Math.round(v));
}
export function fmtDec(n: number | string, digits = 1) {
  const v = typeof n === 'string' ? Number(n) : n;
  return v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function fmtDate(s: string) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function fmtDateOnly(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
