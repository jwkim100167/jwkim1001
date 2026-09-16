/**
 * kboTodaySchedule의 기존 경기 데이터에 kboH2H DB 값을 붙여 업데이트
 */
import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const BASE = process.env.KBO_SUPABASE_URL!;
const KEY  = process.env.KBO_SUPABASE_SERVICE_KEY!;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function main() {
  // 1. kboTodaySchedule 조회
  const { data: rows } = await axios.get(`${BASE}/rest/v1/kboTodaySchedule`, {
    params: { select: "date,games", order: "date.asc" },
    headers,
  });

  // 2. kboH2H 전체 조회
  const { data: h2hRows } = await axios.get(`${BASE}/rest/v1/kboH2H`, {
    params: { select: "season,team_id,opp_id,wins,draws,losses", season: `eq.2026` },
    headers,
  });

  // team_id+opp_id → {wins, draws, losses} 맵 구성
  const h2hMap = new Map<string, { wins: number; draws: number; losses: number }>();
  for (const r of h2hRows) {
    h2hMap.set(`${r.team_id}-${r.opp_id}`, { wins: r.wins, draws: r.draws, losses: r.losses });
  }

  function formatH2H(homeId: number, awayId: number): string | null {
    const rec = h2hMap.get(`${homeId}-${awayId}`);
    if (!rec || rec.wins + rec.draws + rec.losses === 0) return null;
    return rec.draws > 0 ? `${rec.wins}:${rec.losses}:${rec.draws}` : `${rec.wins}:${rec.losses}`;
  }

  for (const row of rows) {
    if (!Array.isArray(row.games) || row.games.length === 0) {
      console.log(`${row.date}: 경기 없음 — 스킵`);
      continue;
    }

    const updated = row.games.map(([homeId, awayId]: [number, number]) => {
      const h2h = formatH2H(homeId, awayId);
      return [homeId, awayId, h2h];
    });

    await axios.patch(
      `${BASE}/rest/v1/kboTodaySchedule`,
      { games: updated, updated_at: new Date().toISOString() },
      { params: { date: `eq.${row.date}` }, headers }
    );

    console.log(`${row.date}: ${updated.map((g: any[]) => `${g[0]}vs${g[1]}:${g[2]}`).join(", ")}`);
  }

  console.log("완료");
}

main().catch((e) => { console.error("오류:", e.response?.data ?? e.message); process.exit(1); });
