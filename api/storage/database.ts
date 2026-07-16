export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export interface PersistenceStatus {
  configured: boolean;
  mode: "supabase-rest" | "memory";
  reachable: boolean;
  message: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export function isPersistenceConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase persistence is not configured.");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  headers.set("Accept", headers.get("Accept") ?? "application/json");

  const res = await fetch(`${config.url}/rest/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase request failed (${res.status}): ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (!isPersistenceConfigured()) {
    return {
      configured: false,
      mode: "memory",
      reachable: false,
      message: "SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured; using in-memory fallback.",
    };
  }

  try {
    await supabaseRequest<Array<{ version: number }>>("/schema_versions?select=version&limit=1");
    return {
      configured: true,
      mode: "supabase-rest",
      reachable: true,
      message: "Supabase persistence is configured and reachable.",
    };
  } catch (err) {
    return {
      configured: true,
      mode: "supabase-rest",
      reachable: false,
      message: err instanceof Error ? err.message : "Supabase persistence check failed.",
    };
  }
}
