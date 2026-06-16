import { execFile } from "child_process";
import { ScheduleJob } from "../types";
import { logger } from "../../logger";

const PYTHON = "D:\\miniconda\\python.exe";
const CWD = "C:\\Users\\김시민\\Desktop\\telegram-scheduler";

function runPython(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(PYTHON, args, { cwd: CWD }, (error, stdout, stderr) => {
      if (stdout) logger.info(stdout.trim());
      if (stderr) logger.warn(stderr.trim());
      if (error) reject(error);
      else resolve();
    });
  });
}

export const burnCollectJob: ScheduleJob = {
  name: "burn-collect",
  cronExpression: "0 21 * * 6", // 매주 토요일 21:00 KST
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    await runPython(["-m", "collector.main", "seed-krx"]);
    await runPython(["-m", "collector.main", "collect"]);
  },
};

export const burnCollectBoardJob: ScheduleJob = {
  name: "burn-collect-board",
  cronExpression: "0 7 * * *", // 매일 07:00 KST
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    await runPython(["-m", "collector.main", "collect-board", "1"]);
  },
};

export const burnAggregateJob: ScheduleJob = {
  name: "burn-aggregate",
  cronExpression: "30 21 * * 6", // 매주 토요일 21:30 KST
  timezone: "Asia/Seoul",
  enabled: true,
  execute: async () => {
    await runPython(["-m", "collector.main", "aggregate"]);
  },
};
