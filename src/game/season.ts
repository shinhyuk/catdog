import { JOB_ORDER } from '../data/jobs';
import { makeBots } from './bots';
import type { GameState, JobId } from '../types';

const zeroPoints = (): Record<JobId, number> =>
  JOB_ORDER.reduce((acc, j) => ((acc[j] = 0), acc), {} as Record<JobId, number>);

/**
 * 시즌 리셋: 레벨·스킬포인트·랭크·자산·명단을 초기화한다.
 * 진영·계정(faction)과 시즌 번호 증가는 유지.
 */
export function resetSeason(state: GameState): GameState {
  const faction = state.faction;
  return {
    ...state,
    season: state.season + 1,
    day: 1,
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
    bots: faction ? makeBots(faction) : [],
    log: [],
    todayRaids: 0,
    todayScouts: 0,
  };
}
