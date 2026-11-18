# 기존 게임 기획서 역생성

**게임명:** $ARGUMENTS

기존 게임 코드를 읽어 `docs/games/{game}.md` 기획서를 생성한다.
생성 후 `/fix-game`, `/refactor-*` 실행 시 기획서 컨텍스트를 활용할 수 있다.

---

## 프로젝트 맥락

- React 19 + Vite SPA, Supabase 백엔드
- 기존 멀티플레이어 게임: Cobra, Blokus, Akinator, TurneyKia, Typing, HalliGalli
- 게임 파일 위치:
  - 서비스: `src/services/games/supabase{GameName}.js`
  - 컴포넌트: `src/components/games/{game}/`
  - 유틸: `src/utils/games/{game}Logic.js` (존재하는 경우)

---

## 에이전트 1 — 역문서화 (단일 에이전트)

**역할:** 코드를 읽어 `docs/games/{game}.md` 파일을 생성한다.

다음을 수행한다:

1. 아래 파일을 모두 읽는다:
   - `src/services/games/supabase{GameName}.js`
   - `src/components/games/{game}/{GameName}Game.jsx`
   - `src/components/games/{game}/{GameName}Play.jsx`
   - `src/utils/games/{game}Logic.js` (존재하면)

2. 코드에서 다음을 추출한다:
   - `game_state` 구조 — `startGame()` 또는 `resetGame()`의 초기화 코드 기반
   - 서비스 함수 목록 — export된 함수 전체 (함수명, 파라미터, 역할)
   - 게임 phase 전이 — 컴포넌트에서 `phase`, `status`, `stage` 등의 상태가 언제 어떻게 바뀌는지

3. `docs/games/` 디렉토리가 없으면 먼저 생성한다.

4. `docs/games/{game}.md` 파일을 생성한다:

   ```
   # {GameName} 기획서

   > 이 문서는 기존 코드를 역분석해 자동 생성됐습니다. 필요시 직접 수정하세요.

   ## 개요
   - 플레이어 수
   - 게임 목표 (한 줄)

   ## 규칙
   - 턴 구조 (누가, 언제, 무엇을)
   - 가능한 행동 목록
   - 승리 조건

   ## game_state 구조
   (startGame/resetGame에서 추출한 실제 초기화 JSON 코드블록)

   ## 서비스 함수 목록
   | 함수명 | 파라미터 | 역할 |
   |--------|----------|------|
   | ...    | ...      | ...  |

   ## 파일 구조
   - `src/services/games/supabase{GameName}.js`
   - `src/components/games/{game}/{GameName}Game.jsx`
   - `src/components/games/{game}/{GameName}Play.jsx`
   - `src/utils/games/{game}Logic.js` (존재 시)

   ## 게임 흐름도

   ```mermaid
   stateDiagram-v2
     (실제 phase/status 전이를 반영해서 작성)
   ```
   ```

5. 생성 완료 후 다음을 출력한다:
   - 생성된 파일 경로
   - 코드에서 명확히 파악되지 않은 항목 목록 (수동 보완 필요 사항)
