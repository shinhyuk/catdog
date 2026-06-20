import { BALANCE } from '../config/balance';
import { JOB_ORDER } from '../data/jobs';
import { robberRaid } from './theft';
import type { Bot, BotMode, Faction, JobId, Leak, ListedTarget } from '../types';

type Rng = () => number;

const DOG_NAMES = ['들개 바둑이', '떠돌이 마루', '골목 흰둥이', '야생 초코', '들판 쫑', '뒷산 콩이', '강변 보리', '폐가 누렁이'];
const CAT_NAMES = ['길고양이 치즈', '담장 까망', '시장 삼색', '골목 나비', '지붕 깜냥', '주차장 턱시도', '공터 고등어', '담벼락 점박이'];

const pick = <T,>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];
const randInt = (lo: number, hi: number, rng: Rng) => Math.floor(lo + rng() * (hi - lo + 1));

export const enemyFaction = (f: Faction): Faction => (f === 'dog' ? 'cat' : 'dog');

function rollSteps(rng: Rng): number {
  const { DAILY_STEPS_MIN, DAILY_STEPS_MAX } = BALANCE.bots;
  return randInt(DAILY_STEPS_MIN, DAILY_STEPS_MAX, rng);
}

function rollJob(rng: Rng): JobId {
  return pick(JOB_ORDER, rng);
}

/**
 * 봇 풀 생성. 공개 NPC = 야생 들개/길고양이.
 * 수동 8 : 능동 2 (능동 봇이 나를 털어 복수 루프를 유발).
 * 봇은 내 진영의 적(상대 진영)이다 — 명단 등록·약탈 대상.
 */
export function makeBots(myFaction: Faction, rng: Rng = Math.random): Bot[] {
  const ef = enemyFaction(myFaction);
  const names = ef === 'dog' ? DOG_NAMES : CAT_NAMES;
  const { POOL_SIZE, ACTIVE_RATIO } = BALANCE.bots;
  const activeCount = Math.round(POOL_SIZE * ACTIVE_RATIO);

  const pool = [...names];
  const bots: Bot[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const mode: BotMode = i < activeCount ? 'active' : 'passive';
    const job = rollJob(rng);
    const name = pool.length ? pool.splice(Math.floor(rng() * pool.length), 1)[0] : `${ef === 'dog' ? '들개' : '길냥'} #${i}`;
    bots.push({
      id: `bot-${i}`,
      name,
      faction: ef,
      mode,
      visibleAssets: rollSteps(rng),
      wallet: rollSteps(rng),
      job,
      hidden: job === 'stealth',
    });
  }
  return bots;
}

/** 하루 정산: 봇들의 걸음(자산)·직업을 다시 굴린다. id/mode/name은 유지 */
export function refreshBots(bots: Bot[], rng: Rng = Math.random): Bot[] {
  return bots.map((b) => {
    const job = rollJob(rng);
    return {
      ...b,
      job,
      visibleAssets: rollSteps(rng),
      wallet: rollSteps(rng),
      hidden: job === 'stealth',
    };
  });
}

/**
 * 아군(시뮬) 정찰자가 미리 명단에 올려둔 호구들.
 * "봇으로 채운 호구 명단 + 정찰자가 등록하는 흐름"을 보여준다.
 * scoutId='ally-scout' → 이걸 강탈하면 아군 정찰자에게 커미션이 나간다.
 */
export function seedAllyList(bots: Bot[], day: number, rng: Rng = Math.random): ListedTarget[] {
  const visible = bots.filter((b) => !b.hidden);
  const count = Math.min(2, visible.length);
  const chosen: ListedTarget[] = [];
  const pool = [...visible];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    const b = pool.splice(idx, 1)[0];
    chosen.push({ botId: b.id, visibleAssets: b.visibleAssets, scoutId: 'ally-scout', registeredDay: day });
  }
  return chosen;
}

export interface BotRaidResult {
  leaks: Leak[];
  events: { fromName: string; amount: number }[];
}

/**
 * 능동 봇들이 하루 정산 때 나를 털 시도.
 * 내 "보이는 자산"(어제 걸음)을 기준으로 강탈 → 내 지갑에 leak 생성.
 * 복수 루프의 트리거.
 */
export function botRaidsOnPlayer(
  bots: Bot[],
  myVisibleAssets: number,
  myJob: JobId | null,
  day: number,
  rng: Rng = Math.random
): BotRaidResult {
  const leaks: Leak[] = [];
  const events: { fromName: string; amount: number }[] = [];

  // 은신형이면 강탈이 못 뚫는다 (삼각 상성 천장)
  if (myJob === 'stealth') return { leaks, events };

  for (const bot of bots) {
    if (bot.mode !== 'active') continue;
    if (bot.job !== 'robber') continue; // 강탈자 성향 봇만 직접 턴다
    if (rng() > BALANCE.bots.ACTIVE_RAID_CHANCE) continue;
    const { amount } = robberRaid(myVisibleAssets);
    if (amount <= 0) continue;
    leaks.push({
      raiderId: bot.id,
      raiderName: bot.name,
      raiderFaction: bot.faction,
      total: amount,
      drained: 0,
      createdDay: day,
    });
    events.push({ fromName: bot.name, amount });
  }
  return { leaks, events };
}
