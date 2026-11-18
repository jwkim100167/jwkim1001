# 새 멀티플레이어 미니게임 구현

**게임명:** $ARGUMENTS

`/plan-game $ARGUMENTS`로 기획서가 완료된 후 실행한다.
`docs/games/{game}.md`를 읽어 스펙을 확인하고 아래 순서대로 4개의 에이전트를 순차 실행해서 구현을 완성한다.

---

## 프로젝트 맥락 (모든 에이전트 공통)

- React 19 + Vite SPA (`src/`), Supabase 백엔드, GitHub Pages 배포
- 기존 멀티플레이어 게임 패턴 참조:
  - 서비스: `src/services/games/supabaseCobra.js`
  - 로비 컴포넌트: `src/components/games/cobra/CobraGame.jsx`
  - 플레이 컴포넌트: `src/components/games/cobra/CobraGamePlay.jsx`
  - 허브: `src/components/games/brain/BrainHub.jsx`
  - 라우트: `src/App.jsx`
- 테이블명 규칙: `{game}_rooms`, `{game}_players`
- 채널명 규칙: `{game}_room_{roomId}`
- RLS 비활성화, Realtime 활성화 필수
- UI 텍스트는 한국어, 모바일 친화적

---

## 에이전트 1 — DB & 스키마 (가장 먼저 실행, 에이전트 2와 병렬)

**역할:** `docs/games/{game}.md` 스펙을 바탕으로 Supabase SQL을 준비한다.

`docs/games/{game}.md` 파일을 먼저 읽어 스펙을 확인한다.

다음 내용을 포함한 SQL 파일을 `scripts/create_{game}_tables.sql`에 작성한다:
- `{game}_rooms` 테이블 CREATE
- `{game}_players` 테이블 CREATE (room_id FK + ON DELETE CASCADE)
- `ALTER PUBLICATION supabase_realtime ADD TABLE` (rooms, players 양쪽)
- `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` (rooms, players 양쪽)
- `serviceConfigTable` INSERT (parent_id = 'mini-arcade')

기존 패턴 참조: `src/services/core/supabaseAdmin.js`, `src/services/games/supabaseCobra.js`

---

## 에이전트 2 — 서비스 레이어 (가장 먼저 실행, 에이전트 1과 병렬)

**역할:** `docs/games/{game}.md` 스펙을 바탕으로 `src/services/games/supabase{GameName}.js`를 작성한다.

`docs/games/{game}.md` 파일을 먼저 읽어 스펙을 확인한다.

기존 `supabaseCobra.js` 패턴을 기반으로 다음 함수를 구현한다:
- `createRoom(hostName, userId?)` → `{ room, player }`
- `joinRoom(code, playerName, userId?)` → `{ room, player }`
- `getRoomData(roomId)`
- `getRoomPlayers(roomId)`
- `leaveRoom(playerId)`
- `deleteRoom(roomId)`
- `promoteToHost(playerId)`
- `startGame(roomId, players)` — game_state 초기화
- `resetGame(roomId)`
- `subscribeToRoom(roomId, onUpdate, onRoomDeleted)` → channel
- `unsubscribeFromRoom(channel)`
- 게임 로직 함수들 (docs 스펙의 서비스 함수 목록 기반)

복잡한 순수 로직(BFS, 유효성 검사 등)은 `src/utils/games/{game}Logic.js`로 분리한다.

기존 파일을 반드시 먼저 읽고 패턴을 확인한 후 작성한다.

---

## 에이전트 3 — UI + 통합 (에이전트 2 완료 후)

**역할:** 컴포넌트, 라우트, 허브 연동을 구현한다.

`docs/games/{game}.md` 파일을 먼저 읽어 스펙을 확인한다.

다음 파일을 작성/수정한다:
1. `src/components/games/{game}/{GameName}Game.jsx` — 로비 + 대기실
   - 닉네임 입력, 방 만들기/참가하기, 플레이어 목록, 게임 시작 버튼(방장만)
   - Realtime 구독으로 실시간 업데이트
   - 호스트 이탈 시 승계 처리
2. `src/components/games/{game}/{GameName}Play.jsx` — 게임 플레이 화면
   - `docs/games/{game}.md`의 게임 흐름도와 UI 플로우 그대로 구현
3. `src/components/games/{game}/{GameName}Board.jsx` — 보드 순수 컴포넌트 (필요 시)
4. `src/components/games/{game}/{GameName}Game.css` — 스타일
5. `src/App.jsx` — 라우트 추가
6. `src/components/games/brain/BrainHub.jsx` — GAMES 배열에 항목 추가 (docs의 BrainHub 항목 참조)

기존 파일들을 반드시 먼저 읽고 패턴을 확인한 후 수정한다.

---

## 에이전트 4 — QA (에이전트 3 완료 후)

**역할:** 구현된 코드를 검토하고 테스트 시나리오를 작성한다.

다음을 수행한다:

### 코드 리뷰
- 서비스 함수의 에러 핸들링 누락 여부
- Realtime 채널 구독 해제(cleanup) 누락 여부
- 호스트 승계 로직 존재 여부
- 게임 로직 버그 (승리 조건, 상태 전이 등)
- 모바일 CSS 대응 여부

### 테스트 시나리오 작성
`e2e/{game}.spec.js` 파일에 Playwright 테스트를 작성한다:
- 방 생성 → 코드 복사 → 별도 탭 입장 → 대기실에서 2명 확인
- 게임 시작 → 첫 턴 플레이어 확인
- 기본 행동 1회 수행 → 상대 화면 실시간 갱신 확인
- 나가기 → 호스트 승계 확인
- 게임 종료 화면 확인

### 최종 체크리스트 출력
구현 완료 후 개발자가 직접 확인해야 할 항목 목록을 출력한다:
- Supabase 대시보드에서 SQL 실행 필요 항목
- 로컬에서 수동으로 확인해야 할 사항
