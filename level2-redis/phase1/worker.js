import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import sendEmail from "./src/lib/sendEmail.js";

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "emailQueue",
  async (job) => {
    console.log("job Started");
    const email = job.data.email;
    await sendEmail(email);
    console.log("job completed");
  },
  { connection },
);

export default worker;
