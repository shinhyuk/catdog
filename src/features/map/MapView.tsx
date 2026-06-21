import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../state/store';
import { JOB_ORDER, JOBS } from '../../data/jobs';
import { BALANCE } from '../../config/balance';
import { levelProgress } from '../../game/leveling';
import { robberRaid } from '../../game/theft';
import type { Bot, GameState } from '../../types';
import {
  drawGround,
  drawRoad,
  drawTree,
  drawCritter,
  roadOffsetX,
} from './sprites';
import LogList from '../../components/LogList';
import ProgressBar from '../../components/ProgressBar';

const M = BALANCE.map;

interface NearbyAction {
  bot: Bot;
  revenge: boolean;
  /** 실행 가능한 액션 종류 */
  kind: 'register' | 'detect' | 'raid' | 'info' | 'none';
  label: string;
  disabled: boolean;
  hint?: string;
}

/** 도로를 따라 i번째 봇이 놓인 거리 */
const botBaseDist = (i: number) => (i + 1) * M.BOT_SPACING;
const botSide = (i: number) => (i % 2 === 0 ? -16 : 16);

function actionFor(state: GameState, bot: Bot): NearbyAction {
  const revenge = state.leaks.some((l) => l.raiderId === bot.id);
  const base = { bot, revenge };
  const job = state.todayJob;
  if (!job) return { ...base, kind: 'none', label: '직업 먼저', disabled: true, hint: '오늘 직업을 골라야 한다' };

  if (job === 'scout') {
    const scoutFull = state.todayScouts >= BALANCE.limits.MAX_SCOUTS_PER_DAY;
    if (bot.hidden)
      return { ...base, kind: 'detect', label: '간파', disabled: scoutFull, hint: scoutFull ? '오늘 정찰 소진' : '은신을 꿰뚫어 명단에 올린다' };
    if (state.list.some((t) => t.botId === bot.id))
      return { ...base, kind: 'info', label: '명단에 있음', disabled: true };
    return { ...base, kind: 'register', label: '명단 등록', disabled: scoutFull, hint: scoutFull ? '오늘 정찰 소진' : '소액 절도 + 노출' };
  }

  if (job === 'robber') {
    const raidFull = state.todayRaids >= BALANCE.limits.MAX_RAIDS_PER_DAY;
    return {
      ...base,
      kind: 'raid',
      label: revenge ? '복수' : '강탈',
      disabled: raidFull,
      hint: raidFull ? '오늘 강탈 소진' : `예상 ~${robberRaid(bot.visibleAssets).amount.toLocaleString()}`,
    };
  }

  // stealth
  return { ...base, kind: 'info', label: '은신 중 — 지나친다', disabled: true };
}

