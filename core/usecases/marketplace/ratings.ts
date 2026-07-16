import type { JsonRecord } from "../../types";
export function rateMarketplaceItem(input: JsonRecord) { return { namespace: "usecases.marketplace.ratings", status: "completed", ...input }; }
