import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../state/store';
import { JOB_ORDER, JOBS } from '../../data/jobs';
import { BALANCE } from '../../config/balance';
import { levelProgress } from '../../game/leveling';
import { robberRaid } from '../../game/theft';
import type { Bot, GameState } from '../../types';
import {
  drawWorld,
  drawRing,
  drawTree,
  drawCritter,
  project,
  roadOffsetX,
  type Cam,
} from './sprites';
import BottomNav from '../../components/BottomNav';
import LogList from '../../components/LogList';

const M = BALANCE.map;

interface NearbyAction {
  bot: Bot;
  revenge: boolean;
  kind: 'register' | 'detect' | 'raid' | 'info' | 'none';
  label: string;
  disabled: boolean;
  hint?: string;
}

const botBaseDist = (i: number) => (i + 1) * M.BOT_SPACING;
const botSide = (i: number) => (i % 2 === 0 ? -20 : 20);

function actionFor(state: GameState, bot: Bot): NearbyAction {
  const revenge = state.leaks.some((l) => l.raiderId === bot.id);
  const base = { bot, revenge };
  const job = state.todayJob;
  if (!job) return { ...base, kind: 'none', label: '직업 먼저', disabled: true, hint: '오늘 직업을 골라야 한다' };

  if (job === 'scout') {
    const full = state.todayScouts >= BALANCE.limits.MAX_SCOUTS_PER_DAY;
    if (bot.hidden)
      return { ...base, kind: 'detect', label: '간파', disabled: full, hint: full ? '오늘 정찰 소진' : '은신을 꿰뚫어 명단에 등록' };
    if (state.list.some((t) => t.botId === bot.id))
      return { ...base, kind: 'info', label: '명단에 있음', disabled: true };
    return { ...base, kind: 'register', label: '명단 등록', disabled: full, hint: full ? '오늘 정찰 소진' : '소액 절도 + 노출' };
  }
  if (job === 'robber') {
    const full = state.todayRaids >= BALANCE.limits.MAX_RAIDS_PER_DAY;
    return {
      ...base,
      kind: 'raid',
      label: revenge ? '복수' : '강탈',
      disabled: full,
      hint: full ? '오늘 강탈 소진' : `예상 ~${robberRaid(bot.visibleAssets).amount.toLocaleString()}`,
    };
  }
  return { ...base, kind: 'info', label: '은신 중 — 지나친다', disabled: true };
}

