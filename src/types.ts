// 게임 전역에서 공유하는 타입 정의.
// 게임 로직(src/game)·데이터(src/data)·상태(src/state)가 모두 참조한다.

export type Faction = 'dog' | 'cat';

export type JobId = 'scout' | 'robber' | 'stealth';

/** 봇 행동 성향: 수동(먹잇감) / 능동(나를 털어 복수 루프 유발) */
export type BotMode = 'passive' | 'active';

export interface Bot {
  id: string;
  name: string;
  faction: Faction;
  mode: BotMode;
  /** 어제 걸음 = 남에게 보이는 자산 규모 */
  visibleAssets: number;
  /** 오늘 걸음 = 실제로 털리는 지갑 (leak 대상) */
  wallet: number;
  /** 봇이 오늘 선택한 직업 (상성 계산용) */
  job: JobId;
  /** 은신형이면 명단에서 숨음 */
  hidden: boolean;
}

/** 정찰자가 명단에 등록한 호구 한 건 */
export interface ListedTarget {
  botId: string;
  /** 등록 시점에 노출된, 보이는 자산 규모 */
  visibleAssets: number;
  /** 등록한 정찰자(나 또는 봇). 커미션 귀속용. 'me'면 내가 등록 */
  scoutId: string;
  registeredDay: number;
}

/** 내 지갑에서 빠져나갈, 아직 다 채워지지 않은 누수(leak) */
export interface Leak {
  /** 약탈자 식별 (봇 id 또는 'me') */
  raiderId: string;
  raiderName: string;
  /** 약탈자 진영 */
  raiderFaction: Faction;
  /** 뺏기로 정해진 총량 */
  total: number;
  /** 지금까지 빠져나간 양 */
  drained: number;
  createdDay: number;
}

/** 노출 상태 (남에게 보이게 됨 / 추적 가능) */
export interface Exposure {
  /** 누구의 노출인가: 'me' 또는 봇 id */
  subjectId: string;
  /** 노출 사유 */
  reason: 'raided' | 'detected' | 'scout-revealed';
  /** 남은 분 (시뮬 시간) */
  minutesLeft: number;
}

export interface RaidEvent {
  day: number;
  kind: 'i-raided' | 'i-got-raided' | 'commission' | 'raid-fail' | 'scout-fail';
  fromName: string;
  toName: string;
  amount: number;
  note?: string;
}

export interface GameState {
  version: number;
  faction: Faction | null;

  /** 시뮬 날짜 (1부터). "다음 날로" 누르면 +1 */
  day: number;
  /** 현재 시즌 */
  season: number;

  /** 오늘 선택한 직업 (매일 아침 변경) */
  todayJob: JobId | null;

  /** 레벨링 (걸음 = 경험치) */
  exp: number;
  level: number;

  /**
   * 직업 트리마다 독립 지급되는 스킬포인트.
   * 레벨업 시 세 직업에 각각 1pt씩 적립된다 (Lv20 → 각 20).
   * spent는 skills 맵에서 파생 가능하지만 빠른 조회를 위해 보관.
   */
  skillPointsEarned: Record<JobId, number>;
  /** skillId → 투자한 랭크 */
  skills: Record<string, number>;

  /** 약탈 자산 (뺏고 뺏김) */
  assets: number;
  /** 어제 걸음 = 남에게 보이는 자산 규모 */
  yesterdaySteps: number;
  /** 오늘 걸음 = 실제로 털리는 지갑. leak이 여기서 빠진다 */
  todaySteps: number;

  /** 내 지갑에서 진행 중인 누수들 */
  leaks: Leak[];
  /** 노출 타이머들 */
  exposures: Exposure[];

  /** 진영 공유 호구 명단 */
  list: ListedTarget[];
  /** 봇 풀 */
  bots: Bot[];

  /** 활동 로그 (최신이 앞) */
  log: RaidEvent[];

  /** 오늘 내가 한 약탈/정찰 횟수 (하루 제한·피로 등에 사용) */
  todayRaids: number;
  todayScouts: number;
}
