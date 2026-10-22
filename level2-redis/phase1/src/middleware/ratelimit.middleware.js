import { redis } from "../..";

const rateLimitter = async (req, res, next) => {
  const ip = req.ip;
  const key = `rate_limit:${ip}`;
  const request = await redis.incr(key);

  if (request == 1) {
    await redis.expire(key, 60);
  }

  if (request > 5) {
    return res.status(429).json({
      message: "Limit execded",
    });
  }
  next();
};