export default function MapView() {
  const { state, dispatch } = useGame();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  const [menuOpen, setMenuOpen] = useState(false);

  const myFaction = state.faction ?? 'dog';
  const LAP = Math.max(1, state.bots.length) * M.BOT_SPACING;

  const visibleBots = (s: GameState): Bot[] =>
    s.todayJob === 'scout' ? s.bots : s.bots.filter((b) => !b.hidden);

  function computeNearby(s: GameState): NearbyAction | null {
    const phase = ((charDist.current % LAP) + LAP) % LAP;
    let best: { bot: Bot; delta: number } | null = null;
    s.bots.forEach((bot, i) => {
      if (s.todayJob !== 'scout' && bot.hidden) return;
      let delta = phase - botBaseDist(i);
      if (delta > LAP / 2) delta -= LAP;
      if (delta < -LAP / 2) delta += LAP;
      if (Math.abs(delta) <= M.ENCOUNTER_RANGE) {
        if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { bot, delta };
      }
    });
    return best ? actionFor(s, (best as { bot: Bot }).bot) : null;
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
      const cam: Cam = { w, h, camX: roadOffsetX(charDist.current), camY: charDist.current };

      drawWorld(ctx, cam);

      // 길가 나무
      for (let wy = charDist.current - 120; wy < charDist.current + 1100; wy += 130) {
        const cx = roadOffsetX(wy);
        const pl = project(cx - 150, wy, cam);
        const pr = project(cx + 150, wy, cam);
        if (pl && pl.sx > -40 && pl.sx < w + 40) drawTree(ctx, pl);
        if (pr && pr.sx > -40 && pr.sx < w + 40) drawTree(ctx, pr);
      }

      drawRing(ctx, cam, M.ENCOUNTER_RANGE);

      // 그릴 스프라이트 모으기 (먼 것부터 그리도록 sy 오름차순)
      type Item = { sy: number; draw: () => void };
      const items: Item[] = [];

      const lapNow = Math.floor(charDist.current / LAP);
      visibleBots(s).forEach((bot) => {
        const i = s.bots.indexOf(bot);
        const revenge = s.leaks.some((l) => l.raiderId === bot.id);
        for (let k = lapNow - 1; k <= lapNow + 1; k++) {
          const wy = botBaseDist(i) + k * LAP;
          const wx = roadOffsetX(wy) + botSide(i);
          const p = project(wx, wy, cam);
          if (!p || p.scale < 0.12 || p.scale > 1.8) continue;
          if (p.sy < -20 || p.sy > h + 40) continue;
          const u = Math.max(1.6, Math.min(7, 5 * p.scale));
          items.push({
            sy: p.sy,
            draw: () => {
              drawCritter(ctx, p.sx, p.sy, bot.faction, { frame: 0, u, enemy: true, revenge, dim: bot.hidden });
              if (bot.hidden) {
                ctx.fillStyle = '#7dd3fc';
                ctx.font = `bold ${Math.round(10 * p.scale + 6)}px system-ui`;
                ctx.textAlign = 'center';
                ctx.fillText('?', p.sx, p.sy - 11 * u);
              }
            },
          });
        }
      });

      // 플레이어 (화면 중앙 발밑)
      const p0 = project(cam.camX, cam.camY, cam)!;
      items.push({
        sy: p0.sy,
        draw: () => drawCritter(ctx, p0.sx, p0.sy, myFaction, { frame: frame.current, u: 5.2 }),
      });

      items.sort((a, b) => a.sy - b.sy).forEach((it) => it.draw());
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
  const leakTotal = state.leaks.reduce((s, l) => s + (l.total - l.drained), 0);
  const exposed = state.exposures.some((e) => e.subjectId === 'me');

  return (
    <div ref={wrapRef} className="fixed inset-0 mx-auto max-w-md overflow-hidden bg-[#1b2347] select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* ── 상단 HUD ── */}
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 backdrop-blur">
            <span className="text-lg">{myFaction === 'dog' ? '🐕' : '🐈'}</span>
            <div className="leading-tight">
              <div className="text-xs font-semibold">시즌 {state.season} · Day {state.day}</div>
              <div className="text-[10px] text-slate-300">
                Lv {state.level}
                {state.level >= BALANCE.MAX_LEVEL ? ' (만렙)' : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-black/35 px-3 py-1.5 text-right backdrop-blur">
              <div className="text-[10px] text-slate-300">자산</div>
              <div className="font-mono text-sm font-bold text-amber-300">{state.assets.toLocaleString()}</div>
            </div>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="h-9 w-9 rounded-full bg-black/35 text-lg backdrop-blur active:scale-95"
            >
              ≡
            </button>
          </div>
        </div>

        {/* 경험치 바 */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-amber-400" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        {/* 상태 배지 */}
        {(leakTotal > 0 || exposed) && (
          <div className="mt-2 flex gap-2">
            {leakTotal > 0 && (
              <span className="rounded-md bg-rose-950/80 px-2 py-1 text-[10px] text-rose-200">
                누수 {leakTotal.toLocaleString()}
              </span>
            )}
            {exposed && (
              <span className="rounded-md bg-amber-950/80 px-2 py-1 text-[10px] text-amber-200">⚠️ 노출됨</span>
            )}
          </div>
        )}

        {/* 직업 칩 */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {JOB_ORDER.map((id) => {
            const job = JOBS[id];
            const sel = state.todayJob === id;
            return (
              <button
                key={id}
                onClick={() => dispatch({ type: 'CHOOSE_JOB', job: id })}
                className={`rounded-full border px-2 py-1 text-center text-[11px] backdrop-blur transition active:scale-95 ${
                  sel ? 'border-amber-400 bg-amber-400/20' : 'border-white/20 bg-black/35'
                }`}
              >
                <span className="mr-1">{job.emoji}</span>
                <span className={sel ? job.accent : 'text-slate-200'}>{job.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 인카운터 카드 ── */}
      {nearby && (
        <div className="absolute inset-x-3 bottom-40 rounded-2xl border border-white/15 bg-slate-900/90 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {nearby.bot.hidden ? '🥷 은신 신호' : `${JOBS[nearby.bot.job].emoji} ${nearby.bot.name}`}
                {nearby.revenge && <span className="rounded-full bg-rose-600/80 px-1.5 text-[10px]">복수</span>}
              </div>
              <div className="text-xs text-slate-400">
                {nearby.bot.hidden ? (
                  <span className="text-sky-300">간파해야 정체가 드러난다</span>
                ) : (
                  <>
                    보이는 자산 <span className="font-mono text-slate-300">{nearby.bot.visibleAssets.toLocaleString()}</span>
                    {nearby.hint && <span className="text-slate-500"> · {nearby.hint}</span>}
                  </>
                )}
              </div>
            </div>
            {nearby.kind === 'info' || nearby.kind === 'none' ? (
              <span className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-slate-300">{nearby.label}</span>
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

      {/* ── 하단 컨트롤 (맵 위에 떠 있음) ── */}
      <div className="absolute inset-x-0 bottom-20 flex items-center justify-between px-6">
        {/* 프로필 */}
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-amber-400/70 bg-black/45 backdrop-blur">
          <span className="text-xl leading-none">{myFaction === 'dog' ? '🐕' : '🐈'}</span>
          <span className="text-[10px] font-bold text-amber-300">Lv{state.level}</span>
        </div>

        {/* 걷기 */}
        <button
          onClick={toggleWalk}
          className={`flex h-20 w-20 flex-col items-center justify-center rounded-full text-sm font-bold shadow-lg active:scale-95 ${
            walking ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-900'
          }`}
        >
          <span className="text-2xl leading-none">{walking ? '⏸' : '🚶'}</span>
          {walking ? '멈추기' : '걷기'}
        </button>

        {/* 다음날 */}
        <button
          onClick={() => dispatch({ type: 'NEXT_DAY' })}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-slate-700/80 text-[10px] font-semibold backdrop-blur active:scale-95"
        >
          <span className="text-lg leading-none">🌅</span>
          다음날
        </button>
      </div>

      <BottomNav />

      {/* ── 메뉴 패널 (로그 / 개발도구) ── */}
      {menuOpen && (
        <div className="absolute inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute inset-x-0 top-0 max-h-[70%] overflow-y-auto rounded-b-2xl bg-slate-900/95 p-4 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">메뉴</h2>
              <button onClick={() => setMenuOpen(false)} className="text-slate-400">
                닫기 ✕
              </button>
            </div>
            <LogList events={state.log.slice(0, 8)} />
            <div className="mt-4 flex gap-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
