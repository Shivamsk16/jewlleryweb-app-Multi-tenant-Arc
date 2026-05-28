import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = { success: boolean; reset?: number };

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function getRedis(): Redis | null {
  if (!redisUrl || !redisToken) return null;
  return new Redis({ url: redisUrl, token: redisToken });
}

function createLimiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: "jewelflow",
  });
}

const limiters = {
  loginIp: () => createLimiter(10, "15 m"),
  loginEmail: () => createLimiter(5, "15 m"),
  setupPassword: () => createLimiter(5, "15 m"),
  verifyToken: () => createLimiter(30, "15 m"),
  resendInvite: () => createLimiter(3, "1 h"),
  forgotPassword: () => createLimiter(5, "15 m"),
  resetPassword: () => createLimiter(5, "15 m"),
};

async function check(limiter: Ratelimit | null, key: string): Promise<LimitResult> {
  if (!limiter) return { success: true };
  const result = await limiter.limit(key);
  return { success: result.success, reset: result.reset };
}

export type RateLimitKind = keyof typeof limiters;

export async function rateLimit(
  kind: RateLimitKind,
  identifier: string,
): Promise<LimitResult> {
  const factory = limiters[kind];
  const limiter = factory();
  return check(limiter, `${kind}:${identifier}`);
}

export function isRateLimitConfigured(): boolean {
  return Boolean(redisUrl && redisToken);
}
