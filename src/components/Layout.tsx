import { Outlet } from 'react-router-dom';
import { useGame } from '../state/store';
import BottomNav from './BottomNav';

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

      <BottomNav />
    </div>
  );
}
