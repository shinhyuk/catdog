import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { BALANCE } from '../config/balance';
import { addExp } from '../game/leveling';
import { walk, settleLeaks } from '../game/steps';
import { scoutSteal, robberRaid, commission } from '../game/theft';
import { makeBots, refreshBots, botRaidsOnPlayer, seedAllyList } from '../game/bots';
import { resetSeason } from '../game/season';
import { canInvest, invest } from '../game/skills';
import { SKILL_TREE } from '../data/skilltree';
import type { Faction, GameState, JobId, RaidEvent } from '../types';
import { createInitialState } from './initialState';
import { loadState, saveState, clearState } from './persistence';

export type Action =
  | { type: 'CHOOSE_FACTION'; faction: Faction }
  | { type: 'CHOOSE_JOB'; job: JobId }
  | { type: 'WALK'; steps: number }
  | { type: 'SCOUT_REGISTER'; botId: string }
  | { type: 'RAID'; botId: string }
  | { type: 'INVEST_SKILL'; job: JobId; skillId: string }
  | { type: 'NEXT_DAY' }
  | { type: 'RESET_SEASON' }
  | { type: 'HARD_RESET' };

const log = (state: GameState, e: RaidEvent): RaidEvent[] => [e, ...state.log].slice(0, 50);

const skillRank = (state: GameState, id: string) => state.skills[id] ?? 0;

