# 게임 서비스 파일 패턴 정리

**입력:** $ARGUMENTS
(게임명. 예: `blokus`, `akinator`, `turneyKia`)

아래 순서대로 3개의 에이전트를 실행해서 게임 서비스 파일을 최신 표준 패턴으로 정리한다.

---

## 프로젝트 맥락 (모든 에이전트 공통)

- 서비스 파일 위치: `src/services/games/supabase{GameName}.js`
- **표준 패턴 기준 파일**: `src/services/games/supabaseCobra.js` (가장 최근 수정됨)
- 주요 표준:
  - 메인 액션 함수는 `fetchLatestState()`로 최신 state 조회 후 사용 (stale props 금지)
  - 채널명 규칙: `{game}_room_{roomId}`
  - 함수명 통일: `createRoom`, `joinRoom`, `getRoomData`, `getRoomPlayers`, `leaveRoom`, `deleteRoom`, `promoteToHost`, `startGame`, `resetGame`, `subscribeToRoom`, `unsubscribeFromRoom`
  - `updateGameState()` 는 한 번의 호출로 완결 (중간 상태 저장 금지)

---

## 에이전트 1 — 탐색 (가장 먼저 실행)

**역할:** 대상 게임 서비스 파일과 표준 기준 파일을 비교해 개선점을 도출한다.

1. `src/services/games/supabase{GameName}.js` 전체를 읽는다
2. `src/services/games/supabaseCobra.js` 의 함수 구조도 읽는다
3. 다음을 비교·파악한다:
   - 함수명 불일치 (예: `resetToWaiting` vs `resetGame`)
   - `fetchLatestState()` 없이 props gameState를 직접 쓰는 함수
   - 에러 핸들링 누락된 함수
   - Realtime 채널명 규칙 불일치
   - 표준에 없는 불필요한 함수 또는 누락된 함수
4. 개선 목록과 우선순위를 반환한다

---

## 에이전트 2 — 수정 (에이전트 1 완료 후)

**역할:** 에이전트 1의 개선 목록대로 최소한의 변경으로 파일을 정리한다.

원칙:
- 게임 로직 자체는 건드리지 않는다 (방 관리·패턴만 정리)
- 수정 전 파일을 다시 읽는다
- 함수명 변경 시 해당 함수를 사용하는 컴포넌트 파일도 함께 확인하고 수정한다
- 수정 완료 후 변경 내용 요약 반환

---

## 에이전트 3 — QA (에이전트 2 완료 후)

**역할:** 수정된 파일 검토 및 검증 안내.

### 코드 리뷰
- 함수명 변경 후 컴포넌트에서 import/호출 경로가 모두 업데이트됐는지
- `fetchLatestState()` 추가 후 에러 처리 존재하는지
- 채널명 변경 시 구독/해제 양쪽이 모두 변경됐는지

### 수동 검증 체크리스트
1. `npm run dev` → 해당 게임 화면으로 이동
2. 방 생성 → 입장 → 실시간 업데이트 확인
3. 나가기 → 호스트 승계 확인
4. 콘솔 에러 없는지 확인