export default function MapView() {
  const { state, dispatch } = useGame();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // rAF에서 최신 상태/디스패치를 읽기 위한 ref
  const stateRef = useRef(state);
  stateRef.current = state;

  const charDist = useRef(0);
  const walkingRef = useRef(false);
  const frame = useRef(0);
  const frameTimer = useRef(0);
  const stepAcc = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const nearbyRef = useRef<string | null>(null);
  const lastPausedRef = useRef<string | null>(null);

  const [walking, setWalking] = useState(false);
  const [nearbyId, setNearbyId] = useState<string | null>(null);

  const myFaction = state.faction ?? 'dog';
  const LAP = Math.max(1, state.bots.length) * M.BOT_SPACING;

  // 봇 목록 중 현재 직업이 볼 수 있는 대상
  function visibleBots(s: GameState): Bot[] {
    if (s.todayJob === 'scout') return s.bots; // 정찰자는 은신도 보임(간파)
    return s.bots.filter((b) => !b.hidden);
  }

  // 현재 위치에서 상호작용 가능한 가장 가까운 봇
  function computeNearby(s: GameState): NearbyAction | null {
    const phase = ((charDist.current % LAP) + LAP) % LAP;
    let best: { idx: number; bot: Bot; delta: number } | null = null;
    s.bots.forEach((bot, i) => {
      if (s.todayJob !== 'scout' && bot.hidden) return;
      let delta = phase - botBaseDist(i);
      // 루프 경로이므로 가장 가까운 주기로 보정
      if (delta > LAP / 2) delta -= LAP;
      if (delta < -LAP / 2) delta += LAP;
      if (Math.abs(delta) <= M.ENCOUNTER_RANGE) {
        if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { idx: i, bot, delta };
      }
    });
    if (!best) return null;
    return actionFor(s, (best as { bot: Bot }).bot);
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      sizeRef.current = { w, h };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const render = () => {
      const { w, h } = sizeRef.current;
      if (w === 0) return;
      const s = stateRef.current;
      const centerX = w / 2;
      const charScreenY = h * 0.62;
      const camY = charDist.current - charScreenY;

      drawGround(ctx, w, h, camY);
      drawRoad(ctx, h, camY, centerX);

      // 길가 나무 (월드 y 주기적으로)
      for (let wy = Math.floor(camY / 160) * 160 - 160; wy < camY + h + 160; wy += 160) {
        const cx = centerX + roadOffsetX(wy);
        drawTree(ctx, cx - 90, wy - camY);
        drawTree(ctx, cx + 90, wy - camY + 80);
      }

      // 봇들 (보이는 주기 모두)
      const lapNow = Math.floor(charDist.current / LAP);
      visibleBots(s).forEach((bot) => {
        const i = s.bots.indexOf(bot);
        for (let k = lapNow - 1; k <= lapNow + 1; k++) {
          const worldY = botBaseDist(i) + k * LAP;
          const sy = worldY - camY;
          if (sy < -60 || sy > h + 60) continue;
          const sx = centerX + roadOffsetX(worldY) + botSide(i);
          const revenge = s.leaks.some((l) => l.raiderId === bot.id);
          drawCritter(ctx, sx, sy, bot.faction, {
            frame: 0,
            u: 3.5,
            enemy: true,
            revenge,
            dim: bot.hidden,
          });
          if (bot.hidden) {
            ctx.fillStyle = '#7dd3fc';
            ctx.font = 'bold 14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('?', sx, sy - 44);
          }
        }
      });

      // 플레이어
      const psx = centerX + roadOffsetX(charDist.current);
      drawCritter(ctx, psx, charScreenY, myFaction, { frame: frame.current, u: 4.5 });
    };

    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      const s = stateRef.current;

      if (walkingRef.current) {
        const dpx = M.WALK_SPEED_PX_PER_S * dt;
        charDist.current += dpx;
        stepAcc.current += dpx * M.STEPS_PER_PX;
        frameTimer.current += dt;
        if (frameTimer.current > 0.14) {
          frameTimer.current = 0;
          frame.current ^= 1;
        }
        while (stepAcc.current >= M.BATCH_STEPS) {
          stepAcc.current -= M.BATCH_STEPS;
          dispatch({ type: 'WALK', steps: M.BATCH_STEPS });
        }
      }

      // 근처 호구 감지 + 자동 멈춤
      const near = computeNearby(s);
      const id = near?.bot.id ?? null;
      if (id !== nearbyRef.current) {
        nearbyRef.current = id;
        setNearbyId(id);
        const actionable = near && (near.kind === 'raid' || near.kind === 'register' || near.kind === 'detect') && !near.disabled;
        if (actionable && walkingRef.current && id !== lastPausedRef.current) {
          walkingRef.current = false;
          setWalking(false);
          lastPausedRef.current = id;
        }
        if (!id) lastPausedRef.current = null;
      }

      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // 마운트 시 1회만 설정 (내부는 ref로 최신값 접근)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleWalk = () => {
    const next = !walkingRef.current;
    walkingRef.current = next;
    setWalking(next);
  };

  const nearby = nearbyId ? actionFor(state, state.bots.find((b) => b.id === nearbyId)!) : null;

  const doAction = () => {
    if (!nearby || nearby.disabled) return;
    if (nearby.kind === 'raid') dispatch({ type: 'RAID', botId: nearby.bot.id });
    else if (nearby.kind === 'register' || nearby.kind === 'detect')
      dispatch({ type: 'SCOUT_REGISTER', botId: nearby.bot.id });
  };

  const progress = levelProgress(state);

  return (
    <div className="space-y-3">
      {/* 직업 칩 + 경험치 */}
      <section>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>오늘 직업</span>
          <span>
            Lv {state.level} ·{' '}
            {state.level >= BALANCE.MAX_LEVEL
              ? '만렙'
              : `다음까지 ${Math.max(0, BALANCE.expToNext(state.level) - state.exp).toLocaleString()}`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {JOB_ORDER.map((id) => {
            const job = JOBS[id];
            const sel = state.todayJob === id;
            return (
              <button
                key={id}
                onClick={() => dispatch({ type: 'CHOOSE_JOB', job: id })}
                className={`rounded-xl border py-2 text-center text-xs transition active:scale-95 ${
                  sel ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                <span className="mr-1">{job.emoji}</span>
                <span className={sel ? job.accent : 'text-slate-300'}>{job.name}</span>
              </button>
            );
          })}
        </div>
        <ProgressBar value={progress} className="mt-2" />
      </section>

      {/* 맵 캔버스 */}
      <div
        ref={wrapRef}
        className="relative h-[56vh] w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#2f5d34]"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* 노출/누수 오버레이 배지 */}
        <div className="pointer-events-none absolute left-2 top-2 space-y-1">
          {state.leaks.length > 0 && (
            <span className="rounded-md bg-rose-950/80 px-2 py-1 text-[10px] text-rose-200">
              누수 {state.leaks.reduce((s, l) => s + (l.total - l.drained), 0).toLocaleString()}
            </span>
          )}
          {state.exposures.some((e) => e.subjectId === 'me') && (
            <span className="block rounded-md bg-amber-950/80 px-2 py-1 text-[10px] text-amber-200">
              ⚠️ 노출됨
            </span>
          )}
        </div>

        {/* 근처 호구 카드 */}
        {nearby && (
          <div className="absolute inset-x-2 bottom-2 rounded-xl border border-slate-700 bg-slate-900/95 p-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {nearby.bot.hidden ? '🥷 은신 신호' : `${JOBS[nearby.bot.job].emoji} ${nearby.bot.name}`}
                  {nearby.revenge && (
                    <span className="rounded-full bg-rose-600/80 px-1.5 text-[10px]">복수</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {nearby.bot.hidden ? (
                    <span className="text-sky-300">간파해야 정체가 드러난다</span>
                  ) : (
                    <>
                      보이는 자산{' '}
                      <span className="font-mono text-slate-300">
                        {nearby.bot.visibleAssets.toLocaleString()}
                      </span>
                      {nearby.hint && <span className="text-slate-500"> · {nearby.hint}</span>}
                    </>
                  )}
                </div>
              </div>
              {nearby.kind === 'info' || nearby.kind === 'none' ? (
                <span className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-slate-300">
                  {nearby.label}
                </span>
              ) : (
                <button
                  onClick={doAction}
                  disabled={nearby.disabled}
                  className={`rounded-lg px-4 py-2 text-sm font-bold active:scale-95 disabled:opacity-40 ${
                    nearby.kind === 'raid'
                      ? nearby.revenge
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-400 text-slate-900'
                      : 'bg-emerald-500 text-slate-900'
                  }`}
                >
                  {nearby.label}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 걷기 / 다음날 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={toggleWalk}
          className={`rounded-xl py-3 text-sm font-bold active:scale-95 ${
            walking ? 'bg-rose-500/90 text-white' : 'bg-amber-400 text-slate-900'
          }`}
        >
          {walking ? '⏸ 멈추기' : '🚶 걷기'}
        </button>
        <button
          onClick={() => dispatch({ type: 'NEXT_DAY' })}
          className="rounded-xl bg-slate-700 py-3 text-sm font-bold active:scale-95 hover:bg-slate-600"
        >
          🌅 다음 날로
        </button>
      </div>
      <p className="text-center text-xs text-slate-500">
        길 따라 걸으면 경험치·자산이 쌓인다. 호구를 만나면 자동으로 멈춰 정찰/약탈할 수 있다.
      </p>

      <LogList events={state.log.slice(0, 5)} />
      <DevControls />
    </div>
  );
}

function DevControls() {
  const { dispatch } = useGame();
  const [open, setOpen] = useState(false);
  return (
    <section className="pt-1">
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
