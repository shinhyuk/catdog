import { useState } from 'react';
import { useGame } from '../../state/store';
import { JOB_ORDER, JOBS } from '../../data/jobs';
import { BALANCE } from '../../config/balance';
import { levelProgress } from '../../game/leveling';
import LogList from '../../components/LogList';
import ProgressBar from '../../components/ProgressBar';

export default function Home() {
  const { state, dispatch } = useGame();
  const [steps, setSteps] = useState(2000);

  const progress = levelProgress(state);
  const maxed = state.level >= BALANCE.MAX_LEVEL;
  const activeLeak = state.leaks.reduce((s, l) => s + (l.total - l.drained), 0);
  const exposed = state.exposures.find((e) => e.subjectId === 'me');

  return (
    <div className="space-y-5">
      {/* 레벨 / 경험치 */}
      <section className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
        <div className="flex items-end justify-between">
          <div className="text-sm text-slate-400">레벨</div>
          <div className="text-2xl font-bold">
            {state.level}
            <span className="ml-1 text-sm font-normal text-slate-500">/ {BALANCE.MAX_LEVEL}</span>
          </div>
        </div>
        <ProgressBar value={progress} className="mt-2" />
        <div className="mt-1 text-right text-xs text-slate-500">
          {maxed ? '만렙' : `다음 레벨까지 ${Math.max(0, BALANCE.expToNext(state.level) - state.exp).toLocaleString()} EXP`}
        </div>
      </section>

      {/* 오늘 직업 선택 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">오늘 직업 (매일 아침 선택)</h2>
        <div className="grid grid-cols-3 gap-2">
          {JOB_ORDER.map((id) => {
            const job = JOBS[id];
            const selected = state.todayJob === id;
            return (
              <button
                key={id}
                onClick={() => dispatch({ type: 'CHOOSE_JOB', job: id })}
                className={`rounded-xl border p-3 text-center transition active:scale-95 ${
                  selected
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl">{job.emoji}</div>
                <div className={`mt-1 text-xs font-semibold ${job.accent}`}>{job.name}</div>
              </button>
            );
          })}
        </div>
        {state.todayJob ? (
          <p className="mt-2 text-xs text-slate-400">{JOBS[state.todayJob].desc}</p>
        ) : (
          <p className="mt-2 text-xs text-amber-300/80">직업을 골라야 약탈·정찰을 할 수 있다.</p>
        )}
      </section>

      {/* 걸음 시뮬 */}
      <section className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">걸음 시뮬</h2>
        <input
          type="range"
          min={500}
          max={10000}
          step={500}
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
          className="w-full accent-amber-400"
        />
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-slate-400">걸음</span>
          <span className="font-mono font-semibold">{steps.toLocaleString()}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => dispatch({ type: 'WALK', steps })}
            className="rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-slate-900 active:scale-95"
          >
            🚶 걷기 ({steps.toLocaleString()})
          </button>
          <button
            onClick={() => dispatch({ type: 'WALK', steps: 1000 })}
            className="rounded-xl border border-slate-600 py-2.5 text-sm font-semibold active:scale-95"
          >
            +1,000 빠른 걷기
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          걸음 = 경험치(레벨업) + 자산(지갑). 약탈당했으면 걷는 동안 leak으로 야금야금 빠진다.
        </p>
      </section>

      {/* 자산의 두 얼굴 */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
          <div className="text-xs text-slate-400">어제 걸음 (보이는 규모)</div>
          <div className="font-mono text-lg font-semibold">{state.yesterdaySteps.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
          <div className="text-xs text-slate-400">오늘 걸음 (털리는 지갑)</div>
          <div className="font-mono text-lg font-semibold">{state.todaySteps.toLocaleString()}</div>
        </div>
      </section>

      {/* 상태: leak / 노출 */}
      {(activeLeak > 0 || exposed) && (
        <section className="space-y-2">
          {activeLeak > 0 && (
            <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-sm">
              <span className="font-semibold text-rose-300">누수 진행 중</span> — 앞으로 걸으며{' '}
              <span className="font-mono">{activeLeak.toLocaleString()}</span> 만큼 빠진다. 약탈 탭에서 복수 가능.
            </div>
          )}
          {exposed && (
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/40 p-3 text-sm text-amber-200">
              ⚠️ 나는 지금 <b>노출</b> 상태 ({exposed.minutesLeft}분). 적에게 추적당할 수 있다.
            </div>
          )}
        </section>
      )}

      {/* 다음 날로 */}
      <section>
        <button
          onClick={() => dispatch({ type: 'NEXT_DAY' })}
          className="w-full rounded-xl bg-slate-700 py-3 text-sm font-bold active:scale-95 hover:bg-slate-600"
        >
          🌅 다음 날로 (06:00 정산)
        </button>
        <p className="mt-1 text-center text-xs text-slate-500">
          오늘 걸음이 내일의 "보이는 자산"이 되고, 능동 봇이 나를 노린다.
        </p>
      </section>

      {/* 최근 로그 */}
      <LogList events={state.log.slice(0, 6)} />

      {/* 개발용 */}
      <DevControls />
    </div>
  );
}

function DevControls() {
  const { dispatch } = useGame();
  const [open, setOpen] = useState(false);
  return (
    <section className="pt-2">
      <button onClick={() => setOpen((o) => !o)} className="text-xs text-slate-600 underline">
        개발용 도구 {open ? '접기' : '펼치기'}
      </button>
      {open && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              if (confirm('시즌을 리셋할까? 레벨·스킬·자산이 초기화된다 (진영은 유지).'))
                dispatch({ type: 'RESET_SEASON' });
            }}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs"
          >
            시즌 리셋
          </button>
          <button
            onClick={() => {
              if (confirm('전체 초기화(진영 포함)?')) dispatch({ type: 'HARD_RESET' });
            }}
            className="rounded-lg border border-rose-900 px-3 py-1.5 text-xs text-rose-300"
          >
            전체 초기화
          </button>
        </div>
      )}
    </section>
  );
}
