-- ────────────────────────────────────────────────────────────
-- 1. userTable 의 status 값 현황 확인
-- ────────────────────────────────────────────────────────────
SELECT status, COUNT(*) AS cnt
FROM "userTable"
GROUP BY status;

-- ────────────────────────────────────────────────────────────
-- 2. loginHistoryTable 컬럼 구조 확인
-- ────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loginHistoryTable'
ORDER BY ordinal_position;

-- ────────────────────────────────────────────────────────────
-- 3. 최근 90일 내 로그인한 u_id 목록 확인
-- ────────────────────────────────────────────────────────────
SELECT DISTINCT u_id
FROM "loginHistoryTable"
WHERE created_at > NOW() - INTERVAL '90 days';

-- ────────────────────────────────────────────────────────────
-- 4. OFFLINE 으로 바뀌어야 할 유저 확인 (실제 UPDATE 전 미리보기)
-- ────────────────────────────────────────────────────────────
SELECT id, login_id, status
FROM "userTable"
WHERE status = 'ONLINE'
AND id NOT IN (
  SELECT u_id FROM "loginHistoryTable"
  WHERE u_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '90 days'
);
