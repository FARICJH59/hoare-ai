
import type { JsonRecord } from "../../types";
import { getPack } from "./registry";
export function applyPack(packName?: string, packConfig: JsonRecord = {}) { return { namespace: "usecases.packs.engine", pack: getPack(packName), packConfig }; }
export function installPack(packName?: string) { return { namespace: "usecases.packs.engine", status: "completed", pack: getPack(packName) }; }
