import { describe, it, expect } from 'vitest';
import { addExp, levelProgress } from './leveling';
import { BALANCE } from '../config/balance';
import { JOB_ORDER } from '../data/jobs';

const zero = () => JOB_ORDER.reduce((a, j) => ((a[j] = 0), a), {} as Record<string, number>);

describe('addExp', () => {
  it('레벨업 시 세 직업 트리에 각각 포인트를 적립한다', () => {
    const need = BALANCE.expToNext(1);
    const s = addExp({ exp: 0, level: 1, skillPointsEarned: zero() as never }, need);
    expect(s.level).toBe(2);
    for (const j of JOB_ORDER) expect(s.skillPointsEarned[j]).toBe(1);
  });

  it('한 번에 여러 레벨을 올릴 수 있다', () => {
    const big = BALANCE.expToNext(1) + BALANCE.expToNext(2) + BALANCE.expToNext(3);
    const s = addExp({ exp: 0, level: 1, skillPointsEarned: zero() as never }, big);
    expect(s.level).toBe(4);
    expect(s.skillPointsEarned.scout).toBe(3);
  });

  it('만렙(20)을 넘지 않는다', () => {
    const s = addExp({ exp: 0, level: 1, skillPointsEarned: zero() as never }, 9_999_999);
    expect(s.level).toBe(BALANCE.MAX_LEVEL);
    expect(s.skillPointsEarned.scout).toBe(BALANCE.MAX_LEVEL - 1);
    expect(levelProgress(s)).toBe(1);
  });
});
