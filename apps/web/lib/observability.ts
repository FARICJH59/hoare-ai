import { randomUUID } from "crypto";

export function getRequestId(headers: Headers) {
  return headers.get("x-vercel-id") ?? headers.get("x-request-id") ?? randomUUID();
}

export function logError(message: string, metadata: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", message, ...metadata }));
}

export function logInfo(message: string, metadata: Record<string, unknown>) {
  console.info(JSON.stringify({ level: "info", message, ...metadata }));
}
