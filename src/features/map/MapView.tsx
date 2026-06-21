import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGame } from '../../state/store';
import { JOB_ORDER, JOBS } from '../../data/jobs';
import { BALANCE } from '../../config/balance';
import { levelProgress } from '../../game/leveling';
import { robberRaid } from '../../game/theft';
import type { Bot, GameState } from '../../types';
import { destination, haversine, angleDelta, type LatLng } from './geo';
import { useGeolocation, useCompass } from './useGeo';
import BottomNav from '../../components/BottomNav';
import LogList from '../../components/LogList';

const G = BALANCE.geo;

interface NearbyAction {
  bot: Bot;
  revenge: boolean;
  kind: 'register' | 'detect' | 'raid' | 'info' | 'none';
  label: string;
  disabled: boolean;
  hint?: string;
}

function actionFor(state: GameState, bot: Bot): NearbyAction {
  const revenge = state.leaks.some((l) => l.raiderId === bot.id);
  const base = { bot, revenge };
  const job = state.todayJob;
  if (!job) return { ...base, kind: 'none', label: '직업 먼저', disabled: true, hint: '오늘 직업을 골라야 한다' };
  if (job === 'scout') {
    const full = state.todayScouts >= BALANCE.limits.MAX_SCOUTS_PER_DAY;
    if (bot.hidden)
      return { ...base, kind: 'detect', label: '간파', disabled: full, hint: full ? '오늘 정찰 소진' : '은신을 꿰뚫어 명단 등록' };
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

function playerMarkerEl(emoji: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'relative flex items-center justify-center';
  el.innerHTML = `
    <div class="absolute -top-4 h-0 w-0 border-x-[9px] border-b-[16px] border-x-transparent border-b-amber-300"></div>
    <div class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-300 bg-slate-900/85 text-xl shadow-lg">${emoji}</div>`;
  return el;
}

function botMarkerEl(): { el: HTMLDivElement; badge: HTMLDivElement } {
  const el = document.createElement('div');
  el.className = 'flex items-center justify-center';
  const badge = document.createElement('div');
  badge.className = 'flex h-9 w-9 items-center justify-center rounded-full border-2 bg-slate-900/75 text-lg';
  el.appendChild(badge);
  return { el, badge };
}

export default function MapView() {
  const { state, dispatch } = useGame();
  const gps = useGeolocation();
  const compass = useCompass();

  const stateRef = useRef(state);
  stateRef.current = state;
  const gpsFixRef = useRef(gps.fix);
  gpsFixRef.current = gps.fix;
  const gpsActiveRef = useRef(gps.active);
  gpsActiveRef.current = gps.active;
  const compassRef = useRef(compass.heading);
  compassRef.current = compass.heading;
  const nearbyRef = useRef<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);
  const playerMarker = useRef<maplibregl.Marker | null>(null);
  const botMarkers = useRef<Map<string, { marker: maplibregl.Marker; badge: HTMLDivElement }>>(new Map());
  const botGeo = useRef<{ stamp: string; pos: Record<string, LatLng> }>({ stamp: '', pos: {} });

  const simPos = useRef<LatLng>({ lat: G.FALLBACK_LAT, lng: G.FALLBACK_LNG });
  const dispPos = useRef<LatLng>({ lat: G.FALLBACK_LAT, lng: G.FALLBACK_LNG });
  const dispBearing = useRef(0);
  const simWalking = useRef(false);
  const meterAcc = useRef(0);
  const stepAcc = useRef(0);
  const lastGpsPos = useRef<LatLng | null>(null);

  const [started, setStarted] = useState(false);
  const [walking, setWalking] = useState(false);
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const myFaction = state.faction ?? 'dog';

  // GPS 이동량 → 걸음 적립 (튐 필터)
  useEffect(() => {
    const fix = gps.fix;
    if (!fix) return;
    const cur = { lat: fix.lat, lng: fix.lng };
    if (lastGpsPos.current) {
      const d = haversine(lastGpsPos.current, cur);
      if (d >= G.MIN_STEP_M && d <= G.MAX_STEP_M) meterAcc.current += d;
    }
    lastGpsPos.current = cur;
  }, [gps.fix]);

  // 지도 초기화 (시작 후 1회)
  useEffect(() => {
    if (!started || !containerRef.current || mapRef.current) return;
    const init = gpsFixRef.current ?? simPos.current;
    dispPos.current = { lat: init.lat, lng: init.lng };
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: G.STYLE_URL,
      center: [init.lng, init.lat],
      zoom: G.MAP_ZOOM,
      pitch: G.MAP_PITCH,
      bearing: 0,
      interactive: false,
      attributionControl: { compact: true },
    });
    map.on('load', () => {
      mapLoaded.current = true;
      const pel = playerMarkerEl(myFaction === 'dog' ? '🐕' : '🐈');
      playerMarker.current = new maplibregl.Marker({ element: pel, anchor: 'center' })
        .setLngLat([dispPos.current.lng, dispPos.current.lat])
        .addTo(map);
    });
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      const s = stateRef.current;
      const fix = gpsFixRef.current;
      const usingGps = gpsActiveRef.current && !!fix;

      // 방향: 나침반 > GPS 이동방향 > 유지
      const targetHeading = compassRef.current ?? fix?.heading ?? null;
      if (targetHeading != null) dispBearing.current += angleDelta(dispBearing.current, targetHeading) * 0.18;

      // 시뮬 걷기 (GPS 없을 때만)
      if (simWalking.current && !usingGps) {
        const step = G.SIM_SPEED_M_PER_S * dt;
        simPos.current = destination(simPos.current, dispBearing.current, step);
        meterAcc.current += step;
      }

      const target = usingGps ? { lat: fix!.lat, lng: fix!.lng } : simPos.current;
      // 부드럽게 따라가기
      const big = haversine(dispPos.current, target) > 60;
      const k = big ? 1 : 0.2;
      dispPos.current = {
        lat: dispPos.current.lat + (target.lat - dispPos.current.lat) * k,
        lng: dispPos.current.lng + (target.lng - dispPos.current.lng) * k,
      };

      if (mapLoaded.current) {
        map.jumpTo({ center: [dispPos.current.lng, dispPos.current.lat], bearing: dispBearing.current, pitch: G.MAP_PITCH });
        playerMarker.current?.setLngLat([dispPos.current.lng, dispPos.current.lat]);
        syncBots(s, target);
      }

      // 걸음 적립
      if (meterAcc.current > 0) {
        stepAcc.current += meterAcc.current * G.STEPS_PER_METER;
        meterAcc.current = 0;
        while (stepAcc.current >= BALANCE.map.BATCH_STEPS) {
          stepAcc.current -= BALANCE.map.BATCH_STEPS;
          dispatch({ type: 'WALK', steps: BALANCE.map.BATCH_STEPS });
        }
      }

      // 근처 호구
      const near = computeNearby(s, target);
      const id = near?.bot.id ?? null;
      if (id !== nearbyRef.current) {
        nearbyRef.current = id;
        setNearbyId(id);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      botMarkers.current.forEach((m) => m.marker.remove());
      botMarkers.current.clear();
      map.remove();
      mapRef.current = null;
      mapLoaded.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // 봇 위치 생성/갱신 + 마커 동기화
  function syncBots(s: GameState, center: LatLng) {
    const stamp = `${s.season}-${s.day}-${s.faction}-${s.bots.length}`;
    if (botGeo.current.stamp !== stamp) {
      // 새 위치 흩뿌리기
      const pos: Record<string, LatLng> = {};
      s.bots.forEach((b, i) => {
        const bearing = (i * 137.5 + s.day * 40) % 360; // 고르게 분산
        const dist = G.BOT_SPAWN_MIN_M + ((i * 53) % (G.BOT_SPAWN_MAX_M - G.BOT_SPAWN_MIN_M));
        pos[b.id] = destination(center, bearing, dist);
      });
      botGeo.current = { stamp, pos };
      // 마커 재생성
      botMarkers.current.forEach((m) => m.marker.remove());
      botMarkers.current.clear();
      s.bots.forEach((b) => {
        const { el, badge } = botMarkerEl();
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pos[b.id].lng, pos[b.id].lat])
          .addTo(mapRef.current!);
        botMarkers.current.set(b.id, { marker, badge });
      });
    }
    // 스타일 동기화
    s.bots.forEach((b) => {
      const entry = botMarkers.current.get(b.id);
      if (!entry) return;
      const show = s.todayJob === 'scout' || !b.hidden;
      entry.marker.getElement().style.display = show ? '' : 'none';
      const revenge = s.leaks.some((l) => l.raiderId === b.id);
      entry.badge.style.opacity = b.hidden ? '0.5' : '1';
      entry.badge.style.borderColor = revenge ? '#f43f5e' : '#fbbf24';
      entry.badge.textContent = b.hidden ? '❔' : b.faction === 'dog' ? '🐕' : '🐈';
    });
  }

  function computeNearby(s: GameState, center: LatLng): NearbyAction | null {
    const pos = botGeo.current.pos;
    let best: { bot: Bot; d: number } | null = null;
    for (const bot of s.bots) {
      if (s.todayJob !== 'scout' && bot.hidden) continue;
      const p = pos[bot.id];
      if (!p) continue;
      const d = haversine(center, p);
      if (d <= G.ENCOUNTER_RANGE_M && (!best || d < best.d)) best = { bot, d };
    }
    return best ? actionFor(s, best.bot) : null;
  }

  const startGame = (withGps: boolean) => {
    if (withGps) {
      gps.start();
      compass.request();
    }
    setStarted(true);
  };

  const toggleWalk = () => {
    const next = !simWalking.current;
    simWalking.current = next;
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

  // ── 시작 화면 ──
  if (!started) {
    return (
      <div className="fixed inset-0 mx-auto flex max-w-md flex-col items-center justify-center gap-4 bg-slate-900 px-8 text-center">
        <div className="text-5xl">🗺️</div>
        <h1 className="text-xl font-bold">실제 거리에서 시작</h1>
        <p className="text-sm text-slate-400">
          내 위치·방향을 읽어 실제 길 위에서 플레이한다. 위치 권한을 허용해줘. (iOS는 나침반 권한도 물어봄)
        </p>
        <button
          onClick={() => startGame(true)}
          className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-slate-900 active:scale-95"
        >
          📍 내 위치로 시작
        </button>
        <button
          onClick={() => startGame(false)}
          className="w-full rounded-xl border border-slate-700 py-3 text-sm font-semibold active:scale-95"
        >
          GPS 없이 둘러보기 (시뮬)
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 mx-auto max-w-md overflow-hidden bg-slate-900 select-none">
      <div ref={containerRef} className="absolute inset-0" />

      {/* 상단 HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-3">
        <div className="flex items-start justify-between">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur">
            <span className="text-lg">{myFaction === 'dog' ? '🐕' : '🐈'}</span>
            <div className="leading-tight">
              <div className="text-xs font-semibold">시즌 {state.season} · Day {state.day}</div>
              <div className="text-[10px] text-slate-300">Lv {state.level}{state.level >= BALANCE.MAX_LEVEL ? ' (만렙)' : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-black/40 px-3 py-1.5 text-right backdrop-blur">
              <div className="text-[10px] text-slate-300">자산</div>
              <div className="font-mono text-sm font-bold text-amber-300">{state.assets.toLocaleString()}</div>
            </div>
            <button onClick={() => setMenuOpen((o) => !o)} className="pointer-events-auto h-9 w-9 rounded-full bg-black/40 text-lg backdrop-blur active:scale-95">≡</button>
          </div>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-amber-400" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`rounded-md px-2 py-1 text-[10px] ${gps.active ? 'bg-emerald-950/80 text-emerald-200' : 'bg-slate-800/80 text-slate-300'}`}>
            {gps.active ? '🛰️ GPS' : '🧭 시뮬'}
          </span>
          {compass.enabled && <span className="rounded-md bg-sky-950/80 px-2 py-1 text-[10px] text-sky-200">나침반</span>}
          {leakTotal > 0 && <span className="rounded-md bg-rose-950/80 px-2 py-1 text-[10px] text-rose-200">누수 {leakTotal.toLocaleString()}</span>}
          {exposed && <span className="rounded-md bg-amber-950/80 px-2 py-1 text-[10px] text-amber-200">⚠️ 노출됨</span>}
          {gps.error && <span className="rounded-md bg-rose-950/80 px-2 py-1 text-[10px] text-rose-200">{gps.error}</span>}
        </div>

        <div className="pointer-events-auto mt-2 grid grid-cols-3 gap-2">
          {JOB_ORDER.map((id) => {
            const job = JOBS[id];
            const sel = state.todayJob === id;
            return (
              <button
                key={id}
                onClick={() => dispatch({ type: 'CHOOSE_JOB', job: id })}
                className={`rounded-full border px-2 py-1 text-center text-[11px] backdrop-blur transition active:scale-95 ${sel ? 'border-amber-400 bg-amber-400/20' : 'border-white/20 bg-black/40'}`}
              >
                <span className="mr-1">{job.emoji}</span>
                <span className={sel ? job.accent : 'text-slate-200'}>{job.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 인카운터 카드 */}
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
                className={`rounded-lg px-4 py-2 text-sm font-bold active:scale-95 disabled:opacity-40 ${nearby.kind === 'raid' ? (nearby.revenge ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-900') : 'bg-emerald-500 text-slate-900'}`}
              >
                {nearby.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div className="absolute inset-x-0 bottom-20 flex items-center justify-between px-6">
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-amber-400/70 bg-black/50 backdrop-blur">
          <span className="text-xl leading-none">{myFaction === 'dog' ? '🐕' : '🐈'}</span>
          <span className="text-[10px] font-bold text-amber-300">Lv{state.level}</span>
        </div>

        {gps.active ? (
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-lg">
            <span className="text-2xl leading-none">🛰️</span>
            추적중
          </div>
        ) : (
          <button
            onClick={toggleWalk}
            className={`flex h-20 w-20 flex-col items-center justify-center rounded-full text-sm font-bold shadow-lg active:scale-95 ${walking ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-900'}`}
          >
            <span className="text-2xl leading-none">{walking ? '⏸' : '🚶'}</span>
            {walking ? '멈추기' : '걷기'}
          </button>
        )}

        <button
          onClick={() => dispatch({ type: 'NEXT_DAY' })}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-slate-700/80 text-[10px] font-semibold backdrop-blur active:scale-95"
        >
          <span className="text-lg leading-none">🌅</span>
          다음날
        </button>
      </div>

      <BottomNav />

      {/* 메뉴 */}
      {menuOpen && (
        <div className="absolute inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-x-0 top-0 max-h-[75%] overflow-y-auto rounded-b-2xl bg-slate-900/95 p-4 backdrop-blur" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">메뉴</h2>
              <button onClick={() => setMenuOpen(false)} className="text-slate-400">닫기 ✕</button>
            </div>
            {!gps.active && (
              <button onClick={() => { gps.start(); compass.request(); }} className="mb-3 w-full rounded-lg bg-amber-400 py-2 text-xs font-bold text-slate-900">
                📍 GPS·나침반 켜기
              </button>
            )}
            {compass.needsPermission && (
              <button onClick={() => compass.request()} className="mb-3 w-full rounded-lg border border-sky-700 py-2 text-xs text-sky-300">
                🧭 나침반 권한 요청 (iOS)
              </button>
            )}
            <LogList events={state.log.slice(0, 8)} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => { if (confirm('시즌을 리셋할까? 레벨·스킬·자산이 초기화된다 (진영은 유지).')) dispatch({ type: 'RESET_SEASON' }); }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs">시즌 리셋</button>
              <button onClick={() => { if (confirm('전체 초기화(진영 포함)?')) dispatch({ type: 'HARD_RESET' }); }} className="rounded-lg border border-rose-900 px-3 py-1.5 text-xs text-rose-300">전체 초기화</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
