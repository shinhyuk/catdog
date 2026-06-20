import { NavLink, Outlet } from 'react-router-dom';
import { useGame } from '../state/store';

const TABS = [
  { to: '/', label: '홈', icon: '🏠', end: true },
  { to: '/list', label: '명단', icon: '📋', end: false },
  { to: '/raid', label: '약탈', icon: '⚔️', end: false },
  { to: '/skills', label: '스킬', icon: '🌳', end: false },
];

export default function Layout() {
  const { state } = useGame();
  const factionEmoji = state.faction === 'dog' ? '🐕' : '🐈';
  const factionName = state.faction === 'dog' ? '개 진영' : '고양이 진영';

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xl">{factionEmoji}</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{factionName}</div>
            <div className="text-xs text-slate-400">
              시즌 {state.season} · Day {state.day} · Lv {state.level}
            </div>
          </div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-xs text-slate-400">자산</div>
          <div className="font-mono text-sm font-semibold text-amber-300">
            {state.assets.toLocaleString()}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-amber-300' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
