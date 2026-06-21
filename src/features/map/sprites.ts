// 캔버스 도트 렌더링 헬퍼. 게임 로직과 무관한 표현 계층.
// 픽셀이 또렷하게 보이도록 imageSmoothing은 호출부에서 끈다.

export type CritterKind = 'dog' | 'cat';

// ── 도로 경로 (월드 좌표) ────────────────────────────────
// 도로는 worldY가 커질수록(아래로) 사인파로 굽이친다.
export const ROAD_AMP = 70; // 좌우 흔들림 폭
export const ROAD_FREQ = 0.0018; // 굽이 빈도
export const ROAD_HALF_WIDTH = 34; // 도로 반폭

/** 주어진 worldY에서 도로 중심의 x (centerX 기준 오프셋) */
export function roadOffsetX(worldY: number): number {
  return Math.sin(worldY * ROAD_FREQ) * ROAD_AMP;
}

// ── 색 팔레트 ────────────────────────────────────────────
const PAL: Record<CritterKind, { body: string; dark: string; belly: string }> = {
  dog: { body: '#c2703d', dark: '#8a4f2a', belly: '#e8c39c' },
  cat: { body: '#8076c2', dark: '#544a93', belly: '#cfc8ef' },
};

// ── 배경: 잔디 체커 타일 ─────────────────────────────────
export function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, camY: number) {
  const tile = 32;
  const startRow = Math.floor(camY / tile) - 1;
  const rows = Math.ceil(h / tile) + 2;
  const cols = Math.ceil(w / tile) + 1;
  for (let r = 0; r < rows; r++) {
    const wy = startRow + r;
    const sy = wy * tile - camY;
    for (let c = 0; c < cols; c++) {
      const even = (wy + c) % 2 === 0;
      ctx.fillStyle = even ? '#2f5d34' : '#356636';
      ctx.fillRect(c * tile, sy, tile, tile);
    }
  }
}

// ── 도로 ─────────────────────────────────────────────────
export function drawRoad(ctx: CanvasRenderingContext2D, h: number, camY: number, centerX: number) {
  const step = 6;
  // 도로 본체
  for (let sy = -step; sy < h + step; sy += step) {
    const wy = sy + camY;
    const cx = centerX + roadOffsetX(wy);
    ctx.fillStyle = '#6b6258';
    ctx.fillRect(cx - ROAD_HALF_WIDTH, sy, ROAD_HALF_WIDTH * 2, step + 1);
    // 가장자리
    ctx.fillStyle = '#857a6c';
    ctx.fillRect(cx - ROAD_HALF_WIDTH, sy, 3, step + 1);
    ctx.fillRect(cx + ROAD_HALF_WIDTH - 3, sy, 3, step + 1);
  }
  // 중앙 점선
  ctx.fillStyle = '#d9cf9e';
  for (let sy = -20; sy < h + 20; sy += 28) {
    const wy = sy + camY;
    const cx = centerX + roadOffsetX(wy);
    ctx.fillRect(cx - 2, sy, 4, 14);
  }
}

// 길가 장식 나무 (월드 y 고정 위치에 그리기)
export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, u = 3) {
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(x - u, y, u * 2, u * 3);
  ctx.fillStyle = '#1f7a3a';
  ctx.fillRect(x - u * 3, y - u * 4, u * 6, u * 4);
  ctx.fillStyle = '#27924a';
  ctx.fillRect(x - u * 2, y - u * 6, u * 4, u * 3);
}

// ── 캐릭터(개/고양이) 도트 스프라이트 ────────────────────
interface CritterOpts {
  frame?: number; // 0/1 걷기 프레임
  u?: number; // 픽셀 단위 크기
  enemy?: boolean;
  revenge?: boolean;
  dim?: boolean; // 은신 등 흐리게
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
  const bob = frame === 1 ? -1 : 0; // 살짝 통통 튀는 느낌
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
    f(2, 0, 2, 2, pal.dark); // 왼 삼각 (블록 근사)
    f(3, 1, 1, 1, pal.body);
    f(8, 0, 2, 2, pal.dark);
    f(8, 1, 1, 1, pal.body);
  } else {
    f(1, 2, 2, 4, pal.dark); // 늘어진 귀
    f(9, 2, 2, 4, pal.dark);
  }

  // 머리/몸통
  f(2, 2, 8, 8, pal.body);
  // 배(밝은색)
  f(4, 6, 4, 3, pal.belly);
  // 눈
  f(4, 4, 1, 1, '#1a1a1a');
  f(7, 4, 1, 1, '#1a1a1a');
  // 코
  f(5, 6, 2, 1, '#1a1a1a');

  // 다리 (프레임에 따라 교차)
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
