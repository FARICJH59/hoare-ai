
import type { JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { getMarketplaceItem, listMarketplaceItems } from "./registry";
import { searchMarketplace } from "./search";
import { publishMarketplaceItem } from "./publish";
import { rateMarketplaceItem } from "./ratings";
export function installMarketplaceItem(input: JsonRecord) { publishEvent("marketplace.item.installed", input); return { namespace: "usecases.marketplace.engine", status: "installed", ...input }; }
export function publishItem(input: JsonRecord) { const item = publishMarketplaceItem(input); publishEvent("marketplace.item.published", { item }); return item; }
export function rateItem(input: JsonRecord) { const rating = rateMarketplaceItem(input); publishEvent("marketplace.item.rated", rating); return rating; }
export { getMarketplaceItem, listMarketplaceItems, searchMarketplace };
