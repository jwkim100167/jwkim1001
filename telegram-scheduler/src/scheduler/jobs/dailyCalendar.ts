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

function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);

  const yyyy = kstNow.getUTCFullYear();
  const mm = String(kstNow.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kstNow.getUTCDate()).padStart(2, "0");

  return {
    start: `${yyyy}-${mm}-${dd}`,
    end: `${yyyy}-${mm}-${dd}`,
  };
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const notion = new Client({ auth: config.notion.apiToken });
  const { start, end } = getTodayRange();

  const response = await notion.dataSources.query({
    data_source_id: config.notion.databaseId,
    filter: {
      property: config.notion.dateProperty,
      date: {
        equals: start,
      },
    },
    sorts: [
      {
        property: config.notion.dateProperty,
        direction: "ascending",
      },
    ],
  });

  return response.results.map((page: any) => {
    // 제목 추출
    const titleProp = Object.values(page.properties).find(
      (p: any) => p.type === "title"
    ) as any;
    const title =
      titleProp?.title?.map((t: any) => t.plain_text).join("") ?? "(제목 없음)";

    // 날짜 추출
    const dateProp = page.properties[config.notion.dateProperty] as any;
    const dateValue = dateProp?.date;
    const startDateTime: string | null = dateValue?.start ?? null;
    const isAllDay = startDateTime
      ? !startDateTime.includes("T")
      : true;

    let startTime: string | null = null;
    if (startDateTime && !isAllDay) {
      const d = new Date(startDateTime);
      startTime = d.toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return { title, startTime, isAllDay };
  });
}

function buildMessage(events: CalendarEvent[]): string {
  const dateLabel = getTodayLabel();
  const header = `📅 오늘의 일정 - ${dateLabel}`;

  if (events.length === 0) {
    return `${header}\n\n일정이 없습니다.`;
  }

  const lines = events.map((e) => {
    const time = e.isAllDay || !e.startTime ? "종일" : e.startTime;
    return `• ${time}  ${e.title}`;
  });

  return [header, "", ...lines].join("\n");
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

    const events = await fetchTodayEvents();
    const message = buildMessage(events);
    logger.info(`Daily calendar: ${events.length}개 일정`);
    await sendMessage(config.telegram.targetChatId, message);
  },
};
