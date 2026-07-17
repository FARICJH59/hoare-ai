import { performanceHardening } from "../config/hardening/performance";

const cache = new Map<string, { expiresAt: number; value: unknown }>();

export function getCached<T>(key: string, producer: () => T, ttlMs = performanceHardening.cacheTtlMs): T {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value as T;
  const value = producer();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
