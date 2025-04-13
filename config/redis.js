const Redis = require("ioredis");
const logs = require("../utility/logs");
require("dotenv").config();

let redis;
try {
  redis = new Redis(process.env.REDIS_URI);
  logs.info("Redis connected successfully");
} catch (err) {
  logs.error("Redis connection error:", err);
}

module.exports = { redis };
