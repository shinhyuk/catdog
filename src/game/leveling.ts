import { BALANCE } from '../config/balance';
import { JOB_ORDER } from '../data/jobs';
import type { JobId } from '../types';

export interface LevelState {
  exp: number;
  level: number;
  skillPointsEarned: Record<JobId, number>;
}

/**
 * 경험치를 더하고, 레벨업이 발생하면 각 직업 트리에 스킬포인트를 적립한다.
 * 레벨 = 각 직업 트리마다 독립 지급되는 스킬포인트 (Lv20 → 세 직업에 각각 20).
 * 순수 함수: 입력 상태를 복제해 새 상태를 돌려준다.
 */
export function addExp(state: LevelState, gainedExp: number): LevelState {
  let { exp, level } = state;
  const earned: Record<JobId, number> = { ...state.skillPointsEarned };

  exp += Math.max(0, Math.round(gainedExp));

  while (level < BALANCE.MAX_LEVEL) {
    const need = BALANCE.expToNext(level);
    if (exp < need) break;
    exp -= need;
    level += 1;
    for (const job of JOB_ORDER) {
      earned[job] += BALANCE.SKILL_POINTS_PER_LEVEL;
    }
  }

  // 만렙이면 경험치는 더 안 쌓이게 0으로 고정 (잉여 버림)
  if (level >= BALANCE.MAX_LEVEL) exp = 0;

  return { exp, level, skillPointsEarned: earned };
}

/** 다음 레벨까지 진행도 (0~1). 만렙이면 1 */
export function levelProgress(state: LevelState): number {
  if (state.level >= BALANCE.MAX_LEVEL) return 1;
  const need = BALANCE.expToNext(state.level);
  return Math.min(1, state.exp / need);
}
