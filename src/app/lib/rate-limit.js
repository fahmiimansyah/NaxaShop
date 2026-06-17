import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const globalForRateLimit = globalThis;

if (!globalForRateLimit.__naxashopLimiters) {
  globalForRateLimit.__naxashopLimiters = new Map();
}

if (!globalForRateLimit.__naxashopMemoryStore) {
  globalForRateLimit.__naxashopMemoryStore = new Map();
}

const limiters = globalForRateLimit.__naxashopLimiters;
const memoryStore = globalForRateLimit.__naxashopMemoryStore;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

function getIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return "unknown-ip";
}

function memoryRateLimit(request, options = {}) {
  const { key = "global", limit = 10, windowMs = 60_000 } = options;

  const ip = getIp(request);
  const now = Date.now();
  const rateKey = `${key}:${ip}`;

  const current = memoryStore.get(rateKey);

  if (!current || current.resetAt <= now) {
    memoryStore.set(rateKey, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      retryAfter: 0,
      source: "memory",
    };
  }

  if (current.count >= limit) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      source: "memory",
    };
  }

  current.count += 1;
  memoryStore.set(rateKey, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    retryAfter: 0,
    source: "memory",
  };
}

function getLimiter({ key, limit, windowMs }) {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const limiterKey = `${key}:${limit}:${windowSeconds}`;

  if (limiters.has(limiterKey)) {
    return limiters.get(limiterKey);
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
    prefix: `naxashop:${key}`,
  });

  limiters.set(limiterKey, limiter);

  return limiter;
}

export async function rateLimit(request, options = {}) {
  const { key = "global", limit = 10, windowMs = 60_000 } = options;

  if (!redis) {
    return memoryRateLimit(request, { key, limit, windowMs });
  }

  const ip = getIp(request);
  const limiter = getLimiter({ key, limit, windowMs });
  const result = await limiter.limit(ip);

  return {
    allowed: result.success,
    remaining: result.remaining,
    retryAfter: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
    source: "upstash",
  };
}