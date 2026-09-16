/**
 * 현재 kboTodaySchedule 테이블에서 H2H가 null인 경기를 찾아 API로 채운다.
 * 실행: npx ts-node scripts/fillH2H.ts
 */
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.KBO_SUPABASE_URL!;
const SUPABASE_KEY = process.env.KBO_SUPABASE_SERVICE_KEY!;

const rest = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
});

const TEAM_ID_TO_CODE: Record<number, string> = {
  1: "HT", 2: "SS", 3: "LG", 4: "OB", 5: "KT",
  6: "HH", 7: "LT", 8: "SK", 9: "NC", 10: "WO",
};

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
      const w = (record.win ?? record.w ?? 0) as number;
      const l = (record.lose ?? record.l ?? 0) as number;
      const d = (record.draw ?? record.d ?? 0) as number;
      if (w + l + d > 0) return d > 0 ? `${w}:${l}:${d}` : `${w}:${l}`;
    }
  } catch (e: any) {
    console.warn(`  [warn] H2H 조회 실패: ${homeCode} vs ${awayCode} — ${e?.response?.status ?? e?.message}`);
    if (e?.response?.data) console.warn("  응답:", JSON.stringify(e.response.data).slice(0, 200));
  }
  return null;
}

async function main() {
  // Supabase REST API 직접 호출
  const { data: rows } = await rest.get("/kboTodaySchedule", {
    params: { select: "date,games", order: "date.asc" },
  });

  if (!rows || rows.length === 0) {
    console.log("데이터 없음");
    return;
  }

  console.log(`총 ${rows.length}개 날짜 처리 시작\n`);

  for (const row of rows) {
    const date: string = row.date;
    const year = parseInt(date.slice(0, 4), 10);
    const games: Array<[number, number, string | null]> = row.games;

    if (!Array.isArray(games) || games.length === 0) {
      console.log(`${date}: 경기 없음 — 스킵`);
      continue;
    }

    let changed = false;
    const updated = await Promise.all(
      games.map(async ([homeId, awayId, h2h]) => {
        if (h2h !== null) return [homeId, awayId, h2h] as [number, number, string | null];
        const fetched = await fetchH2H(homeId, awayId, year);
        if (fetched) {
          console.log(`  ${date}: ${homeId} vs ${awayId} → ${fetched}`);
          changed = true;
        }
        return [homeId, awayId, fetched] as [number, number, string | null];
      })
    );

    if (changed) {
      await rest.patch(
        "/kboTodaySchedule",
        { games: updated, updated_at: new Date().toISOString() },
        { params: { date: `eq.${date}` } }
      );
      console.log(`  ${date} 저장 완료`);
    } else {
      console.log(`${date}: 변경 없음`);
    }
  }

  console.log("\n완료");
}

main().catch((e) => {
  console.error("오류:", e.response?.data ?? e.message);
  process.exit(1);
});
