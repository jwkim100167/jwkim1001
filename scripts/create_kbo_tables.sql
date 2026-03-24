-- ============================================================
-- 2026 KBO 순위 예측 게임 테이블 생성
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. kboTeamTable — 구단 마스터 데이터
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "kboTeamTable" (
  id        INT         PRIMARY KEY,   -- 구단 고유 ID (1~10)
  name      TEXT        NOT NULL,      -- 구단명
  emoji     TEXT        NOT NULL,      -- 이모지
  color     TEXT        NOT NULL       -- 대표 색상 (HEX)
);

-- 구단 마스터 시드 데이터
INSERT INTO "kboTeamTable" (id, name, emoji, color) VALUES
  (1,  'KIA',  '🦁', '#e60012'),
  (2,  '삼성', '🦅', '#074ca1'),
  (3,  'LG',   '⚡', '#c30452'),
  (4,  '두산', '🐻', '#131230'),
  (5,  'KT',   '🔴', '#e60012'),
  (6,  '한화', '🦅', '#f37021'),
  (7,  '롯데', '🌊', '#e31837'),
  (8,  'SSG',  '🛍️', '#ce0e2d'),
  (9,  'NC',   '🎯', '#065ead'),
  (10, '키움', '⚾', '#820024')
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 2. kboActualRankTable — 시즌별 실제 순위 데이터
--    rank_order: 1위→10위 순서대로 팀 ID를 담은 배열 (jsonb)
--    예) [3, 1, 8, 5, 6, 2, 7, 9, 4, 10]
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "kboActualRankTable" (
  id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season       INT         NOT NULL DEFAULT 2026,  -- 시즌 연도
  rank_order   JSONB       NOT NULL,               -- [team_id, ...] 길이 10
  is_final     BOOLEAN     NOT NULL DEFAULT FALSE, -- 최종 확정 여부
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (season)
);

-- 2026 시즌 MOCK 초기값 (실제 API 연동 전 사용)
INSERT INTO "kboActualRankTable" (season, rank_order, is_final) VALUES
  (2026, '[3, 1, 8, 5, 6, 2, 7, 9, 4, 10]', FALSE)
ON CONFLICT (season) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 3. kboPredictionTable — 사용자별 순위 예측 데이터
--    data: 1위~5위를 예측한 팀 ID 5자리 문자열 (예: "12345")
--    my_team: 응원 팀 ID
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "kboPredictionTable" (
  id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season     INT         NOT NULL DEFAULT 2026,
  name       TEXT        NOT NULL,           -- 예측자 이름
  data       VARCHAR(5)  NOT NULL,           -- 5강 예측 (팀ID 5자리)
  my_team    INT         NOT NULL REFERENCES "kboTeamTable"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 샘플 예측 데이터
INSERT INTO "kboPredictionTable" (season, name, data, my_team) VALUES
  (2026, '김종웅1', '12345', 1),
  (2026, '김종웅2', '54321', 2),
  (2026, '이민준',  '31865', 3),
  (2026, '박서연',  '38516', 8),
  (2026, '최지훈',  '35186', 5),
  (2026, '한유나',  '13856', 6);


-- ────────────────────────────────────────────────────────────
-- 4. RLS (Row Level Security) 설정
--    - kboTeamTable, kboActualRankTable: 전체 공개 읽기
--    - kboPredictionTable: 전체 공개 읽기 / 익명 포함 삽입 허용
-- ────────────────────────────────────────────────────────────
ALTER TABLE "kboTeamTable"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kboActualRankTable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kboPredictionTable" ENABLE ROW LEVEL SECURITY;

-- kboTeamTable: 누구나 읽기 가능
CREATE POLICY "kboTeam_public_read"
  ON "kboTeamTable" FOR SELECT
  USING (true);

-- kboActualRankTable: 누구나 읽기 가능
CREATE POLICY "kboActualRank_public_read"
  ON "kboActualRankTable" FOR SELECT
  USING (true);

-- kboPredictionTable: 누구나 읽기/삽입 가능
CREATE POLICY "kboPrediction_public_read"
  ON "kboPredictionTable" FOR SELECT
  USING (true);

CREATE POLICY "kboPrediction_public_insert"
  ON "kboPredictionTable" FOR INSERT
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 확인용 쿼리
-- ────────────────────────────────────────────────────────────
SELECT 'kboTeamTable'       AS table_name, COUNT(*) AS rows FROM "kboTeamTable"
UNION ALL
SELECT 'kboActualRankTable',               COUNT(*)         FROM "kboActualRankTable"
UNION ALL
SELECT 'kboPredictionTable',               COUNT(*)         FROM "kboPredictionTable";
