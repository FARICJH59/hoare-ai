import type { Tool } from "./index";
import { enforceEntitlement, recordUsageEvent } from "../api/billing/entitlements";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  trust: "trusted" | "unverified" | "rejected";
  source: string;
}

interface SearchResultItem {
  title?: string;
  url?: string;
  link?: string;
  snippet?: string;
  description?: string;
  source?: string;
}

interface ExternalSearchResponse {
  results?: SearchResultItem[];
}

function sourceForUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

function normalizeResult(item: SearchResultItem): WebSearchResult | null {
  const url = item.url ?? item.link;
  if (!item.title || !url) return null;
  const trustedHosts = (process.env.WEB_SEARCH_TRUSTED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  const trust = trustedHosts.length === 0 || trustedHosts.some((host) => url.includes(host))
    ? "trusted"
    : "unverified";
  return {
    title: item.title,
    url,
    snippet: item.snippet ?? item.description ?? "",
    trust,
    source: item.source ?? sourceForUrl(url),
  };
}

export const webSearchTool: Tool = {
  name: "web-search",
  description: "Fetch normalized external search results for grid status, demand response, and carbon intensity context.",
  async execute(params) {
    const query = String(params.query ?? "").trim();
    if (!query) {
      return { query, results: [], trust: "rejected", error: "query is required" };
    }

    const orgId = typeof params.orgId === "string" ? params.orgId : "default-org";
    const userId = typeof params.userId === "string" ? params.userId : undefined;
    const entitlement = await enforceEntitlement(orgId, "WEB_SEARCH");
    if (!entitlement.allowed) {
      return { query, results: [], trust: "rejected", governanceDecision: entitlement.governanceDecision, error: "Action blocked: plan limit reached for WEB_SEARCH." };
    }

    const endpoint = process.env.WEB_SEARCH_ENDPOINT;
    if (!endpoint) {
      await recordUsageEvent({ orgId, userId, eventType: "WEB_SEARCH", eventContext: { query, resultCount: 1, stub: true } });
      return {
        query,
        trust: "unverified",
        results: [
          {
            title: "External search not configured",
            url: "about:blank",
            snippet: `No WEB_SEARCH_ENDPOINT configured. Query retained for audit: ${query}`,
            trust: "unverified",
            source: "stub",
          },
        ],
      };
    }

    const url = new URL(endpoint);
    url.searchParams.set("q", query);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.WEB_SEARCH_API_KEY) {
      headers.Authorization = `Bearer ${process.env.WEB_SEARCH_API_KEY}`;
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      return { query, trust: "rejected", results: [], error: `search provider returned ${res.status}` };
    }
    const payload = (await res.json()) as ExternalSearchResponse;
    const results = (payload.results ?? []).map(normalizeResult).filter(Boolean) as WebSearchResult[];
    await recordUsageEvent({ orgId, userId, eventType: "WEB_SEARCH", eventContext: { query, resultCount: results.length } });
    return { query, trust: results.length > 0 && results.every((item) => item.trust === "trusted") ? "trusted" : "unverified", results };
  },
};

export const webSearchTools: Tool[] = [webSearchTool];
