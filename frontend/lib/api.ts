/**
 * FlowHawk API client.
 *
 * Thin factory that selects between MockDataSource (dev) and
 * HttpDataSource (production) based on NEXT_PUBLIC_USE_MOCK.
 *
 * All types and helpers are re-exported from data-source.ts for
 * backward compatibility with existing imports.
 */

import { HttpDataSource } from "./http-adapter";
import { MockDataSource } from "./mock-adapter";
import type { DataSource } from "./data-source";

export * from "./data-source";
export { MockDataSource } from "./mock-adapter";
export { HttpDataSource } from "./http-adapter";
export { invalidateCache } from "./http-adapter";
export { MOCK_CLASSIFIED_SIGNALS } from "./mock-data";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function createDataSource(useMock: boolean): DataSource {
  return useMock ? new MockDataSource() : new HttpDataSource();
}

const ds: DataSource = createDataSource(USE_MOCK);

/* ─── Public API ─── */

export async function screen(params: import("./data-source").ScreenParams) {
  return ds.screen(params);
}

export async function getSignals(symbols?: string[]) {
  return ds.getSignals(symbols);
}

export async function getDashboard() {
  return ds.getDashboard();
}

export async function getContractRanking(category: string = "dragon_tiger") {
  return ds.getContractRanking(category);
}

export async function getContractStats() {
  return ds.getContractStats();
}

export async function getHistoricalRanking(
  snapshotDate: string,
  category: string = "dragon_tiger",
) {
  return ds.getHistoricalRanking(snapshotDate, category);
}

export async function getRankingDates() {
  return ds.getRankingDates();
}

export async function getTracker(status?: string) {
  return ds.getTracker(status);
}

export async function addTracker(params: {
  contract_code: string;
  underlying: string;
  option_type: string;
  strike: number;
  expiration: string;
  notes?: string;
}) {
  return ds.addTracker(params);
}

export async function removeTracker(contract_code: string) {
  return ds.removeTracker(contract_code);
}

export async function getTrackerHistory(contract_code: string, limit?: number) {
  return ds.getTrackerHistory(contract_code, limit);
}

export async function updateTracker(
  contract_code: string,
  updates: { notes?: string; status?: string },
) {
  return ds.updateTracker(contract_code, updates);
}
