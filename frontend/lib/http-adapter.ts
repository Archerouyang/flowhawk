/**
 * HttpDataSource — real backend API adapter.
 *
 * Proxies calls to the FastAPI backend via Next.js rewrites.
 * Includes a simple in-memory cache with 5-minute TTL.
 */

import type {
  ContractDashboardStats,
  ContractRankingResponse,
  DashboardSummary,
  DataSource,
  RankingDatesResponse,
  ScreenParams,
  ScreenResponse,
  SignalResponse,
  TrackerHistoryResponse,
  TrackerItem,
  TrackerListResponse,
} from "./data-source";

const API_BASE = "/api/v1";

/* ─── API Response Cache ─── */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const API_CACHE = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(path: string, body?: unknown): string {
  if (body) return `${path}:${JSON.stringify(body)}`;
  return path;
}

function getCached<T>(key: string): T | undefined {
  const hit = API_CACHE.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    API_CACHE.delete(key);
    return undefined;
  }
  return hit.data as T;
}

function setCached<T>(key: string, data: T): void {
  API_CACHE.set(key, { data, ts: Date.now() });
}

/** Invalidate cache entries. Pass a key prefix to invalidate matching entries, or omit to clear all. */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    API_CACHE.clear();
    return;
  }
  for (const key of API_CACHE.keys()) {
    if (key.startsWith(prefix)) API_CACHE.delete(key);
  }
}

async function cachedGet<T>(path: string): Promise<T> {
  const key = cacheKey(path);
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  const data = await get<T>(path);
  setCached(key, data);
  return data;
}

async function cachedPost<T>(path: string, body: unknown): Promise<T> {
  const key = cacheKey(path, body);
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  const data = await post<T>(path, body);
  setCached(key, data);
  return data;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export class HttpDataSource implements DataSource {
  async screen(params: ScreenParams): Promise<ScreenResponse> {
    return post<ScreenResponse>("/screen", params);
  }

  async getSignals(symbols?: string[]): Promise<SignalResponse> {
    return cachedPost<SignalResponse>("/signals", symbols ? { symbols } : {});
  }

  async getDashboard(): Promise<DashboardSummary> {
    return cachedGet<DashboardSummary>("/dashboard");
  }

  async getContractRanking(category: string = "dragon_tiger"): Promise<ContractRankingResponse> {
    return cachedPost<ContractRankingResponse>("/ranking", { category });
  }

  async getContractStats(): Promise<ContractDashboardStats> {
    return cachedGet<ContractDashboardStats>("/dashboard");
  }

  async getHistoricalRanking(
    snapshotDate: string,
    category: string = "dragon_tiger",
  ): Promise<ContractRankingResponse> {
    return cachedGet<ContractRankingResponse>(`/rankings/history/${snapshotDate}?category=${category}`);
  }

  async getRankingDates(): Promise<RankingDatesResponse> {
    return cachedGet<RankingDatesResponse>("/rankings/history");
  }

  async getTracker(status?: string): Promise<TrackerListResponse> {
    const query = status ? `?status=${status}` : "";
    return cachedGet<TrackerListResponse>(`/tracker${query}`);
  }

  async addTracker(params: {
    contract_code: string;
    underlying: string;
    option_type: string;
    strike: number;
    expiration: string;
    notes?: string;
  }): Promise<TrackerItem> {
    return post<TrackerItem>("/tracker", params);
  }

  async removeTracker(contract_code: string): Promise<{ removed: boolean; contract_code: string }> {
    const res = await fetch(`${API_BASE}/tracker/${contract_code}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ removed: boolean; contract_code: string }>;
  }

  async getTrackerHistory(contract_code: string, limit?: number): Promise<TrackerHistoryResponse> {
    const query = limit ? `?limit=${limit}` : "";
    return get<TrackerHistoryResponse>(`/tracker/${contract_code}/history${query}`);
  }

  async updateTracker(
    contract_code: string,
    updates: { notes?: string; status?: string },
  ): Promise<TrackerItem> {
    const res = await fetch(`${API_BASE}/tracker/${contract_code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<TrackerItem>;
  }
}
