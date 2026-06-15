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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchH2HFromDB(
  kboSupabase: any,
  homeId: number,
  awayId: number,
  season: number
): Promise<string | null> {
  const { data } = await kboSupabase
    .from("kboH2H")
    .select("wins, draws, losses")
    .eq("season", season)
    .eq("team_id", homeId)
    .eq("opp_id", awayId)
    .maybeSingle();
  if (!data) return null;
  const { wins, draws, losses } = data as { wins: number; draws: number; losses: number };
  if (wins + draws + losses === 0) return null;
  return draws > 0 ? `${wins}:${losses}:${draws}` : `${wins}:${losses}`;
}

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
    const supabase = createClient(config.kboSupabase.url, config.kboSupabase.serviceKey);
    const season = new Date().getFullYear();

    // 오늘 포함 3일치 저장 (오늘 경기 없어도 다음 경기 날짜를 프론트에서 찾을 수 있도록)
    for (let offset = 0; offset <= 2; offset++) {
      const yyyymmdd = getKstYyyymmdd(offset);
      const isoDate = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

      const matchups = await fetchDayGames(yyyymmdd);

      // H2H를 DB에서 병렬 조회하여 [homeId, awayId, h2h] 형태로 구성
      const games: Array<[number, number, string | null]> = await Promise.all(
        matchups.map(async ([homeId, awayId]) => {
          const h2h = await fetchH2HFromDB(supabase, homeId, awayId, season);
          return [homeId, awayId, h2h];
        })
      );

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
