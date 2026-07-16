
import type { JsonRecord } from "../../types";
export function toJsonRecord(value: unknown): JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : { value: String(value) }; }
