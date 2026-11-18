# 새 게임 기획

**게임명:** $ARGUMENTS

게임 규칙을 조사하고 구현 스펙을 설계한 뒤 `docs/games/{game}.md`를 생성한다.
이 커맨드가 완료된 후 `/new-game $ARGUMENTS`으로 구현을 시작한다.

---

## 프로젝트 맥락

- React 19 + Vite SPA (`src/`), Supabase 백엔드, GitHub Pages 배포
- 기존 멀티플레이어 게임 패턴 참조:
  - 서비스: `src/services/games/supabaseCobra.js`
  - 로비: `src/components/games/cobra/CobraGame.jsx`
  - 플레이: `src/components/games/cobra/CobraGamePlay.jsx`
  - 허브: `src/components/games/brain/BrainHub.jsx`
  - 라우트: `src/App.jsx`
- 테이블명 규칙: `{game}_rooms`, `{game}_players`
- 채널명 규칙: `{game}_room_{roomId}`
- RLS 비활성화, Realtime 활성화 필수
- UI 텍스트는 한국어, 모바일 친화적

---

## 에이전트 1 — 기획 (단일 에이전트)

**역할:** "$ARGUMENTS" 규칙을 조사하고 구현 스펙을 설계한 뒤 기획서 파일을 생성한다.

다음을 수행한다:

1. 웹 검색으로 "$ARGUMENTS" 규칙 파악 (한국어/영어 모두 검색)

2. 아래 항목을 포함한 스펙 설계:
   - 플레이어 수, 보드 구조, 초기 상태
   - 턴 구조, 가능한 행동, 승리 조건
   - `game_state` JSONB 필드 정의 (전체 예시 JSON 포함)
   - Supabase 테이블 DDL (`{game}_rooms`, `{game}_players`)
   - 서비스 함수 목록 (함수명 + 파라미터 + 역할 한 줄 설명)
   - 컴포넌트 파일 목록 및 각 화면 구성 요소
   - BrainHub에 추가할 항목 (`id`, `icon`, `title`, `desc`, `color`)
   - 라우트 경로 (예: `/{game}`)

3. `docs/games/{game}.md` 파일을 생성한다 (게임명을 소문자 영문으로 변환):

   ```
   # {GameName} 기획서

   ## 개요
   플레이어 수, 목표, 한 줄 설명

   ## 규칙
   - 턴 구조, 가능한 행동, 승리 조건 (bullet list)

   ## game_state 구조
   (전체 예시 JSON 코드블록)

   ## 서비스 함수 목록
   | 함수명 | 파라미터 | 역할 |
   |--------|----------|------|
   | ...    | ...      | ...  |

   ## 파일 구조
   - `src/services/games/supabase{GameName}.js`
   - `src/components/games/{game}/{GameName}Game.jsx`
   - `src/components/games/{game}/{GameName}Play.jsx`
   - `src/utils/games/{game}Logic.js` (필요 시)
   - `scripts/create_{game}_tables.sql`

   ## BrainHub 항목
   (id, icon, title, desc, color 값)

   ## 라우트
   경로: `/{game}`

   ## 게임 흐름도

   ```mermaid
   stateDiagram-v2
     [*] --> waiting : 방 생성
     waiting --> playing : 게임 시작
     playing --> ... : 행동
     playing --> finished : 승리 조건
     finished --> waiting : 다시 시작
     finished --> [*] : 나가기
   ```
   (실제 게임 상태·전이를 반영해서 작성)
   ```

4. 최종적으로 다음을 출력한다:
   - 생성된 `docs/games/{game}.md` 경로
   - 스펙 요약 (플레이어 수, 핵심 규칙 2~3줄)
   - 다음 실행 커맨드: `/new-game $ARGUMENTS`
