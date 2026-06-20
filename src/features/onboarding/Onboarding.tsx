import { useGame } from '../../state/store';
import type { Faction } from '../../types';

const CHOICES: { faction: Faction; emoji: string; name: string; blurb: string }[] = [
  { faction: 'dog', emoji: '🐕', name: '개 진영', blurb: '몰려다니며 정면으로 밀어붙인다' },
  { faction: 'cat', emoji: '🐈', name: '고양이 진영', blurb: '조용히 숨었다 한 방을 노린다' },
];

export default function Onboarding() {
  const { dispatch } = useGame();
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-center text-3xl font-bold">개냥 대전</h1>
      <p className="mt-2 text-center text-sm text-slate-400">
        걸으면 자산이 쌓이고, 개 vs 고양이가 서로 약탈한다.
        <br />
        진영을 고르자. (영구 소속)
      </p>

      <div className="mt-8 space-y-3">
        {CHOICES.map((c) => (
          <button
            key={c.faction}
            onClick={() => dispatch({ type: 'CHOOSE_FACTION', faction: c.faction })}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-5 text-left transition active:scale-[0.98] hover:border-amber-400"
          >
            <span className="text-4xl">{c.emoji}</span>
            <div>
              <div className="text-lg font-semibold">{c.name}</div>
              <div className="text-sm text-slate-400">{c.blurb}</div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        Phase 1 프로토타입 · 다른 플레이어는 봇으로 시뮬레이션됩니다
      </p>
    </div>
  );
}
