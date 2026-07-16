
import type { JsonRecord } from "../../types";
const files = new Map<string, JsonRecord>();
export function writeFileRecord(key: string, value: JsonRecord) { files.set(key, value); return value; }
export function readFileRecord(key: string) { return files.get(key) ?? null; }
