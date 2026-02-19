-- ============================================================
-- 매일 16:00 KST (07:00 UTC) 기준으로
-- last_login_at 이 90일 전이거나 NULL 인 유저를 OFFLINE 으로 변경
-- ============================================================
-- 실행 순서:
-- 1. Supabase 대시보드 → Database → Extensions → pg_cron 활성화
-- 2. userTable 에 last_login_at (timestamptz) 컬럼 추가 (없는 경우)
--    ALTER TABLE "userTable" ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
-- 3. 아래 SQL 을 Supabase SQL Editor 에서 실행

-- ────────────────────────────────────────────────────────────
-- Step 1: 상태 업데이트 함수 생성
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_offline_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "userTable"
  SET status = 'OFFLINE'
  WHERE status = 'ONLINE'
    AND (
      last_login_at IS NULL
      OR last_login_at < NOW() - INTERVAL '90 days'
    );

  RAISE LOG 'update_offline_status 실행 완료: %', NOW();
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Step 2: pg_cron 스케줄 등록
-- 매일 07:00 UTC = 16:00 KST
-- ────────────────────────────────────────────────────────────

-- 기존 스케줄이 있으면 먼저 삭제
SELECT cron.unschedule('update-offline-status')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-offline-status'
);

-- 스케줄 등록
SELECT cron.schedule(
  'update-offline-status',   -- 스케줄 이름
  '0 7 * * *',               -- 매일 07:00 UTC (= 16:00 KST)
  'SELECT update_offline_status()'
);


-- ────────────────────────────────────────────────────────────
-- 확인용: 등록된 스케줄 조회
-- ────────────────────────────────────────────────────────────
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'update-offline-status';


-- ────────────────────────────────────────────────────────────
-- 즉시 테스트 실행 (필요 시)
-- ────────────────────────────────────────────────────────────
-- SELECT update_offline_status();
