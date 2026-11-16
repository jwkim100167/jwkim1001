-- ============================================================
-- 만다라트 그룹 테이블 생성
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. mandalartGroupTable — 그룹 (초대코드로 가입)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mandalartGroupTable" (
  id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT        NOT NULL,              -- 그룹명
  invite_code TEXT        NOT NULL UNIQUE,       -- 6자리 초대코드 (대문자+숫자)
  owner_id    BIGINT      NOT NULL,              -- 만든 사람 userTable.id
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 2. mandalartGroupMemberTable — 그룹 멤버 (한 사람이 여러 그룹 가능)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mandalartGroupMemberTable" (
  group_id  BIGINT      NOT NULL REFERENCES "mandalartGroupTable"(id) ON DELETE CASCADE,
  user_id   BIGINT      NOT NULL,                -- userTable.id
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS "mandalartGroupMember_user_idx"
  ON "mandalartGroupMemberTable" (user_id);
