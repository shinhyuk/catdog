import { describe, it, expect } from 'vitest';
import { walk, settleLeaks } from './steps';
import { BALANCE } from '../config/balance';
import type { Leak } from '../types';

const leak = (total: number, drained = 0): Leak => ({
  raiderId: 'bot-1',
  raiderName: '들개',
  raiderFaction: 'dog',
  total,
  drained,
  createdDay: 1,
});

describe('walk', () => {
  it('걸음만큼 경험치와 자산을 만든다 (leak 없으면 전액 지갑)', () => {
    const r = walk(1000, []);
    expect(r.expGain).toBe(1000 * BALANCE.EXP_PER_STEP);
    expect(r.grossAssets).toBe(1000 * BALANCE.ASSET_PER_STEP);
    expect(r.leaked).toBe(0);
    expect(r.netAssets).toBe(r.grossAssets);
  });

  it('leak이 있으면 걷는 동안 일부가 빠지고, 다 빠진 leak은 사라진다', () => {
    const r = walk(1000, [leak(100)]);
    // drainBudget = 1000 * 0.5 = 500 >= 100 → leak 전부 상환
    expect(r.leaked).toBe(100);
    expect(r.netAssets).toBe(r.grossAssets - 100);
    expect(r.leaks).toHaveLength(0);
  });

  it('drain 예산을 넘는 leak은 일부만 빠지고 남는다', () => {
    const r = walk(1000, [leak(10_000)]);
    expect(r.leaked).toBe(500); // 1000*0.5
    expect(r.leaks[0].drained).toBe(500);
    expect(r.leaks).toHaveLength(1);
  });
});

describe('settleLeaks', () => {
  it('남은 leak의 절반을 강제 차감한다', () => {
    const { forced, leaks } = settleLeaks([leak(1000, 0)]);
    expect(forced).toBe(Math.floor(1000 * BALANCE.LEAK_SETTLE_RATE));
    expect(leaks[0].drained).toBe(forced);
  });
});
