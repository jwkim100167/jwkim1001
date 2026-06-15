import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { ScheduleJob } from "../types";
import { logger } from "../../logger";
import { config } from "../../config";

const TEAM_NAME_TO_ID: Record<string, number> = {
  KIA: 1, 삼성: 2, LG: 3, 두산: 4, KT: 5,
  한화: 6, 롯데: 7, SSG: 8, NC: 9, 키움: 10,
};

function toTeamId(name: string): number | null {
  const trimmed = name.trim();
  if (TEAM_NAME_TO_ID[trimmed]) return TEAM_NAME_TO_ID[trimmed];
  for (const [key, val] of Object.entries(TEAM_NAME_TO_ID)) {
    if (trimmed.includes(key) || key.includes(trimmed)) return val;
  }
  return null;
}

async function scrapeH2H(): Promise<Array<{
  season: number; team_id: number; opp_id: number;
  wins: number; draws: number; losses: number; updated_at: string;
}>> {
  const res = await axios.get(
    "https://www.koreabaseball.com/record/teamrank/teamrank.aspx",
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.koreabaseball.com/",
      },
      timeout: 15000,
    }
  );

  const $ = cheerio.load(res.data as string);
  const season = new Date().getFullYear();
  const now = new Date().toISOString();
  const rows: ReturnType<typeof scrapeH2H> extends Promise<infer T> ? T : never = [];

  // 팀간 승패표 찾기: "팀간 승패표" 텍스트를 포함하는 섹션의 table
  let h2hTable = $("table").filter((_, el) => {
    const prev = $(el).closest("div, section, article").find("h3, h4, caption, .tit, .title").text();
    return prev.includes("팀간 승패표");
  }).first();

  // 못 찾으면 모든 table 중 10×10 구조인 것 탐색
  if (!h2hTable.length) {
    $("table").each((_, el) => {
      const tbl = $(el);
      const headerCells = tbl.find("tr").first().find("th, td").length;
      // 헤더 포함 11~12열 이상이면 팀간 승패표
      if (headerCells >= 11) {
        h2hTable = tbl;
        return false; // break
      }
    });
  }

  if (!h2hTable.length) {
    throw new Error("[kbo-h2h-scrape] 팀간 승패표 테이블을 찾지 못했습니다");
  }

  const tableRows = h2hTable.find("tr").toArray();

  // 헤더 행에서 컬럼 팀 목록 추출
  const headerRow = tableRows[0];
  const colTeamIds: Array<number | null> = [];
  $(headerRow).find("th, td").each((i, cell) => {
    if (i === 0) return; // 첫 번째 셀(팀명 레이블) 스킵
    const text = $(cell).text().trim();
    colTeamIds.push(toTeamId(text));
  });

  // 데이터 행 파싱
  for (let r = 1; r < tableRows.length; r++) {
    const cells = $(tableRows[r]).find("th, td").toArray();
    if (cells.length < 2) continue;

    const rowTeamName = $(cells[0]).text().trim();
    const rowTeamId = toTeamId(rowTeamName);
    if (!rowTeamId) continue;

    for (let c = 1; c < cells.length; c++) {
      const colTeamId = colTeamIds[c - 1];
      if (!colTeamId) continue;
      if (colTeamId === rowTeamId) continue; // 대각선 ■ 스킵

      const cellText = $(cells[c]).text().trim();
      if (cellText === "■" || cellText === "") continue;

      // "5-3-0" 형식 파싱 (승-패-무)
      const parts = cellText.split("-").map((s) => parseInt(s.trim(), 10));
      if (parts.length < 2 || parts.some(isNaN)) continue;

      rows.push({
        season,
        team_id: rowTeamId,
        opp_id: colTeamId,
        wins:   parts[0] ?? 0,
        losses: parts[1] ?? 0,
        draws:  parts[2] ?? 0,
        updated_at: now,
      });
    }
  }

  return rows;
}

export const kboH2HScrapeJob: ScheduleJob = {
  name: "kbo-h2h-scrape",
  cronExpression: "30 0 * * *", // 매일 00:30 KST (경기 종료 후)
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    const rows = await scrapeH2H();
    logger.info(`[kbo-h2h-scrape] 파싱 완료: ${rows.length}건`);

    if (rows.length === 0) {
      logger.warn("[kbo-h2h-scrape] 파싱된 데이터 없음 — 업데이트 스킵");
      return;
    }

    const supabase = createClient(config.kboSupabase.url, config.kboSupabase.serviceKey);
    const { error } = await supabase
      .from("kboH2H")
      .upsert(rows, { onConflict: "season,team_id,opp_id" });

    if (error) {
      logger.error("[kbo-h2h-scrape] DB 저장 실패", error);
      throw error;
    }

    logger.info(`[kbo-h2h-scrape] Done — ${rows.length}건 저장`);
  },
};
