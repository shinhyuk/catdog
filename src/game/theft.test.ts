import { describe, it, expect } from 'vitest';
import { scoutSteal, robberRaid, commission } from './theft';
import { BALANCE } from '../config/balance';

describe('scoutSteal', () => {
  it('보이는 자산의 2~5% 범위 안에서 훔친다', () => {
    const v = 10_000;
    expect(scoutSteal(v, 0, () => 0)).toBe(Math.floor(v * BALANCE.theft.SCOUT_MIN));
    expect(scoutSteal(v, 0, () => 1)).toBe(Math.floor(v * BALANCE.theft.SCOUT_MAX));
  });

  it('스킬 보너스가 있어도 5% 상한을 못 넘는다 (천장)', () => {
    const v = 10_000;
    const huge = scoutSteal(v, 0.5, () => 1); // 말도 안 되는 보너스
    expect(huge).toBe(Math.floor(v * BALANCE.theft.SCOUT_CAP));
  });
});

describe('robberRaid', () => {
  it('기본 강탈은 10%', () => {
    expect(robberRaid(10_000).rate).toBeCloseTo(0.1);
    expect(robberRaid(10_000).amount).toBe(1000);
  });

  it('콤보일 때만 +5%p (최대 15%)', () => {
    expect(robberRaid(10_000, true).rate).toBeCloseTo(0.15);
    expect(robberRaid(10_000, true).amount).toBe(1500);
  });
});

describe('commission', () => {
  it('강탈액의 1~3%', () => {
    expect(commission(1000, () => 0)).toBe(Math.floor(1000 * BALANCE.theft.COMMISSION_MIN));
    expect(commission(1000, () => 1)).toBe(Math.floor(1000 * BALANCE.theft.COMMISSION_MAX));
  });
});
