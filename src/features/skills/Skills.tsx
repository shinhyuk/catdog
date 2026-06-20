import { useState } from 'react';
import { useGame } from '../../state/store';
import { JOB_ORDER, JOBS } from '../../data/jobs';
import { SKILL_TREE, branchInvested, type SkillDef } from '../../data/skilltree';
import { BALANCE } from '../../config/balance';
import { canInvest, jobAvailablePoints, ultimatesTaken } from '../../game/skills';
import type { JobId } from '../../types';

export default function Skills() {
  const { state } = useGame();
  const [job, setJob] = useState<JobId>('scout');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">스킬트리</h1>
        <p className="text-xs text-slate-400">
          직업마다 독립 포인트. 갈래당 13pt(스킬 12+궁극기 1). 게이트 T2={BALANCE.GATE_T2}·궁극기=
          {BALANCE.GATE_T3}. 단단한 칸막이라 만렙 20에선 직업당 궁극기 하나.
        </p>
      </div>

      {/* 직업 탭 */}
      <div className="grid grid-cols-3 gap-2">
        {JOB_ORDER.map((id) => {
          const avail = jobAvailablePoints(state.skills, state.skillPointsEarned[id], id);
          return (
            <button
              key={id}
              onClick={() => setJob(id)}
              className={`rounded-xl border p-2 text-center ${
                job === id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-800/40'
              }`}
            >
              <div className="text-xl">{JOBS[id].emoji}</div>
              <div className={`text-[11px] font-semibold ${JOBS[id].accent}`}>{JOBS[id].name}</div>
              <div className="text-[10px] text-slate-400">
                남은 <span className="font-mono text-amber-300">{avail}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-slate-500">
        {JOBS[job].name} · 획득 {state.skillPointsEarned[job]}pt · 궁극기 {ultimatesTaken(state.skills, job)}/3
      </div>

      {/* 갈래들 */}
      <div className="space-y-4">
        {SKILL_TREE[job].branches.map((b) => {
          const invested = branchInvested(state.skills, b);
          return (
            <section key={b.id} className="rounded-2xl border border-slate-800 bg-slate-800/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{b.name}</h3>
                  <p className="text-[11px] text-slate-500">{b.blurb}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span className="font-mono text-slate-200">{invested}</span>/{BALANCE.BRANCH_CAPACITY}
                </div>
              </div>

              {/* 게이트 표시 */}
              <div className="mb-2 flex gap-2 text-[10px]">
                <Gate label={`T2 ${BALANCE.GATE_T2}`} open={invested >= BALANCE.GATE_T2} />
                <Gate label={`궁극기 ${BALANCE.GATE_T3}`} open={invested >= BALANCE.GATE_T3} />
              </div>

              <div className="space-y-1.5">
                {b.skills.map((s) => (
                  <SkillRow key={s.id} job={job} skill={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Gate({ label, open }: { label: string; open: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 ${
        open ? 'bg-emerald-600/30 text-emerald-300' : 'bg-slate-700/60 text-slate-500'
      }`}
    >
      {open ? '🔓' : '🔒'} {label}
    </span>
  );
}

function SkillRow({ job, skill }: { job: JobId; skill: SkillDef }) {
  const { state, dispatch } = useGame();
  const rank = state.skills[skill.id] ?? 0;
  const check = canInvest(state.skills, state.skillPointsEarned[job], job, skill);
  const maxed = rank >= skill.maxRank;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-2 ${
        skill.ultimate
          ? 'border-amber-700/50 bg-amber-950/20'
          : 'border-slate-700/50 bg-slate-800/40'
      }`}
    >
      <div className="pr-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {skill.ultimate && <span>⭐</span>}
          {skill.name}
          <span className="font-mono text-[10px] text-slate-500">
            {rank}/{skill.maxRank}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">{skill.desc}</div>
      </div>
      <button
        onClick={() => dispatch({ type: 'INVEST_SKILL', job, skillId: skill.id })}
        disabled={!check.ok}
        title={check.reason}
        className="shrink-0 rounded-md bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-900 active:scale-95 disabled:bg-slate-700 disabled:text-slate-500"
      >
        {maxed ? '✓' : '+'}
      </button>
    </div>
  );
}
