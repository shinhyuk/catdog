import { JOB_ORDER } from '../data/jobs';
import type { GameState, JobId } from '../types';

export const STATE_VERSION = 1;

export const zeroPoints = (): Record<JobId, number> =>
  JOB_ORDER.reduce((acc, j) => ((acc[j] = 0), acc), {} as Record<JobId, number>);

/** 진영 선택 전의 빈 상태 */
export function createInitialState(): GameState {
  return {
    version: STATE_VERSION,
    faction: null,
    day: 1,
    season: 1,
    todayJob: null,
    exp: 0,
    level: 1,
    skillPointsEarned: zeroPoints(),
    skills: {},
    assets: 0,
    yesterdaySteps: 0,
    todaySteps: 0,
    leaks: [],
    exposures: [],
    list: [],
    bots: [],
    log: [],
    todayRaids: 0,
    todayScouts: 0,
  };
}
