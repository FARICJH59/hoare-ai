import { createId, type JsonRecord } from "../../types";
import { enterpriseHardening } from "../../config/hardening/enterprise";
import { publishEvent } from "../../events/bus";
import { enforceGovernance } from "../governance/engine";
import { listVersions, saveVersion } from "./registry";
import { generateDiff } from "./diff";

export function createVersion(input: JsonRecord) {
  const channel = String(input.channel ?? "dev");
  const governance = enforceGovernance({ ...input, action: "version", channel });
  if (!enterpriseHardening.channels.includes(channel as typeof enterpriseHardening.channels[number]) || !governance.allowed) return { namespace: "usecases.versioning.engine", status: "blocked", governance };
  const version = saveVersion({ id: createId("ucver"), namespace: "usecases.versioning.engine", channel, ...input });
  publishEvent("usecase.version.created", { version });
  return version;
}

export function rollbackVersion(input: JsonRecord) { const governance = enforceGovernance({ ...input, action: "rollback" }); if (!governance.allowed) return { namespace: "usecases.versioning.engine", status: "blocked", governance }; publishEvent("usecase.version.rolledback", input); return { namespace: "usecases.versioning.engine", status: "rolledback", ...input }; }
export function getLatestVersion() { return listVersions().items.at(-1) ?? null; }
export { listVersions, generateDiff };
