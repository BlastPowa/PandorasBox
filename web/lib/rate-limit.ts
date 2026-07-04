import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight in-memory sliding-window rate limiter, keyed by client IP + bucket.
 * Free and dependency-free. Note: state is per serverless instance, so it's a
 * best-effort guard against scraping/abuse rather than a distributed limiter.
 * For strict global limits, swap the store for Upstash Redis (has a free tier).
 */
type Hit = { count: number; resetAt: number };
const store = new Map<string, Hit>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  req: NextRequest,
  bucket: string,
  limit = 30,
  windowMs = 60_000
): RateResult {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || hit.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  hit.count += 1;
  const ok = hit.count <= limit;

  // opportunistic cleanup so the map can't grow unbounded
  if (store.size > 5000) {
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  }

  return { ok, remaining: Math.max(0, limit - hit.count), resetAt: hit.resetAt };
}

export function tooManyRequests(result: RateResult): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}
