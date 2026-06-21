// 캔버스 도트 렌더링 + 포켓몬GO식 원근(pseudo-3D) 투영.
// 게임 로직과 무관한 표현 계층. 픽셀이 또렷하게 보이도록 호출부에서 imageSmoothing을 끈다.

export type CritterKind = 'dog' | 'cat';

// ── 도로 경로 (월드 좌표) ────────────────────────────────
export const ROAD_AMP = 90;
export const ROAD_FREQ = 0.0016;
export const ROAD_HALF_WIDTH = 36;

/** 주어진 worldY에서 도로 중심의 x 오프셋 */
export function roadOffsetX(worldY: number): number {
  return Math.sin(worldY * ROAD_FREQ) * ROAD_AMP + Math.sin(worldY * ROAD_FREQ * 2.7) * 22;
}

// ── 원근 투영 ────────────────────────────────────────────
export interface Cam {
  w: number;
  h: number;
  camX: number; // 플레이어 월드 x (도로 중심)
  camY: number; // 플레이어 월드 y (진행 거리)
}

const HORIZON_RATIO = 0.32; // 지평선 위치 (화면 높이 비율)
const PLAYER_RATIO = 0.66; // 플레이어 발밑 위치
const FOCAL = 240; // 원근 압축 계수(k). 클수록 완만
const BASE_SCALE = 1.0; // 플레이어 위치에서 월드→화면 x 배율

export interface Projected {
  sx: number;
  sy: number;
  scale: number;
}

/** 월드 좌표 → 화면 좌표 + 깊이 배율. 화면 밖/특이점이면 null */
export function project(wx: number, wy: number, cam: Cam): Projected | null {
  const d = wy - cam.camY; // 앞쪽(+)일수록 지평선으로
  if (d <= -FOCAL * 0.85) return null;
  const factor = FOCAL / (FOCAL + d);
  const Hy = cam.h * HORIZON_RATIO;
  const Py = cam.h * PLAYER_RATIO;
  const sy = Hy + (Py - Hy) * factor;
  const sx = cam.w / 2 + (wx - cam.camX) * BASE_SCALE * factor;
  return { sx, sy, scale: factor };
}

