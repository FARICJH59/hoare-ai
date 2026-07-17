import { HardeningError } from "./errors";

type Circuit = { failures: number; openedAt: number };
const circuits = new Map<string, Circuit>();
const active = new Map<string, number>();

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, code = "timeout"): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new HardeningError(code, `Operation exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  try { return await Promise.race([operation, timeoutPromise]); }
  finally { clearTimeout(timeout!); }
}

export async function withRetry<T>(operation: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      last = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw last;
}

export async function withConcurrency<T>(key: string, max: number, operation: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 1_000;
  while ((active.get(key) ?? 0) >= max && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const count = active.get(key) ?? 0;
  if (count >= max) throw new HardeningError("concurrency.limit", `Concurrency limit reached for ${key}`, { key, max });
  active.set(key, count + 1);
  try { return await operation(); }
  finally { active.set(key, Math.max(0, (active.get(key) ?? 1) - 1)); }
}

export async function withCircuitBreaker<T>(key: string, maxFailures: number, resetMs: number, operation: () => Promise<T>, fallback: () => T): Promise<T> {
  const circuit = circuits.get(key);
  if (circuit && circuit.failures >= maxFailures && Date.now() - circuit.openedAt < resetMs) return fallback();
  try {
    const result = await operation();
    circuits.delete(key);
    return result;
  } catch (error) {
    const next = { failures: (circuit?.failures ?? 0) + 1, openedAt: Date.now() };
    circuits.set(key, next);
    if (next.failures >= maxFailures) return fallback();
    throw error;
  }
}
