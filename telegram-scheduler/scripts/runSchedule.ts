import * as dotenv from "dotenv";
dotenv.config();
import { kboScheduleJob } from "../src/scheduler/jobs/kboSchedule";

kboScheduleJob
  .execute()
  .then(() => { console.log("완료"); process.exit(0); })
  .catch((e: unknown) => { console.error("오류:", e); process.exit(1); });
