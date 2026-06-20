# 개냥 대전 (Dog vs Cat) 🐕⚔️🐈

GPS 출퇴근형 모바일 PvP 게임의 **Phase 1 웹 프로토타입**. 걸으면 자산이 쌓이고,
개 진영 vs 고양이 진영이 서로 약탈하며 겨룬다. 다른 플레이어는 봇으로 시뮬레이션한다.

> 핵심 루프: 걷기 → 레벨업·자산 적립 → 매일 아침 직업 선택 → 호구 명단 보고 약탈 →
> 털리고 복수 → 스킬트리 찍기.

## 빠른 시작

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 확인
npm run test     # 게임 로직 단위 테스트
```

## 기술 스택

Vite + React + TypeScript + Tailwind CSS. 정적 배포(GitHub Pages), 상태는 `localStorage`.
백엔드 없음.

## 구조

- `src/config/balance.ts` — 모든 튜닝 수치(단일 출처)
- `src/game/` — 순수 게임 로직(테스트 가능): 걸음·약탈·레벨·봇·시즌·스킬
- `src/data/` — 직업·스킬트리 데이터 주도 정의
- `src/features/` — 화면별 UI(온보딩·홈·명단·약탈·스킬)
- `src/state/` — `localStorage` 영속화 + 스토어

설계 원본은 [`docs/`](./docs)에, 프로젝트 가이드는 [`CLAUDE.md`](./CLAUDE.md)에 있다.

## 배포

`main`에 푸시하면 `.github/workflows/deploy.yml`이 GitHub Pages로 자동 배포한다.
저장소 Settings → Pages → Source를 **GitHub Actions**로 설정해야 한다.
프로젝트 페이지이므로 `vite.config.ts`의 `base`는 `/catdog/`.
