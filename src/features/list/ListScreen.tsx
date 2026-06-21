import { useGame } from '../../state/store';
import { JOBS } from '../../data/jobs';

// 보기 전용: 진영 공유 명단. 정찰/등록·약탈은 맵에서 호구에게 다가가 실행한다.
export default function ListScreen() {
  const { state } = useGame();

  const scoutLabel = (scoutId: string) =>
    scoutId === 'me' ? '내가 등록' : scoutId === 'ally-scout' ? '아군 정찰' : '정찰';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">호구 명단</h1>
        <p className="text-xs text-slate-400">
          정찰자가 적을 진영 공유 명단에 올린다. <b className="text-amber-300">등록·약탈은 맵</b>에서 호구에게
          다가가 실행한다.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">공유 명단 ({state.list.length})</h2>
        {state.list.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-sm text-slate-400">
            아직 등록된 호구가 없다. 맵에서 정찰자로 적을 간파·등록하자.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.list.map((t) => {
              const bot = state.bots.find((b) => b.id === t.botId);
              if (!bot) return null;
              return (
                <li
                  key={t.botId}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold">{bot.name}</div>
                    <div className="text-xs text-slate-400">
                      {JOBS[bot.job].emoji} 보이는 자산{' '}
                      <span className="font-mono text-slate-300">{t.visibleAssets.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">
                    {scoutLabel(t.scoutId)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
