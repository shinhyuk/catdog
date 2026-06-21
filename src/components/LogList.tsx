import type { RaidEvent } from '../types';

const ICON: Record<RaidEvent['kind'], string> = {
  'i-raided': '⚔️',
  'i-got-raided': '💢',
  commission: '💰',
  'raid-fail': '❌',
  'scout-fail': '❌',
};

export default function LogList({ events }: { events: RaidEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-300">최근 활동</h2>
      <ul className="space-y-1">
        {events.map((e, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2 text-xs"
          >
            <span className="flex items-center gap-2">
              <span>{ICON[e.kind]}</span>
              <span className="text-slate-300">
                <span className="text-slate-500">D{e.day}</span> {e.fromName} → {e.toName}
                {e.note && <span className="text-slate-500"> · {e.note}</span>}
              </span>
            </span>
            {e.amount > 0 ? (
              <span
                className={`font-mono font-semibold ${
                  e.kind === 'i-got-raided' ? 'text-rose-300' : 'text-amber-300'
                }`}
              >
                {e.kind === 'i-got-raided' ? '-' : '+'}
                {e.amount.toLocaleString()}
              </span>
            ) : (
              <span className="font-mono text-xs text-slate-500">실패</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
