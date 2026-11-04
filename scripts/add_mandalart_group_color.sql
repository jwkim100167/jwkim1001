-- ============================================================
-- 만다라트 그룹 멤버 색깔 (빨주노초파남보, 그룹 안 1색 1명)
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================

ALTER TABLE "mandalartGroupMemberTable"
  ADD COLUMN IF NOT EXISTS color TEXT;   -- red, orange, yellow, green, blue, navy, purple

-- 기존 멤버: 그룹별 가입 순서대로 빨→보 배정 (8번째부터는 비워 둠)
WITH ranked AS (
  SELECT group_id, user_id,
         ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY joined_at) AS rn
  FROM "mandalartGroupMemberTable"
)
UPDATE "mandalartGroupMemberTable" m
SET color = (ARRAY['red','orange','yellow','green','blue','navy','purple'])[r.rn]
FROM ranked r
WHERE m.group_id = r.group_id
  AND m.user_id = r.user_id
  AND m.color IS NULL
  AND r.rn <= 7;

-- 그룹 안 색 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS "mandalartGroupMember_color_uniq"
  ON "mandalartGroupMemberTable" (group_id, color)
  WHERE color IS NOT NULL;
