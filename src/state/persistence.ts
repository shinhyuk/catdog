import type { GameState } from '../types';
import { createInitialState, STATE_VERSION } from './initialState';

// 상태는 오직 여기서만 localStorage와 동기화한다. (CLAUDE.md: 코딩 규칙)
// 컴포넌트가 직접 localStorage를 만지지 않는다.

const KEY = 'catdog.save.v1';

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== STATE_VERSION) {
      // 버전 불일치: Phase 1에선 그냥 초기화 (마이그레이션 없음)
      return createInitialState();
    }
    return { ...createInitialState(), ...parsed };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 조용히 무시 (사파리 프라이빗 모드 등)
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
