import { useGame } from '../../state/store';
import { JOBS } from '../../data/jobs';
import { BALANCE } from '../../config/balance';
import { robberRaid } from '../../game/theft';

export default function Raid() {
  const { state, dispatch } = useGame();
  const isRobber = state.todayJob === 'robber';
  const listedIds = new Set(state.list.map((t) => t.botId));

  // 복수 대상: 나에게 leak을 건 봇
  const revengeIds = new Set(state.leaks.map((l) => l.raiderId));
  const limitHit = state.todayRaids >= BALANCE.limits.MAX_RAIDS_PER_DAY;

  // 강탈 가능 대상: 보이지 않는(은신) 봇은 제외
  const targets = state.bots
    .filter((b) => !b.hidden)
    .sort((a, b) => {
      const ra = revengeIds.has(a.id) ? 1 : 0;
      const rb = revengeIds.has(b.id) ? 1 : 0;
      if (ra !== rb) return rb - ra; // 복수 대상 먼저
      return b.visibleAssets - a.visibleAssets; // 큰 지갑 먼저
    });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">약탈</h1>
        <p className="text-xs text-slate-400">
          강탈자가 명단/타겟을 10% 강탈한다. 은신자는 못 뚫고, 강탈 후 본인이 노출된다.
        </p>
      </div>

      {!isRobber && (
        <p className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs text-amber-300/80">
          💥 강탈은 <b>강탈자</b>만 할 수 있다. 홈에서 오늘 직업을 강탈자로 바꾸자.
          {state.todayJob === 'scout' && ' (정찰자는 명단 탭에서 소액 절도)'}
        </p>
      )}

      {state.leaks.length > 0 && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200">
          💢 나를 턴 적이 {revengeIds.size}명 있다. 아래 <b>복수</b> 표식 대상을 강탈하면 누수가 멈추고 되갚는다.
        </div>
      )}

      <div className="text-xs text-slate-500">
        오늘 강탈 {state.todayRaids}/{BALANCE.limits.MAX_RAIDS_PER_DAY}
      </div>

      <ul className="space-y-2">
        {targets.map((b) => {
          const preview = robberRaid(b.visibleAssets).amount;
          const listed = listedIds.has(b.id);
          const revenge = revengeIds.has(b.id);
          return (
            <li
              key={b.id}
              className={`flex items-center justify-between rounded-xl border p-3 ${
                revenge ? 'border-rose-700 bg-rose-950/30' : 'border-slate-800 bg-slate-800/40'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {b.name}
                  {revenge && (
                    <span className="rounded-full bg-rose-600/80 px-2 py-0.5 text-[10px]">복수</span>
                  )}
                  {listed && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                      명단
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {JOBS[b.job].emoji} 보이는 자산{' '}
                  <span className="font-mono text-slate-300">{b.visibleAssets.toLocaleString()}</span> · 예상 강탈{' '}
                  <span className="font-mono text-amber-300">~{preview.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'RAID', botId: b.id })}
                disabled={!isRobber || limitHit}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95 disabled:opacity-40 ${
                  revenge ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-900'
                }`}
              >
                {revenge ? '복수' : '강탈'}
              </button>
            </li>
          );
        })}
      </ul>

      {state.bots.some((b) => b.hidden) && (
        <p className="text-center text-xs text-slate-600">
          🥷 은신 중인 적은 여기 안 보인다 — 정찰자가 간파해야 명단에 드러난다.
        </p>
      )}
    </div>
  );
}
