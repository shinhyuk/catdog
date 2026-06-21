import { useGame } from '../../state/store';
import LogList from '../../components/LogList';

// 보기 전용: 약탈은 맵에서 호구에게 다가가 실행한다(성공/실패 프로세스).
// 여기선 누수·복수 상태와 약탈 기록만 본다.
export default function Raid() {
  const { state } = useGame();
  const revengeIds = new Set(state.leaks.map((l) => l.raiderId));
  const leakTotal = state.leaks.reduce((s, l) => s + (l.total - l.drained), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">약탈</h1>
        <p className="text-xs text-slate-400">
          <b className="text-amber-300">약탈은 맵에서</b> 호구에게 다가가 실행한다. 시도하면 성공/실패가 갈린다.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">진행 중 누수</span>
          <span className="font-mono font-semibold text-rose-300">{leakTotal.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-slate-400">복수 대상(나를 턴 적)</span>
          <span className="font-mono font-semibold text-amber-300">{revengeIds.size}명</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          복수 대상을 맵에서 강탈하면 누수가 멈추고 되갚는다.
        </p>
      </section>

      <LogList events={state.log.slice(0, 12)} />
    </div>
  );
}
