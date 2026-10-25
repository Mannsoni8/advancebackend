import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
const emailQueue = new Queue("email", { connection });

export default emailQueue
