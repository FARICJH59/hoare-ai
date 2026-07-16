import { listMarketplaceItems } from "./registry";
export function searchMarketplace(query = "") { const lower = query.toLowerCase(); const items = listMarketplaceItems().items.filter((item) => JSON.stringify(item).toLowerCase().includes(lower)); return { namespace: "usecases.marketplace.search", count: items.length, items }; }
