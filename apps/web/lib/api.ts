// Shared API client for the HOARE.ai backend
import { getRequiredUrlEnv } from "./env";

const API_TIMEOUT_MS = 8_000;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${getRequiredUrlEnv("NEXT_PUBLIC_API_URL")}${path}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        ...options?.headers,
      },
      ...options,
      signal: options?.signal ?? controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? `API request failed with ${res.status}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  health: () => apiFetch<unknown>("/health"),
  listTools: () => apiFetch<unknown>("/api/tools"),
  chat: (message: string, sessionId?: string) =>
    apiFetch<unknown>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),
  listCapabilities: () => apiFetch<unknown>("/api/capabilities"),
};
