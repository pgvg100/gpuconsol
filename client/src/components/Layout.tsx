import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../AppContext';

const NAV = [
  { to: '/', label: 'Обзор', icon: '◧' },
  { to: '/tasks', label: 'Задачи', icon: '☰' },
  { to: '/data', label: 'Данные', icon: '▤' },
  { to: '/profiling', label: 'Профилирование', icon: '◎' },
  { to: '/optimizations', label: 'Оптимизации', icon: '⚡' },
  { to: '/comparison', label: 'Сравнение', icon: '⇄' },
  { to: '/operations', label: 'Работа сервиса', icon: '▣' },
  { to: '/reports', label: 'Отчёты', icon: '▦' },
  { to: '/settings', label: 'Настройки', icon: '⚙' },
];

export function Layout() {
  const { meta, period, setPeriod, blockId, setBlockId } = useApp();
  const currentBlock = meta?.blocks.find((b) => b.id === blockId);
  const currentVersion = meta?.versions.find((v) => v.task_id === currentBlock?.task_id && v.status === 'deployed');

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src="https://cdn.sptmr.ru/upload/content/application/ru_sm3/prod/front/public/pwa/icon-512.png" alt="Спортмастер" />
          </div>
          <div>
            <div className="brand-title">GPU-консоль</div>
            <div className="brand-sub">Рекомендации</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => 'nav-item' + (isActive ? ' nav-item-active' : '')}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">ООО «Спортмастер»<br />Внутренний сервис</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="topbar-group">
            <label>Период</label>
            <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
              {(meta?.periods || [7, 14, 30, 90]).map((p) => (
                <option key={p} value={p}>{p} дней</option>
              ))}
            </select>
          </div>
          <div className="topbar-group">
            <label>Рекомендательный блок</label>
            <select value={blockId ?? ''} onChange={(e) => setBlockId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Все блоки</option>
              {meta?.blocks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="topbar-group">
            <label>Версия модели</label>
            <div className="topbar-static">{currentVersion?.version_label || '—'}</div>
          </div>
          <div className="topbar-group">
            <label>Состояние обработки</label>
            <div className="topbar-static"><span className="dot dot-ok" /> Работает штатно</div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
