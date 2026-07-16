import type { JsonRecord } from "../../types";
import { createId } from "../../types";
import { saveMarketplaceItem } from "./registry";
export function publishMarketplaceItem(input: JsonRecord) { return saveMarketplaceItem({ id: createId("market"), status: "published", ...input }); }
