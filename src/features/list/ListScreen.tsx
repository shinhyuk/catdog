import { useGame } from '../../state/store';
import { JOBS } from '../../data/jobs';
import { BALANCE } from '../../config/balance';

export default function ListScreen() {
  const { state, dispatch } = useGame();
  const isScout = state.todayJob === 'scout';
  const listedIds = new Set(state.list.map((t) => t.botId));
  const unlisted = state.bots.filter((b) => !listedIds.has(b.id));

  const scoutLabel = (scoutId: string) =>
    scoutId === 'me' ? '내가 등록' : scoutId === 'ally-scout' ? '아군 정찰' : '정찰';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">호구 명단</h1>
        <p className="text-xs text-slate-400">
          정찰자가 적의 어제 걸음을 읽어 진영 공유 명단에 올린다. 강탈자는 이 명단을 보고 턴다.
        </p>
      </div>

      {/* 등록된 명단 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          공유 명단 ({state.list.length})
        </h2>
        {state.list.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-sm text-slate-400">
            아직 등록된 호구가 없다. {isScout ? '아래에서 적을 스캔해 등록하자.' : '정찰자가 등록해야 한다.'}
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

      {/* 정찰: 스캔해서 등록 */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-300">적 스캔</h2>
        {!isScout ? (
          <p className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs text-amber-300/80">
            🔍 정찰자만 명단에 등록할 수 있다. 홈에서 오늘 직업을 <b>정찰자</b>로 바꾸자.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500">
              오늘 정찰 {state.todayScouts}/{BALANCE.limits.MAX_SCOUTS_PER_DAY} · 등록 시 소액 절도 +
              은신자는 간파해 노출시킨다
            </p>
            <ul className="space-y-2">
              {unlisted.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {b.hidden ? '🥷 은신 신호' : b.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {b.hidden ? (
                        <span className="text-sky-300">간파해야 정체가 드러난다</span>
                      ) : (
                        <>
                          보이는 자산{' '}
                          <span className="font-mono text-slate-300">{b.visibleAssets.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'SCOUT_REGISTER', botId: b.id })}
                    disabled={state.todayScouts >= BALANCE.limits.MAX_SCOUTS_PER_DAY}
                    className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-slate-900 active:scale-95 disabled:opacity-40"
                  >
                    {b.hidden ? '간파' : '명단 등록'}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
