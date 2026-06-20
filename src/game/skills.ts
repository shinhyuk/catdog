import { BALANCE } from '../config/balance';
import { SKILL_TREE, branchInvested, type SkillDef, type BranchDef } from '../data/skilltree';
import type { JobId } from '../types';

/** 한 직업 트리에 투자된 총 포인트 */
export function jobInvested(skills: Record<string, number>, job: JobId): number {
  return SKILL_TREE[job].branches.reduce((sum, b) => sum + branchInvested(skills, b), 0);
}

/** 한 직업의 남은(쓸 수 있는) 스킬포인트 */
export function jobAvailablePoints(
  skills: Record<string, number>,
  earned: number,
  job: JobId
): number {
  return earned - jobInvested(skills, job);
}

/** 어떤 갈래에 이 스킬이 속하는지 찾기 */
function findBranchOf(job: JobId, skillId: string): BranchDef | undefined {
  return SKILL_TREE[job].branches.find((b) => b.skills.some((s) => s.id === skillId));
}

export interface InvestCheck {
  ok: boolean;
  reason?: string;
}

/**
 * 이 스킬에 1포인트를 더 투자할 수 있는지 게이트·칸막이 규칙으로 판정.
 * - 포인트가 남아야 한다.
 * - 스킬 최대 랭크 미만이어야 한다.
 * - T2(중단)는 갈래 누적 5pt, T3(궁극기)는 갈래 누적 12pt 게이트.
 */
export function canInvest(
  skills: Record<string, number>,
  earned: number,
  job: JobId,
  skill: SkillDef
): InvestCheck {
  if (jobAvailablePoints(skills, earned, job) <= 0) {
    return { ok: false, reason: '스킬포인트가 없다' };
  }
  const cur = skills[skill.id] ?? 0;
  if (cur >= skill.maxRank) {
    return { ok: false, reason: '이미 풀업' };
  }
  const branchDef = findBranchOf(job, skill.id);
  if (!branchDef) return { ok: false, reason: '알 수 없는 스킬' };
  const invested = branchInvested(skills, branchDef);

  if (skill.tier === 2 && invested < BALANCE.GATE_T2) {
    return { ok: false, reason: `갈래에 ${BALANCE.GATE_T2}pt 필요 (현재 ${invested})` };
  }
  if (skill.tier === 3 && invested < BALANCE.GATE_T3) {
    return { ok: false, reason: `궁극기는 갈래 ${BALANCE.GATE_T3}pt 필요 (현재 ${invested})` };
  }
  return { ok: true };
}

/** 투자 적용 (검증 통과 가정). 새 skills 맵 반환 */
export function invest(skills: Record<string, number>, skillId: string): Record<string, number> {
  return { ...skills, [skillId]: (skills[skillId] ?? 0) + 1 };
}

/** 한 직업이 찍은 궁극기 개수 (단단한 칸막이 검증용) */
export function ultimatesTaken(skills: Record<string, number>, job: JobId): number {
  return SKILL_TREE[job].branches.reduce((n, b) => {
    const ult = b.skills.find((s) => s.ultimate);
    return n + (ult && (skills[ult.id] ?? 0) > 0 ? 1 : 0);
  }, 0);
}
