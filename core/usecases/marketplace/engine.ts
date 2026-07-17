import type { JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { enforceGovernance } from "../governance/engine";
import { getMarketplaceItem, listMarketplaceItems } from "./registry";
import { searchMarketplace } from "./search";
import { publishMarketplaceItem } from "./publish";
import { rateMarketplaceItem } from "./ratings";

function validateMarketplaceItem(input: JsonRecord) {
  return Boolean(input.name ?? input.id ?? input.itemId);
}

export function installMarketplaceItem(input: JsonRecord) {
  const governance = enforceGovernance({ ...input, action: "install" });
  if (!validateMarketplaceItem(input) || !governance.allowed) return { namespace: "usecases.marketplace.engine", status: "blocked", governance, reason: "unapproved-or-invalid-item" };
  publishEvent("marketplace.item.installed", input);
  return { namespace: "usecases.marketplace.engine", status: "installed", ...input };
}

export function publishItem(input: JsonRecord) {
  const governance = enforceGovernance({ ...input, action: "publish" });
  if (!validateMarketplaceItem(input) || !governance.allowed) return { namespace: "usecases.marketplace.engine", status: "blocked", governance, reason: "unapproved-or-invalid-item" };
  const item = publishMarketplaceItem(input);
  publishEvent("marketplace.item.published", { item });
  return item;
}

export function rateItem(input: JsonRecord) { const rating = rateMarketplaceItem(input); publishEvent("marketplace.item.rated", rating); return rating; }
export { getMarketplaceItem, listMarketplaceItems, searchMarketplace };
