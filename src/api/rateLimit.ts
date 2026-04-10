// Per-user sliding window rate limiter.
// State resets on process restart — acceptable for this event.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Returns true if the request is within the allowed rate, false if exceeded.
export function checkRateLimit(
  userId: string,
  windowMs: number,
  max: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(userId) ?? { count: 0, windowStart: now };
  if (now - bucket.windowStart > windowMs) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count++;
  buckets.set(userId, bucket);
  return bucket.count <= max;
}
