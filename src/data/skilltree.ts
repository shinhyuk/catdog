import type { JobId } from '../types';

// skilltree.md 구조를 그대로 데이터화. 새 스킬 추가 = 데이터 한 줄.
// 직업당 3갈래. 갈래마다 13pt(스킬 12 + 궁극기 1).
// 게이트: 중단(T2)=갈래 5pt / 궁극기(T3)=갈래 12pt.

export type Tier = 1 | 2 | 3;

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  maxRank: number;
  tier: Tier;
  ultimate?: boolean;
}

export interface BranchDef {
  id: string;
  name: string;
  blurb: string;
  skills: SkillDef[];
}

export interface JobTreeDef {
  job: JobId;
  branches: BranchDef[];
}

/**
 * 한 갈래를 표준 형태로 만든다.
 * T1: 4 스킬 × 2랭크 = 8
 * T2: 2 스킬 × 2랭크 = 4  (게이트 5)
 * T3: 궁극기 1 × 1랭크 = 1 (게이트 12)
 * → 합 13 (스킬 12 + 궁극기 1)
 */
function branch(
  id: string,
  name: string,
  blurb: string,
  t1: [string, string][],
  t2: [string, string][],
  ult: [string, string]
): BranchDef {
  const skills: SkillDef[] = [];
  t1.forEach(([n, d], i) => skills.push({ id: `${id}-a${i}`, name: n, desc: d, maxRank: 2, tier: 1 }));
  t2.forEach(([n, d], i) => skills.push({ id: `${id}-b${i}`, name: n, desc: d, maxRank: 2, tier: 2 }));
  skills.push({ id: `${id}-ult`, name: ult[0], desc: ult[1], maxRank: 1, tier: 3, ultimate: true });
  return { id, name, blurb, skills };
}

