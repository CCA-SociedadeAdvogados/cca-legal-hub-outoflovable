// Lightweight in-memory rate limiter for edge functions.
//
// Usage:
//   import { rateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
//
//   const key = getRateLimitKey(req, user?.id);
//   const rl = rateLimit("ai:executive-summary", key, { windowMs: 60_000, max: 10 });
//   if (!rl.allowed) return rateLimitResponse(req, rl);
//
// Notes:
// - Storage is per-isolate (Map). Two warm isolates effectively double the
//   limit, but this is enough to defeat single-user abuse and runaway loops.
// - For stricter quotas (e.g. monthly LLM credit caps), use a DB-backed
//   counter via RPC instead.

import { corsHeaders } from "./cors.ts";

interface Bucket {
  count: number;
  resetAt: number;
}

interface BucketStore {
  buckets: Map<string, Bucket>;
}

const _stores = new Map<string, BucketStore>();

function getStore(scope: string): BucketStore {
  let store = _stores.get(scope);
  if (!store) {
    store = { buckets: new Map() };
    _stores.set(scope, store);
  }
  return store;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds
  resetAt: number; // epoch ms
}

export function rateLimit(scope: string, key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const store = getStore(scope);

  // Periodic cleanup so memory does not grow unbounded
  if (store.buckets.size > 5000) {
    for (const [k, v] of store.buckets.entries()) {
      if (v.resetAt < now) store.buckets.delete(k);
    }
  }

  const bucket = store.buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + opts.windowMs;
    store.buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.max - 1, retryAfter: 0, resetAt };
  }

  if (bucket.count >= opts.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt,
    };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: Math.max(0, opts.max - bucket.count),
    retryAfter: 0,
    resetAt: bucket.resetAt,
  };
}

/**
 * Builds a stable rate-limit key. Prefers authenticated user id, falls back
 * to client IP. Never returns an empty key.
 */
export function getRateLimitKey(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}

export function rateLimitResponse(req: Request, rl: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: `Demasiados pedidos. Tente novamente em ${rl.retryAfter} segundos.`,
      retryAfter: rl.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfter),
        "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
      },
    },
  );
}
