import { BALANCE } from '../config/balance';

type Rng = () => number;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * 🔍 정찰자 소액 절도. 보이는 자산(visibleAssets)의 2~5%.
 * 스킬 보너스가 있어도 상한(SCOUT_CAP=5%)을 절대 못 넘는다 → 삼각 상성 천장.
 */
export function scoutSteal(visibleAssets: number, skillBonusRate = 0, rng: Rng = Math.random): number {
  const { SCOUT_MIN, SCOUT_MAX, SCOUT_CAP } = BALANCE.theft;
  const base = lerp(SCOUT_MIN, SCOUT_MAX, rng());
  const rate = clamp(base + skillBonusRate, SCOUT_MIN, SCOUT_CAP);
  return Math.floor(visibleAssets * rate);
}

/**
 * 💥 강탈자 강탈. 보이는 자산의 10%.
 * 천장: 기본 10%, 콤보 발동 시에만 +5%p (최대 15%). 스킬 풀업으로도 콤보 없이는 못 넘김.
 */
export function robberRaid(visibleAssets: number, combo = false): { rate: number; amount: number } {
  const { ROBBER_BASE, ROBBER_CAP_BASE, ROBBER_COMBO_BONUS } = BALANCE.theft;
  const cap = ROBBER_CAP_BASE + (combo ? ROBBER_COMBO_BONUS : 0);
  const rate = clamp(ROBBER_BASE + (combo ? ROBBER_COMBO_BONUS : 0), 0, cap);
  return { rate, amount: Math.floor(visibleAssets * rate) };
}

/**
 * 강탈자 → 정찰자 커미션. 강탈액의 1~3%.
 * 정찰자가 등록한 호구를 강탈했을 때 정찰자에게 귀속.
 */
export function commission(robbedAmount: number, rng: Rng = Math.random): number {
  const { COMMISSION_MIN, COMMISSION_MAX } = BALANCE.theft;
  const rate = lerp(COMMISSION_MIN, COMMISSION_MAX, rng());
  return Math.floor(robbedAmount * rate);
}
