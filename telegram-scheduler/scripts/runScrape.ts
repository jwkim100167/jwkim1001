import * as dotenv from "dotenv";
dotenv.config();
import { kboH2HScrapeJob } from "../src/scheduler/jobs/kboH2HScrapeJob";

kboH2HScrapeJob
  .execute()
  .then(() => { console.log("완료"); process.exit(0); })
  .catch((e: unknown) => { console.error("오류:", e); process.exit(1); });
