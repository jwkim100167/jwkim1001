-- ============================================================
-- 만다라트 활동 로그 테이블 생성
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================

CREATE TABLE IF NOT EXISTS "mandalartLogTable" (
  id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT      NOT NULL,                 -- 행동한 사람 userTable.id
  group_id    BIGINT,                                -- 그룹 로그일 때만 (가입/탈퇴/위임/이름변경)
  type        TEXT        NOT NULL,                  -- progress, title, cell_achieved, group_join ...
  cell_id     TEXT,                                  -- 'r1c4' 등
  label       TEXT,                                  -- 당시 항목/섹터 이름
  before      TEXT,
  after       TEXT,
  is_shared   BOOLEAN     NOT NULL DEFAULT TRUE,     -- 그룹 공개 여부 (메모·공개전환 = false)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()     -- 5분 내 같은 변경 합치기 시 갱신
);

CREATE INDEX IF NOT EXISTS "mandalartLog_user_idx"
  ON "mandalartLogTable" (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS "mandalartLog_group_idx"
  ON "mandalartLogTable" (group_id, updated_at DESC);
