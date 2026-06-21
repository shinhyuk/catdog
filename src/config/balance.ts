// ★ 모든 밸런스 수치는 여기 상수로 둔다. 컴포넌트/로직에 하드코딩 금지.
// 튜닝이 곧 게임 디자인이다. (CLAUDE.md: 코딩 규칙)
// Phase 1 단계라 일부 값은 placeholder다. 자유롭게 만져서 "재미"를 찾는다.

export const BALANCE = {
  // ── 레벨링 (걸음 = 경험치) ──────────────────────────────
  /** 걸음 1당 경험치 */
  EXP_PER_STEP: 1,
  /** 시즌1 만렙 */
  MAX_LEVEL: 20,
  /**
   * 레벨 n → n+1 로 가는 데 필요한 경험치.
   * 완만한 곡선. (튜닝 대상)
   */
  expToNext: (level: number): number => Math.round(500 + (level - 1) * 250),

  // ── 스킬포인트 ──────────────────────────────────────────
  /** 레벨업 1회당 각 직업 트리에 적립되는 포인트 */
  SKILL_POINTS_PER_LEVEL: 1,

  // ── 스킬트리 게이트 ─────────────────────────────────────
  /** 갈래 중단(T2) 해금에 필요한, 해당 갈래 누적 투자 */
  GATE_T2: 5,
  /** 갈래 궁극기(T3) 해금에 필요한, 해당 갈래 누적 투자 */
  GATE_T3: 12,
  /** 갈래 하나의 총 용량 (스킬 12 + 궁극기 1) */
  BRANCH_CAPACITY: 13,

  // ── 자산 / 걸음의 두 얼굴 ────────────────────────────────
  /** 걸음 1당 적립되는 자산(지갑) */
  ASSET_PER_STEP: 1,
  /**
   * leak 누수율: 약탈당한 양을, 내가 걷는 동안 이 비율로 야금야금 빼간다.
   * 걸음 시뮬 1틱(=ASSET 적립)마다 (적립량 × 이 비율)만큼 leak이 빠진다.
   */
  LEAK_DRAIN_RATE: 0.5,
  /** 하루 정산 시 leak이 다 안 빠졌으면 남은 양의 이 비율을 강제 차감 */
  LEAK_SETTLE_RATE: 0.5,

  // ── 약탈 (가위바위보 천장은 스킬 풀업해도 안 깨진다) ─────
  theft: {
    /** 🔍 정찰자 소액 절도율 범위 (보이는 자산 기준) */
    SCOUT_MIN: 0.02,
    SCOUT_MAX: 0.05,
    /** 정찰 절도율 상한 (스킬로도 못 넘김) */
    SCOUT_CAP: 0.05,

    /** 💥 강탈자 기본 강탈율 (보이는 자산 기준) */
    ROBBER_BASE: 0.1,
    /** 강탈 천장: 기본 10%, 콤보로만 +5%p */
    ROBBER_CAP_BASE: 0.1,
    ROBBER_COMBO_BONUS: 0.05,

    /** 강탈자 → 정찰자 커미션율 (강탈액 기준) */
    COMMISSION_MIN: 0.01,
    COMMISSION_MAX: 0.03,
  },

  // ── 노출 시간 (분, 시뮬) ────────────────────────────────
  exposure: {
    /** 정찰자가 호구를 명단 노출시키는 시간 */
    SCOUT_REVEAL_MIN: 60,
    /** 강탈 직후 본인 노출 시간 */
    ROBBER_SELF_MIN: 60,
    /** 은신형이 간파당했을 때 노출 시간 범위 (60~30분) */
    STEALTH_DETECTED_MAX: 60,
    STEALTH_DETECTED_MIN: 30,
  },

  // ── 하루 행동 제한 (피로) ───────────────────────────────
  limits: {
    MAX_RAIDS_PER_DAY: 5,
    MAX_SCOUTS_PER_DAY: 8,
  },

  // ── 봇 (Phase 1 핵심) ───────────────────────────────────
  bots: {
    /** 풀 크기 */
    POOL_SIZE: 10,
    /** 능동 봇 비율 (수동 8 : 능동 2) */
    ACTIVE_RATIO: 0.2,
    /** 능동 봇이 하루 정산 때 나를 털 확률 */
    ACTIVE_RAID_CHANCE: 0.6,
    /** 봇의 일일 걸음(자산) 시뮬 범위 */
    DAILY_STEPS_MIN: 1500,
    DAILY_STEPS_MAX: 9000,
  },

  // ── 맵/걷기 화면 페이스 (게임 느낌 = 튜닝 대상) ──────────
  map: {
    /** 캐릭터 이동 속도 (월드 px/초) */
    WALK_SPEED_PX_PER_S: 95,
    /** 이동 px당 적립되는 걸음 수 */
    STEPS_PER_PX: 2,
    /** 이만큼 걸음이 모이면 한 번에 WALK 디스패치 (잦은 갱신 방지) */
    BATCH_STEPS: 60,
    /** 호구와 상호작용 가능한 거리 (월드 px) */
    ENCOUNTER_RANGE: 90,
    /** 도로를 따라 호구 봇 사이 간격 (월드 px) */
    BOT_SPACING: 520,
  },
} as const;

export type Balance = typeof BALANCE;
