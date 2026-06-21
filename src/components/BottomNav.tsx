import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: '맵', icon: '🗺️', end: true },
  { to: '/list', label: '명단', icon: '📋', end: false },
  { to: '/raid', label: '약탈', icon: '⚔️', end: false },
  { to: '/skills', label: '스킬', icon: '🌳', end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-slate-800 bg-slate-900/90 backdrop-blur">
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
  );
}
