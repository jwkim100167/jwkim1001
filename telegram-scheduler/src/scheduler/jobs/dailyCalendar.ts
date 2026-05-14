import { Client } from "@notionhq/client";
import { ScheduleJob } from "../types";
import { sendMessage } from "../../sender/messageSender";
import { config } from "../../config";
import { logger } from "../../logger";

interface CalendarEvent {
  title: string;
  startTime: string | null;
  isAllDay: boolean;
}

function getKstDateString(offsetDays = 0): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const d = new Date(Date.now() + kstOffset + offsetDays * 86400000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateLabel(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

// 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
function getKstDay(): number {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay();
}

// 오늘 요일에 따라 내일부터 몇 일치를 보여줄지 결정
function getOffsets(): number[] {
  const day = getKstDay();
  if (day === 4) return [1, 2, 3]; // 목 → 금+토+일
  if (day === 5) return [1, 2];    // 금 → 토+일
  return [1];                       // 그 외 → 내일 하루
}

async function fetchEventsByDate(notion: Client, dateStr: string): Promise<CalendarEvent[]> {
  const response = await notion.dataSources.query({
    data_source_id: config.notion.databaseId,
    filter: {
      property: config.notion.dateProperty,
      date: { equals: dateStr },
    },
    sorts: [{ property: config.notion.dateProperty, direction: "ascending" }],
  });

  return response.results.map((page: any) => {
    const titleProp = Object.values(page.properties).find((p: any) => p.type === "title") as any;
    const title = titleProp?.title?.map((t: any) => t.plain_text).join("") ?? "(제목 없음)";

    const dateProp = page.properties[config.notion.dateProperty] as any;
    const startDateTime: string | null = dateProp?.date?.start ?? null;
    const isAllDay = startDateTime ? !startDateTime.includes("T") : true;

    let startTime: string | null = null;
    if (startDateTime && !isAllDay) {
      startTime = new Date(startDateTime).toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return { title, startTime, isAllDay };
  });
}

function buildDaySection(label: string, events: CalendarEvent[]): string {
  const lines = events.length === 0
    ? ["  일정이 없습니다."]
    : events.map((e) => `  • ${e.isAllDay || !e.startTime ? "종일" : e.startTime}  ${e.title}`);
  return [`📅 ${label}`, ...lines].join("\n");
}

export const dailyCalendarJob: ScheduleJob = {
  name: "daily-calendar",
  cronExpression: "31 22 * * 0,1,2,3,4,5", // 토요일 제외 매일 22:31
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    if (!config.notion.apiToken) {
      logger.warn("NOTION_API_TOKEN not set — skipping daily calendar job");
      return;
    }

    const notion = new Client({ auth: config.notion.apiToken });
    const offsets = getOffsets();
    const dates = offsets.map((offset) => ({
      dateStr: getKstDateString(offset),
      label: getDateLabel(offset),
    }));

    const sections = await Promise.all(
      dates.map(async ({ label, dateStr }) => {
        const events = await fetchEventsByDate(notion, dateStr);
        return buildDaySection(label, events);
      })
    );

    logger.info(`Daily calendar: ${dates.length}일치 발송`);

    const message = sections.join("\n\n");
    await sendMessage(config.telegram.targetChatId, message);
  },
};
