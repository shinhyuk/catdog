import { BALANCE } from '../config/balance';
import type { Leak } from '../types';

export interface WalkResult {
  expGain: number;
  /** 걸음으로 번 총 자산 */
  grossAssets: number;
  /** leak으로 야금야금 빠져나간 양 */
  leaked: number;
  /** 실제 지갑에 남은 양 */
  netAssets: number;
  /** 갱신된 leak 목록 (drained 증가, 다 빠진 leak은 제거) */
  leaks: Leak[];
  /** 이번 걸음에서 누가 얼마나 빼갔는지 */
  drainedBy: { raiderName: string; raiderFaction: Leak['raiderFaction']; amount: number }[];
}

/**
 * 걸음 시뮬: 걸으면 경험치와 자산이 쌓이고, 진행 중인 leak이 야금야금 빠진다.
 * 자산 = 걸음. 하지만 그중 LEAK_DRAIN_RATE 비율은 leak을 갚는 데 쓰여 지갑에 안 남는다.
 *
 * @param assetMultiplier 적립 보너스(은신 '축재' 등 스킬). 기본 1.
 */
export function walk(steps: number, leaks: Leak[], assetMultiplier = 1): WalkResult {
  const safeSteps = Math.max(0, Math.floor(steps));
  const expGain = safeSteps * BALANCE.EXP_PER_STEP;
  const grossAssets = Math.floor(safeSteps * BALANCE.ASSET_PER_STEP * assetMultiplier);

  let drainBudget = Math.floor(grossAssets * BALANCE.LEAK_DRAIN_RATE);
  let leaked = 0;
  const drainedBy: WalkResult['drainedBy'] = [];

  const nextLeaks: Leak[] = [];
  for (const leak of leaks) {
    const remaining = leak.total - leak.drained;
    if (remaining <= 0) continue; // 이미 다 빠짐
    if (drainBudget <= 0) {
      nextLeaks.push(leak);
      continue;
    }
    const take = Math.min(remaining, drainBudget);
    drainBudget -= take;
    leaked += take;
    drainedBy.push({ raiderName: leak.raiderName, raiderFaction: leak.raiderFaction, amount: take });
    const drained = leak.drained + take;
    if (drained < leak.total) {
      nextLeaks.push({ ...leak, drained });
    }
    // drained >= total 이면 leak 제거 (push 안 함)
  }

  return {
    expGain,
    grossAssets,
    leaked,
    netAssets: grossAssets - leaked,
    leaks: nextLeaks,
    drainedBy,
  };
}

/**
 * 하루 정산(06:00 시뮬): 다 안 빠진 leak의 남은 양 일부를 강제 차감.
 * @returns 강제로 빠진 총량과, 정산 후 남는(이월) leak
 */
export function settleLeaks(leaks: Leak[]): { forced: number; leaks: Leak[] } {
  let forced = 0;
  const next: Leak[] = [];
  for (const leak of leaks) {
    const remaining = leak.total - leak.drained;
    if (remaining <= 0) continue;
    const cut = Math.floor(remaining * BALANCE.LEAK_SETTLE_RATE);
    forced += cut;
    const drained = leak.drained + cut;
    if (drained < leak.total) next.push({ ...leak, drained });
  }
  return { forced, leaks: next };
}
