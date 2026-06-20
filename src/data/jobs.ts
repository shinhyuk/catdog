import type { JobId } from '../types';

export interface JobDef {
  id: JobId;
  emoji: string;
  name: string;
  tagline: string;
  desc: string;
  weakness: string;
  /** 상성: 이 직업이 우위를 점하는 상대 */
  beats: JobId;
  accent: string; // tailwind color class
}

// 가위바위보 상성: 정찰 > 은신 > 강탈 > (노출) > 정찰
export const JOBS: Record<JobId, JobDef> = {
  scout: {
    id: 'scout',
    emoji: '🔍',
    name: '정찰자',
    tagline: '호구를 찾아 명단에 올린다',
    desc: '어제 걸음을 읽어 호구를 진영 공유 명단에 등록한다. 2~5% 소액 절도. 은신 간파 + 노출 1시간 시각 지정.',
    weakness: '직접 벌이가 약하고 본인은 무방비.',
    beats: 'stealth',
    accent: 'text-emerald-400',
  },
  robber: {
    id: 'robber',
    emoji: '💥',
    name: '강탈자',
    tagline: '명단을 보고 10% 강탈',
    desc: '명단/확인 타겟을 10% 강탈. 약탈 후 본인 노출. 은신자는 못 뚫고, 호구를 스스로 못 찾아 정찰에 의존. 정찰자에게 커미션 1~3% 지급.',
    weakness: '약탈 후 노출되고, 정찰 없이는 눈이 먼다.',
    beats: 'scout',
    accent: 'text-rose-400',
  },
  stealth: {
    id: 'stealth',
    emoji: '🥷',
    name: '은신형',
    tagline: '명단에서 사라진다',
    desc: '명단에서 사라진다. 절도 0(적립만). 간파당하면 노출(본인에게 통보, 60~30분).',
    weakness: '벌이가 없고, 간파당하면 노출된다.',
    beats: 'robber',
    accent: 'text-sky-400',
  },
};

export const JOB_ORDER: JobId[] = ['scout', 'robber', 'stealth'];
