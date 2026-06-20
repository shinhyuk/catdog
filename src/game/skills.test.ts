import { describe, it, expect } from 'vitest';
import { canInvest, invest, ultimatesTaken, jobInvested } from './skills';
import { SKILL_TREE } from '../data/skilltree';

describe('skill gates', () => {
  it('T1 스킬은 포인트만 있으면 찍힌다', () => {
    const t1 = SKILL_TREE.scout.branches[0].skills.find((s) => s.tier === 1)!;
    expect(canInvest({}, 5, 'scout', t1).ok).toBe(true);
  });

  it('포인트가 없으면 못 찍는다', () => {
    const t1 = SKILL_TREE.scout.branches[0].skills.find((s) => s.tier === 1)!;
    expect(canInvest({}, 0, 'scout', t1).ok).toBe(false);
  });

  it('T2는 갈래에 5pt 누적돼야 열린다', () => {
    const t2 = SKILL_TREE.scout.branches[0].skills.find((s) => s.tier === 2)!;
    expect(canInvest({}, 20, 'scout', t2).ok).toBe(false);
    // 같은 갈래 T1에 5pt 투자
    const branch = SKILL_TREE.scout.branches[0];
    let skills: Record<string, number> = {};
    branch.skills
      .filter((s) => s.tier === 1)
      .forEach((s) => (skills[s.id] = s.maxRank)); // 4*2 = 8pt
    expect(canInvest(skills, 20, 'scout', t2).ok).toBe(true);
  });

  it('궁극기는 갈래 12pt 게이트', () => {
    const branch = SKILL_TREE.scout.branches[0];
    const ult = branch.skills.find((s) => s.ultimate)!;
    let skills: Record<string, number> = {};
    // T1(8) + T2(2) = 10pt → 아직 12 미만
    branch.skills.filter((s) => s.tier === 1).forEach((s) => (skills[s.id] = s.maxRank));
    skills[branch.skills.find((s) => s.tier === 2)!.id] = 2;
    expect(jobInvested(skills, 'scout')).toBe(10);
    expect(canInvest(skills, 20, 'scout', ult).ok).toBe(false);
    // 12pt 채우기
    branch.skills.filter((s) => s.tier === 2).forEach((s) => (skills[s.id] = s.maxRank));
    expect(jobInvested(skills, 'scout')).toBe(12);
    expect(canInvest(skills, 20, 'scout', ult).ok).toBe(true);
  });

  it('단단한 칸막이: 20pt로는 궁극기 하나밖에 못 든다', () => {
    // 한 갈래 12pt 투자해 궁극기 1개 확보, 남은 8pt로는 다른 궁극기(게이트12) 불가
    const branch = SKILL_TREE.scout.branches[0];
    let skills: Record<string, number> = {};
    branch.skills.forEach((s) => (skills[s.id] = s.maxRank)); // 13pt 풀
    expect(ultimatesTaken(skills, 'scout')).toBe(1);
    expect(jobInvested(skills, 'scout')).toBe(13);
    // 20pt 중 13 사용, 7 남음 → 두 번째 궁극기 게이트(12) 불가
    const ult2 = SKILL_TREE.scout.branches[1].skills.find((s) => s.ultimate)!;
    expect(canInvest(skills, 20, 'scout', ult2).ok).toBe(false);
  });
});

describe('invest', () => {
  it('랭크를 1 올린다', () => {
    expect(invest({}, 'x')['x']).toBe(1);
    expect(invest({ x: 1 }, 'x')['x']).toBe(2);
  });
});