// ── 색 유틸 ──────────────────────────────────────────────
type RGB = [number, number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): string =>
  `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;

const GRASS_A: RGB = [47, 93, 52];
const GRASS_B: RGB = [56, 108, 58];
const HAZE: RGB = [44, 60, 96]; // 먼 곳 푸르스름하게
const ROAD_FILL: RGB = [58, 74, 92];
const ROAD_EDGE: RGB = [240, 222, 84];

// ── 하늘 + 원근 지면 + 도로 ──────────────────────────────
export function drawWorld(ctx: CanvasRenderingContext2D, cam: Cam) {
  const { w, h } = cam;
  const Hy = h * HORIZON_RATIO;
  const Py = h * PLAYER_RATIO;

  // 하늘 (밤하늘 그라데이션)
  const sky = ctx.createLinearGradient(0, 0, 0, Hy);
  sky.addColorStop(0, '#1b2347');
  sky.addColorStop(1, '#3b4a7a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Hy + 1);

  // 지면 스캔라인
  const stepPx = 2;
  for (let sy = Math.floor(Hy); sy < h; sy += stepPx) {
    const factor = (sy - Hy) / (Py - Hy); // 1=플레이어, >1 가까움, →0 지평선
    if (factor <= 0.02) continue;
    const d = FOCAL / factor - FOCAL;
    const wy = cam.camY + d;
    const haze = Math.max(0, Math.min(0.8, 1 - factor));

    // 잔디 (가로 줄무늬로 약간 변화)
    const stripe = Math.floor(wy / 26) % 2 === 0 ? GRASS_A : GRASS_B;
    ctx.fillStyle = mix(stripe, HAZE, haze);
    ctx.fillRect(0, sy, w, stepPx + 1);

    // 도로
    const roadCx = w / 2 + (roadOffsetX(wy) - cam.camX) * BASE_SCALE * factor;
    const half = ROAD_HALF_WIDTH * BASE_SCALE * factor;
    if (half > 0.5) {
      ctx.fillStyle = mix(ROAD_FILL, HAZE, haze);
      ctx.fillRect(roadCx - half, sy, half * 2, stepPx + 1);
      // 노란 가장자리
      const ew = Math.max(1, 2.4 * factor);
      ctx.fillStyle = mix(ROAD_EDGE, HAZE, haze * 0.6);
      ctx.fillRect(roadCx - half, sy, ew, stepPx + 1);
      ctx.fillRect(roadCx + half - ew, sy, ew, stepPx + 1);
    }
  }
}

/** 플레이어 주변 상호작용 링 (지면 위 타원) */
export function drawRing(ctx: CanvasRenderingContext2D, cam: Cam, worldRadius: number) {
  const Py = cam.h * PLAYER_RATIO;
  const rx = worldRadius * BASE_SCALE;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cam.w / 2, Py, rx, rx * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(cam.w / 2, Py, rx * 0.66, rx * 0.27, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 길가 나무 (원근 투영해서 빌보드로)
export function drawTree(ctx: CanvasRenderingContext2D, p: Projected) {
  const u = Math.max(1, 3.4 * p.scale);
  const x = p.sx;
  const y = p.sy;
  ctx.globalAlpha = Math.min(1, p.scale + 0.3);
  ctx.fillStyle = '#3a2516';
  ctx.fillRect(x - u * 0.6, y - u * 2, u * 1.2, u * 2);
  ctx.fillStyle = '#1f7a3a';
  ctx.fillRect(x - u * 2.2, y - u * 5, u * 4.4, u * 3.2);
  ctx.fillStyle = '#27924a';
  ctx.fillRect(x - u * 1.6, y - u * 6.6, u * 3.2, u * 2.4);
  ctx.globalAlpha = 1;
}

// ── 색 팔레트 (크리처) ───────────────────────────────────
const PAL: Record<CritterKind, { body: string; dark: string; belly: string }> = {
  dog: { body: '#c2703d', dark: '#8a4f2a', belly: '#e8c39c' },
  cat: { body: '#8076c2', dark: '#544a93', belly: '#cfc8ef' },
};

interface CritterOpts {
  frame?: number;
  u?: number;
  enemy?: boolean;
  revenge?: boolean;
  dim?: boolean;
}

/** (sx, sy)를 발 밑 중심으로 12x12 그리드 크리처를 그린다 */
export function drawCritter(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  kind: CritterKind,
  opts: CritterOpts = {}
) {
  const { frame = 0, u = 4, enemy = false, revenge = false, dim = false } = opts;
  const pal = PAL[kind];
  const ox = Math.round(sx - 6 * u);
  const bob = frame === 1 ? -1 : 0;
  const oy = Math.round(sy - 12 * u) + bob;
  const f = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + gx * u, oy + gy * u, gw * u, gh * u);
  };

  ctx.save();
  ctx.globalAlpha = dim ? 0.45 : 1;

  // 그림자
  ctx.globalAlpha = (dim ? 0.45 : 1) * 0.3;
  ctx.fillStyle = '#000';
  ctx.fillRect(ox + 2 * u, oy + 11 * u, 8 * u, 1.4 * u);
  ctx.globalAlpha = dim ? 0.45 : 1;

  // 귀
  if (kind === 'cat') {
    f(2, 0, 2, 2, pal.dark);
    f(3, 1, 1, 1, pal.body);
    f(8, 0, 2, 2, pal.dark);
    f(8, 1, 1, 1, pal.body);
  } else {
    f(1, 2, 2, 4, pal.dark);
    f(9, 2, 2, 4, pal.dark);
  }

  // 머리/몸통
  f(2, 2, 8, 8, pal.body);
  f(4, 6, 4, 3, pal.belly);
  f(4, 4, 1, 1, '#1a1a1a');
  f(7, 4, 1, 1, '#1a1a1a');
  f(5, 6, 2, 1, '#1a1a1a');

  // 다리
  const legY = 10;
  const left = frame === 0 ? legY : legY - 1;
  const right = frame === 1 ? legY : legY - 1;
  f(2, left, 2, 12 - left, pal.dark);
  f(8, right, 2, 12 - right, pal.dark);

  // 꼬리
  if (kind === 'dog') f(10, 4, 2, 1, pal.body);
  else f(10, 3, 1, 3, pal.body);

  // 적 표식 링
  if (enemy) {
    ctx.globalAlpha = dim ? 0.45 : 1;
    ctx.strokeStyle = revenge ? '#f43f5e' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, oy + 11.5 * u, 7 * u, 2.4 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
