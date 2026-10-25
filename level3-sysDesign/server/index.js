import dotenv from "dotenv";
import express, { json } from "express";
import connectedDB from "./src/lib/db.js";
import userModel from "./src/model/user.model.js";
import Redis from "ioredis";
import { rateLimitter } from "./src/middleware/ratelimit.middleware.js";
import sendEmail from "./src/lib/sendEmail.js";
import emailQueue from "./queue.js";
dotenv.config();

const app = express();
export const redis = new Redis(process.env.REDIS_URL);

app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  return res.status(200).json({ message: `hello from server ${port}` });
});

//Without - queue

app.post("/create", async (req, res) => {
  const { name, email, password } = req.body;

  await redis.del("user:all");

  const user = await userModel.create({
    name,
    email,
    password,
  });

  await emailQueue.add("send-email", { email });

  // await sendEmail(); //without queue
  return res.json(user);
});

app.get("/get", rateLimitter, async (req, res) => {
  const user = await userModel.find({});
  return res.json(user);
});

app.get("/get-with-redis", async (req, res) => {
  const cached = await redis.get("user:all");

  if (cached) {
    const user = JSON.parse(cached);
    return res.json(user);
  }

  const user = await userModel.find({});
  await redis.set("user:all", JSON.stringify(user));
  return res.json(user);
});

// OTP session

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await redis.set(`otp:${email}`, otp, "EX", 300);

  return res.json({ otp });
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const cachedOtp = await redis.get(`otp:${email}`);

  if (!cachedOtp) {
    return res.status(400).json({
      message: "otp not found or expeire",
    });
  }

  if (cachedOtp !== otp) {
    return res.status(400).json({
      message: "incorrect otp",
    });
  }

  await redis.del(`otp:${email}`);

  return res.json({ message: "OTP verified" });
});

app.listen(port, () => {
  connectedDB();
  console.log(`Server is running on port - ${port}`);
});