/** 은신 '적립' 갈래에 따른 걸음 적립 배수 */
function assetMultiplier(state: GameState): number {
  if (state.todayJob !== 'stealth') return 1;
  return 1 + skillRank(state, 'stealth-accrue-a0') * 0.05;
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'CHOOSE_FACTION': {
      const bots = makeBots(action.faction);
      return { ...state, faction: action.faction, bots, list: seedAllyList(bots, state.day) };
    }

    case 'CHOOSE_JOB': {
      return { ...state, todayJob: action.job };
    }

    case 'WALK': {
      const mult = assetMultiplier(state);
      const r = walk(action.steps, state.leaks, mult);
      const leveled = addExp(
        { exp: state.exp, level: state.level, skillPointsEarned: state.skillPointsEarned },
        r.expGain
      );
      let next: GameState = {
        ...state,
        exp: leveled.exp,
        level: leveled.level,
        skillPointsEarned: leveled.skillPointsEarned,
        assets: state.assets + r.netAssets,
        todaySteps: state.todaySteps + r.grossAssets,
        leaks: r.leaks,
      };
      if (r.leaked > 0) {
        const by = r.drainedBy[0];
        next = {
          ...next,
          log: log(next, {
            day: state.day,
            kind: 'i-got-raided',
            fromName: by?.raiderName ?? '약탈자',
            toName: '나',
            amount: r.leaked,
            note: '걷는 동안 누수(leak)로 빠짐',
          }),
        };
      }
      return next;
    }

    case 'SCOUT_REGISTER': {
      if (state.todayJob !== 'scout') return state;
      if (state.todayScouts >= BALANCE.limits.MAX_SCOUTS_PER_DAY) return state;
      const bot = state.bots.find((b) => b.id === action.botId);
      if (!bot) return state;
      if (state.list.some((t) => t.botId === bot.id)) return state; // 이미 등록됨

      // 은신자는 간파(detect)로만 드러난다 → 정찰자가 명단에 올리며 노출시킨다
      const bonusRate = skillRank(state, 'scout-vision-b0') * 0.005;
      const steal = scoutSteal(bot.visibleAssets, bonusRate);

      const bots = state.bots.map((b) => (b.id === bot.id ? { ...b, hidden: false } : b));
      return {
        ...state,
        bots,
        assets: state.assets + steal,
        todayScouts: state.todayScouts + 1,
        list: [
          ...state.list,
          { botId: bot.id, visibleAssets: bot.visibleAssets, scoutId: 'me', registeredDay: state.day },
        ],
        exposures: [
          ...state.exposures.filter((e) => e.subjectId !== bot.id),
          { subjectId: bot.id, reason: 'scout-revealed', minutesLeft: BALANCE.exposure.SCOUT_REVEAL_MIN },
        ],
        log: log(state, {
          day: state.day,
          kind: 'i-raided',
          fromName: '나(정찰)',
          toName: bot.name,
          amount: steal,
          note: '명단 등록 + 소액 절도',
        }),
      };
    }

    case 'RAID': {
      if (state.todayJob !== 'robber') return state; // 강탈은 강탈자만
      if (state.todayRaids >= BALANCE.limits.MAX_RAIDS_PER_DAY) return state;
      const bot = state.bots.find((b) => b.id === action.botId);
      if (!bot) return state;
      if (bot.hidden) return state; // 강탈자는 은신을 못 뚫는다 (천장)

      // 복수 여부: 이 봇이 나에게 leak을 건 적 있으면 추적/복수
      const isRevenge = state.leaks.some((l) => l.raiderId === bot.id);
      const hasCombo = skillRank(state, 'robber-force-b0') > 0;
      const combo = hasCombo && isRevenge;
      const { amount } = robberRaid(bot.visibleAssets, combo);

      // 커미션: 명단에 다른 정찰자(봇)가 올린 타겟이면 커미션 차감
      const listed = state.list.find((t) => t.botId === bot.id);
      const owedToBotScout = listed && listed.scoutId !== 'me' ? commission(amount) : 0;
      const myTake = amount - owedToBotScout;

      // 복수 시 해당 봇의 leak 제거 (되갚음)
      const leaks = isRevenge ? state.leaks.filter((l) => l.raiderId !== bot.id) : state.leaks;

      let next: GameState = {
        ...state,
        leaks,
        assets: state.assets + myTake,
        todayRaids: state.todayRaids + 1,
        bots: state.bots.map((b) =>
          b.id === bot.id ? { ...b, visibleAssets: Math.max(0, b.visibleAssets - amount) } : b
        ),
        // 강탈 후 본인 노출
        exposures: [
          ...state.exposures.filter((e) => e.subjectId !== 'me'),
          { subjectId: 'me', reason: 'raided', minutesLeft: BALANCE.exposure.ROBBER_SELF_MIN },
        ],
        log: log(state, {
          day: state.day,
          kind: 'i-raided',
          fromName: '나(강탈)',
          toName: bot.name,
          amount: myTake,
          note: isRevenge ? (combo ? '복수 + 콤보!' : '복수') : '강탈',
        }),
      };
      if (owedToBotScout > 0) {
        next = {
          ...next,
          log: log(next, {
            day: state.day,
            kind: 'commission',
            fromName: '나',
            toName: '적 정찰자',
            amount: owedToBotScout,
            note: '커미션 지급',
          }),
        };
      }
      return next;
    }

    case 'INVEST_SKILL': {
      const skill = SKILL_TREE[action.job].branches
        .flatMap((b) => b.skills)
        .find((s) => s.id === action.skillId);
      if (!skill) return state;
      const check = canInvest(state.skills, state.skillPointsEarned[action.job], action.job, skill);
      if (!check.ok) return state;
      return { ...state, skills: invest(state.skills, action.skillId) };
    }

    case 'NEXT_DAY': {
      // 06:00 정산 시뮬: 남은 leak 강제 차감
      const { forced, leaks } = settleLeaks(state.leaks);
      let assets = Math.max(0, state.assets - forced);

      // 오늘 걸음 → 내일의 "보이는 자산". 오늘 지갑 리셋
      const yesterdaySteps = state.todaySteps;

      // 봇 갱신 + 능동 봇이 나를 털 시도 (복수 루프 트리거)
      const bots = refreshBots(state.bots);
      const raid = botRaidsOnPlayer(bots, yesterdaySteps, state.todayJob, state.day + 1);

      let newLog = state.log;
      for (const e of raid.events) {
        newLog = [
          { day: state.day + 1, kind: 'i-got-raided', fromName: e.fromName, toName: '나', amount: e.amount, note: '능동 봇 강탈 (지갑에서 누수 예정)' },
          ...newLog,
        ];
      }
      if (forced > 0) {
        newLog = [
          { day: state.day + 1, kind: 'i-got-raided', fromName: '정산', toName: '나', amount: forced, note: '미상환 leak 강제 차감' },
          ...newLog,
        ];
      }

      return {
        ...state,
        day: state.day + 1,
        todayJob: null, // 매일 아침 다시 선택
        assets,
        yesterdaySteps,
        todaySteps: 0,
        leaks: [...leaks, ...raid.leaks],
        exposures: [], // 노출은 그날 한정
        bots,
        // 명단은 하루 지나면 비우고, 아군 정찰자가 새로 일부를 채운다
        list: seedAllyList(bots, state.day + 1),
        log: newLog.slice(0, 50),
        todayRaids: 0,
        todayScouts: 0,
      };
    }

    case 'RESET_SEASON':
      return resetSeason(state);

    case 'HARD_RESET': {
      clearState();
      return createInitialState();
    }

    default:
      return state;
  }
}

interface StoreValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useGame must be used within StoreProvider');
  return ctx;
}
