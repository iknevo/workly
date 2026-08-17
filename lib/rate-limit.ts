import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "./redis";

type RateLimitResult = { success: boolean; remaining: number; limit: number; reset: number };

const noopLimit: RateLimitResult = {
  success: true,
  remaining: Infinity,
  limit: Infinity,
  reset: 0,
};

export const aiRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "60s") })
  : null;

export const generalRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "60s") })
  : null;

export async function checkRateLimit(
  key: string,
  limiter: Ratelimit | null = aiRateLimit
): Promise<RateLimitResult> {
  if (!limiter) return noopLimit;
  return limiter.limit(key);
}
