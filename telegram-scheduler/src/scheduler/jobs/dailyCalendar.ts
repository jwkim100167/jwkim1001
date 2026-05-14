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

function isFriday(): boolean {
  return new Date().toLocaleDateString("en-US", { timeZone: "Asia/Seoul", weekday: "long" }) === "Friday";
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
  cronExpression: "0 8 * * 1-5", // 주중 08:00
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    if (!config.notion.apiToken) {
      logger.warn("NOTION_API_TOKEN not set — skipping daily calendar job");
      return;
    }

    const notion = new Client({ auth: config.notion.apiToken });
    const friday = isFriday();

    const dates = friday
      ? [0, 1, 2].map((offset) => ({ offset, dateStr: getKstDateString(offset), label: getDateLabel(offset) }))
      : [{ offset: 0, dateStr: getKstDateString(0), label: getDateLabel(0) }];

    const sections = await Promise.all(
      dates.map(async ({ label, dateStr }) => {
        const events = await fetchEventsByDate(notion, dateStr);
        return buildDaySection(label, events);
      })
    );

    const totalCount = sections.length;
    logger.info(`Daily calendar: ${friday ? "금요일 모드 (3일치)" : "일반 모드"}, ${totalCount}개 섹션`);

    const message = sections.join("\n\n");
    await sendMessage(config.telegram.targetChatId, message);
  },
};
