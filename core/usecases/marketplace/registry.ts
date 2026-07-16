
import type { JsonRecord } from "../../types";
const items: JsonRecord[] = [];
export function listMarketplaceItems() { return { namespace: "usecases.marketplace.registry", count: items.length, items }; }
export function saveMarketplaceItem(item: JsonRecord) { items.push({ namespace: "usecases.marketplace.registry", ...item }); return items[items.length - 1]; }
export function getMarketplaceItem(id: string) { return items.find((item) => item.id === id) ?? null; }
