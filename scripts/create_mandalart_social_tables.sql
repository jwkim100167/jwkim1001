-- ============================================================
-- 만다라트 소셜 (공개 설정 + 응원) 테이블 생성
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. mandalartTable — 소셜 공개 여부 컬럼 추가 (기본 비공개)
-- ────────────────────────────────────────────────────────────
ALTER TABLE "mandalartTable"
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;


-- ────────────────────────────────────────────────────────────
-- 2. mandalartLikeTable — 응원(👏) 기록 (1인 1회)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mandalartLikeTable" (
  target_user_id BIGINT      NOT NULL,           -- 응원받은 사람 userTable.id
  user_id        BIGINT      NOT NULL,           -- 응원한 사람 userTable.id
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (target_user_id, user_id)
);
