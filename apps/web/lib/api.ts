// Shared API client for the HOARE.ai backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? "API error");
  }
  return res.json() as Promise<T>;
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
