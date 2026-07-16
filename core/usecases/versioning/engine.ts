
import { createId, type JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { listVersions, saveVersion } from "./registry";
import { generateDiff } from "./diff";
export function createVersion(input: JsonRecord) { const version = saveVersion({ id: createId("ucver"), namespace: "usecases.versioning.engine", channel: "stable", ...input }); publishEvent("usecase.version.created", { version }); return version; }
export function rollbackVersion(input: JsonRecord) { publishEvent("usecase.version.rolledback", input); return { namespace: "usecases.versioning.engine", status: "rolledback", ...input }; }
export function getLatestVersion() { return listVersions().items.at(-1) ?? null; }
export { listVersions, generateDiff };
