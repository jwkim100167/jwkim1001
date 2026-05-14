import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  telegram: {
    botToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    targetChatId: requireEnv("TARGET_CHAT_ID"),
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY ?? "",
    city: process.env.WEATHER_CITY ?? "Seoul",
  },
  notion: {
    apiToken: process.env.NOTION_API_TOKEN ?? "",
    databaseId: process.env.NOTION_DATABASE_ID ?? "2a185354-810d-8047-a4c3-000bb4d65e31",
    dateProperty: process.env.NOTION_DATE_PROPERTY ?? "날짜",
  },
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "info",
    timezone: process.env.TZ ?? "Asia/Seoul",
  },
};
