/**
 * In-memory token bucket. Each warm function instance keeps its own buckets, which is
 * enough to blunt bursts and runaway clients without an external store.
 */
export interface RateLimiter {
  take(key: string, now?: number): { allowed: boolean; retryAfterSeconds: number };
}

export function createRateLimiter(
  capacity: number,
  refillPerMinute: number,
  maxKeys = 5000,
): RateLimiter {
  const buckets = new Map<string, { tokens: number; updated: number }>();
  const refillPerMs = refillPerMinute / 60_000;

  return {
    take(key, now = Date.now()) {
      if (buckets.size > maxKeys) buckets.clear();
      const bucket = buckets.get(key) ?? { tokens: capacity, updated: now };
      bucket.tokens = Math.min(capacity, bucket.tokens + (now - bucket.updated) * refillPerMs);
      bucket.updated = now;
      const allowed = bucket.tokens >= 1;
      if (allowed) bucket.tokens -= 1;
      buckets.set(key, bucket);
      const retryAfterSeconds = allowed ? 0 : Math.ceil((1 - bucket.tokens) / refillPerMs / 1000);
      return { allowed, retryAfterSeconds };
    },
  };
}
