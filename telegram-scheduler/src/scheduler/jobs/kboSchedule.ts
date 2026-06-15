import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { ScheduleJob } from "../types";
import { logger } from "../../logger";
import { config } from "../../config";

const TEAM_NAME_TO_ID: Record<string, number> = {
  KIA: 1, KIA타이거즈: 1,
  삼성: 2, 삼성라이온즈: 2,
  LG: 3, LG트윈스: 3,
  두산: 4, 두산베어스: 4,
  KT: 5, KT위즈: 5,
  한화: 6, 한화이글스: 6,
  롯데: 7, 롯데자이언츠: 7,
  SSG: 8, SSG랜더스: 8,
  NC: 9, NC다이노스: 9,
  키움: 10, 키움히어로즈: 10,
};

// 팀 ID → Naver Sports 팀 코드
const TEAM_ID_TO_CODE: Record<number, string> = {
  1: "HT", 2: "SS", 3: "LG", 4: "OB", 5: "KT",
  6: "HH", 7: "LT", 8: "SK", 9: "NC", 10: "WO",
};

function toTeamId(name: string): number | null {
  if (!name) return null;
  if (TEAM_NAME_TO_ID[name]) return TEAM_NAME_TO_ID[name];
  for (const [key, val] of Object.entries(TEAM_NAME_TO_ID)) {
    if (name.includes(key) || key.includes(name)) return val;
  }
  return null;
}

async function fetchH2H(homeId: number, awayId: number, year: number): Promise<string | null> {
  const homeCode = TEAM_ID_TO_CODE[homeId];
  const awayCode = TEAM_ID_TO_CODE[awayId];
  if (!homeCode || !awayCode) return null;

  try {
    const res = await axios.get("https://api-gw.sports.naver.com/record/team/season/teamVs", {
      params: { categoryId: "kbo", teamCode: homeCode, oppTeamCode: awayCode, seasonYear: year },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://sports.news.naver.com/",
      },
      timeout: 6000,
    });

    const record =
      res.data?.result?.record ??
      res.data?.result?.vsRecord ??
      res.data?.record ??
      res.data?.vsRecord;

    if (record) {
      const w = (record.win  ?? record.w ?? 0) as number;
      const l = (record.lose ?? record.l ?? 0) as number;
      const d = (record.draw ?? record.d ?? 0) as number;
      if (w + l + d > 0) return d > 0 ? `${w}:${l}:${d}` : `${w}:${l}`;
    }
  } catch {
    logger.warn(`[kbo-schedule] H2H fetch failed: ${homeCode} vs ${awayCode}`);
  }
  return null;
}

function getKstYyyymmdd(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return [
    kst.getFullYear(),
    String(kst.getMonth() + 1).padStart(2, "0"),
    String(kst.getDate()).padStart(2, "0"),
  ].join("");
}

async function fetchDayGames(yyyymmdd: string): Promise<Array<[number, number, string | null]>> {
  const res = await axios.get("https://api-gw.sports.naver.com/schedule/games", {
    params: {
      fields: "basic",
      upperCategoryId: "kbaseball",
      categoryId: "kbo",
      date: yyyymmdd,
      roundCodes: "",
      size: 100,
    },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://sports.news.naver.com/",
    },
    timeout: 10000,
  });

  const games: unknown[] =
    (res.data?.result?.games ?? res.data?.games ?? []) as unknown[];

  logger.info(`[kbo-schedule] ${yyyymmdd}: API returned ${games.length} games`);

  const matchups: Array<[number, number, string | null]> = [];
  for (const g of games) {
    const game = g as Record<string, unknown>;
    const home = (game.homeTeam ?? game.home_team) as Record<string, unknown> | undefined;
    const away = (game.awayTeam ?? game.away_team) as Record<string, unknown> | undefined;
    const homeName = (home?.teamName ?? home?.name ?? home?.teamKey ?? "") as string;
    const awayName = (away?.teamName ?? away?.name ?? away?.teamKey ?? "") as string;

    const homeId = toTeamId(homeName);
    const awayId = toTeamId(awayName);

    if (!homeId || !awayId) {
      logger.warn(`[kbo-schedule] Unknown team: home="${homeName}" away="${awayName}"`);
      continue;
    }

    // 1차: 스케줄 API 응답에서 상대전적 추출 시도
    const vsRaw = (
      game.homeVsAwayRecord ?? game.vsRecord ?? game.h2hRecord ??
      game.seasonRecord ?? (home as Record<string, unknown>)?.vsRecord
    ) as Record<string, number> | null | undefined;

    let h2h: string | null = null;
    if (vsRaw) {
      const hw = (vsRaw.homeWin ?? vsRaw.win ?? vsRaw.w ?? 0) as number;
      const aw = (vsRaw.awayWin ?? vsRaw.lose ?? vsRaw.l ?? 0) as number;
      const d  = (vsRaw.draw ?? vsRaw.tie ?? vsRaw.d ?? 0) as number;
      if (hw + aw + d > 0) {
        h2h = d > 0 ? `${hw}:${aw}:${d}` : `${hw}:${aw}`;
      }
    }

    // 2차: 스케줄 API에 없으면 별도 H2H API 호출
    if (!h2h) {
      const year = parseInt(yyyymmdd.slice(0, 4), 10);
      h2h = await fetchH2H(homeId, awayId, year);
    }

    matchups.push([homeId, awayId, h2h]);
  }

  return matchups;
}

export const kboScheduleJob: ScheduleJob = {
  name: "kbo-schedule",
  cronExpression: "0 8 * * *", // 매일 08:00 KST
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    // 오늘 포함 3일치 저장 (오늘 경기 없어도 다음 경기 날짜를 프론트에서 찾을 수 있도록)
    for (let offset = 0; offset <= 2; offset++) {
      const yyyymmdd = getKstYyyymmdd(offset);
      const isoDate = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

      const games = await fetchDayGames(yyyymmdd);

      const { error } = await supabase
        .from("kboTodaySchedule")
        .upsert(
          { date: isoDate, games, updated_at: new Date().toISOString() },
          { onConflict: "date" }
        );

      if (error) {
        logger.error(`[kbo-schedule] Failed to save ${isoDate}`, error);
        throw error;
      }
    }

    logger.info("[kbo-schedule] Done");
  },
};
