import { Request, Response, NextFunction } from "express";
import { persistRecord, resolveOrgId } from "../platform";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  /** Maximum requests allowed within the window. Default: 100 */
  max?: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
  /** Key extractor — defaults to req.ip */
  keyFn?: (req: Request) => string;
}

/**
 * Lightweight in-memory rate limiter. Suitable for single-process deployments.
 * For multi-process/multi-node, replace the store with a Redis backend.
 */
export function rateLimit(opts: RateLimitOptions = {}) {
  const max = opts.max ?? 100;
  const windowMs = opts.windowMs ?? 60_000;
  const keyFn = opts.keyFn ?? ((req: Request) => req.ip ?? "unknown");

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn(req);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;
    persistRecord("rate_limits", {
      org_id: resolveOrgId(req) ?? "anonymous",
      bucket: req.path,
      subject: key,
      count: entry.count,
      limit_count: max,
      window_start: new Date(entry.resetAt - windowMs).toISOString(),
      window_end: new Date(entry.resetAt).toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.status(429).json({ error: "Too many requests. Please retry later." });
      return;
    }

    next();
  };
}
