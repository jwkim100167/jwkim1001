import { createClient } from "@supabase/supabase-js";
import { ScheduleJob } from "../types";
import { sendMessage } from "../../sender/messageSender";
import { config } from "../../config";
import { logger } from "../../logger";

interface SectorStat {
  sector_id: string;
  mention_count: number;
  rank: number;
  sectors: { sector_name: string } | { sector_name: string }[] | null;
}

function getThisWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=일, 1=월
  const diff = day === 0 ? -6 : 1 - day; // ISO 주 시작: 월요일
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function buildMessage(stats: SectorStat[], weekStart: string): string {
  const lines: string[] = [
    `<b>이번 주 가장 뜨거운 섹터 TOP 3</b>`,
    `(${weekStart} 기준)`,
    ``,
  ];

  const medals = ["1", "2", "3"];
  stats.forEach((stat, i) => {
    const s = stat.sectors;
    const name = (Array.isArray(s) ? s[0]?.sector_name : s?.sector_name) ?? stat.sector_id;
    lines.push(`${medals[i]}위  <b>${name}</b>  ${stat.mention_count}건`);
  });

  if (stats.length === 0) {
    lines.push("이번 주 집계 데이터가 아직 없습니다.");
  }

  return lines.join("\n");
}

export const weeklyHeatReportJob: ScheduleJob = {
  name: "weekly-heat-report",
  cronExpression: "55 21 * * 6", // 매주 토요일 21:55 KST
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );

    const weekStart = getThisWeekStart();

    const { data, error } = await supabase
      .from("weekly_sector_stats")
      .select("sector_id, mention_count, rank, sectors(sector_name)")
      .eq("week_start", weekStart)
      .order("rank", { ascending: true })
      .limit(3);

    if (error) {
      logger.error("weekly_sector_stats 조회 실패", error);
      throw error;
    }

    const message = buildMessage((data as SectorStat[]) ?? [], weekStart);
    await sendMessage(config.telegram.targetChatId, message, {
      parseMode: "HTML",
    });
  },
};