export const SKILL_TREE: Record<JobId, JobTreeDef> = {
  // ── 🔍 정찰자 ───────────────────────────────────────────
  scout: {
    job: 'scout',
    branches: [
      branch(
        'scout-vision',
        '시야',
        '더 멀리, 더 많이 본다.',
        [
          ['원시', '명단에 보이는 호구 수 +1'],
          ['독해', '어제 걸음 추정 오차 감소'],
          ['야간시', '밤 시간대 정찰 효율 +'],
          ['광역 스캔', '한 번에 훑는 범위 +'],
        ],
        [
          ['약점 분석', '소액 절도율 +0.5%p (상한 5% 내)'],
          ['표적 우선순위', '큰 지갑부터 명단 상단 정렬'],
        ],
        ['전지(全知)', '하루 1회, 진영 전체 호구를 한꺼번에 노출']
      ),
      branch(
        'scout-detect',
        '간파',
        '은신을 꿰뚫는다.',
        [
          ['육감', '은신자 간파 확률 +'],
          ['발자국', '간파 시 노출 시간 +'],
          ['미행', '간파 대상 추적 유지'],
          ['역탐', '나를 노린 자 역추적'],
        ],
        [
          ['그림자 사냥', '은신 간파 후 위치 고정'],
          ['연쇄 간파', '간파 성공 시 다음 간파 강화'],
        ],
        ['투시', '하루 1회, 진영 내 모든 은신자 강제 노출']
      ),
      branch(
        'scout-mark',
        '표식',
        '낙인을 찍어 아군에게 넘긴다.',
        [
          ['낙인', '노출 시간 +'],
          ['공유', '명단 등록 시 커미션 가산'],
          ['지속', '명단 잔존 시간 +'],
          ['중계', '강탈자 커미션 수령 +'],
        ],
        [
          ['현상금', '표식 대상 강탈 시 커미션 2배'],
          ['집중 표적', '한 호구에 다중 표식'],
        ],
        ['공개 수배', '하루 1회, 표식 대상 노출 시간 대폭 증가']
      ),
    ],
  },

  // ── 💥 강탈자 ───────────────────────────────────────────
  robber: {
    job: 'robber',
    branches: [
      branch(
        'robber-force',
        '완력',
        '한 방의 크기를 키운다.',
        [
          ['주먹', '강탈 성공률 +'],
          ['근력', '강탈 자산 효율 +'],
          ['배짱', '연속 강탈 패널티 감소'],
          ['집념', '실패 시 재시도 보너스'],
        ],
        [
          ['콤보', '연계 성공 시 강탈율 +5%p (천장 10%→15%)'],
          ['약점 가격', '노출된 표적 추가 피해'],
        ],
        ['철권', '하루 1회, 다음 강탈 천장 일시 해제(콤보 한정)']
      ),
      branch(
        'robber-hunt',
        '추적',
        '도망친 먹잇감을 쫓는다.',
        [
          ['후각', '복수 추적 성공률 +'],
          ['지구력', '추적 거리 +'],
          ['포위', '도주 차단'],
          ['되갚음', '나를 턴 자에게 추가 피해'],
        ],
        [
          ['끈질김', '추적 실패해도 다음 시도 강화'],
          ['협공', '아군 정찰 표식과 연계'],
        ],
        ['끝까지', '하루 1회, 복수 대상 은신 무시하고 추적']
      ),
      branch(
        'robber-plunder',
        '약탈',
        '빼앗는 양 그 자체.',
        [
          ['긁기', '강탈 자산 +'],
          ['약탈 가방', '하루 강탈 횟수 +'],
          ['은폐', '강탈 후 본인 노출 시간 -'],
          ['세금 회피', '커미션 부담 -'],
        ],
        [
          ['이중 약탈', '한 타겟 연속 2회'],
          ['전리품', '강탈 성공 시 자산 보너스'],
        ],
        ['약탈제(祭)', '하루 1회, 본인 노출 없이 강탈']
      ),
    ],
  },

  // ── 🥷 은신형 ───────────────────────────────────────────
  stealth: {
    job: 'stealth',
    branches: [
      branch(
        'stealth-shadow',
        '잠행',
        '명단에서 더 깊이 숨는다.',
        [
          ['숨죽임', '간파당할 확률 -'],
          ['무영', '노출 시간 -'],
          ['위장', '거짓 자산 규모 노출'],
          ['소거', '명단 잔존 흔적 제거'],
        ],
        [
          ['연막', '간파 1회 무효'],
          ['그림자 분신', '추적 교란'],
        ],
        ['완전 은신', '하루 1회, 그날 간파·노출 전면 차단']
      ),
      branch(
        'stealth-evade',
        '회피',
        '털려도 적게 털린다.',
        [
          ['미끄러짐', 'leak 누수율 -'],
          ['둔갑', '강탈 피해 -'],
          ['반사', '강탈자 노출 시간 +'],
          ['역공', '나를 턴 자 표식'],
        ],
        [
          ['철벽', '강탈은 영원히 은신을 못 뚫는다(천장)'],
          ['반격', '피해 일부 되돌림'],
        ],
        ['허(虛)', '하루 1회, 그날 모든 강탈 무효']
      ),
      branch(
        'stealth-accrue',
        '적립',
        '벌이 대신 쌓는다.',
        [
          ['저금', '걸음당 자산 +'],
          ['복리', '미사용 자산 이자'],
          ['절약', '정산 차감 -'],
          ['비축', '오늘 걸음 보존 +'],
        ],
        [
          ['금고', 'leak 정산 차감 추가 감소'],
          ['은닉처', '보이는 자산만 줄이고 지갑 보존'],
        ],
        ['축재(蓄財)', '하루 1회, 그날 적립 2배']
      ),
    ],
  },
};

export const ALL_BRANCHES = (job: JobId) => SKILL_TREE[job].branches;

/** 특정 갈래에 투자된 총 포인트 */
export function branchInvested(
  skills: Record<string, number>,
  branchDef: BranchDef
): number {
  return branchDef.skills.reduce((sum, s) => sum + (skills[s.id] ?? 0), 0);
}
