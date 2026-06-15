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

function toTeamId(name: string): number | null {
  if (!name) return null;
  if (TEAM_NAME_TO_ID[name]) return TEAM_NAME_TO_ID[name];
  for (const [key, val] of Object.entries(TEAM_NAME_TO_ID)) {
    if (name.includes(key) || key.includes(name)) return val;
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

async function fetchDayGames(yyyymmdd: string): Promise<Array<[number, number]>> {
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

  const matchups: Array<[number, number]> = [];
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

    matchups.push([homeId, awayId]);
  }

  return matchups;
}

export const kboScheduleJob: ScheduleJob = {
  name: "kbo-schedule",
  cronExpression: "0 8 * * *", // 매일 08:00 KST
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    const kboUrl = process.env.KBO_SUPABASE_URL ?? config.supabase.url;
    const kboKey = process.env.KBO_SUPABASE_SERVICE_KEY ?? config.supabase.serviceKey;
    const supabase = createClient(kboUrl, kboKey);

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
