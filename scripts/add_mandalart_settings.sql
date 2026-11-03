-- ============================================================
-- 만다라트 개인 설정 컬럼 추가
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================

-- settings 예) { "targetRate": 80 }  — 목표 달성률(%)
ALTER TABLE "mandalartTable"
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
