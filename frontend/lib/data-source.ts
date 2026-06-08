/**
 * DataSource interface — abstracts all backend API calls.
 *
 * Both MockDataSource and HttpDataSource implement this interface,
 * allowing the factory to swap implementations based on environment.
 */

export interface ScreenParams {
  symbols: string[];
  min_voi_ratio?: number;
  min_premium?: number;
  min_dte?: number;
  max_dte?: number;
  min_delta?: number;
  max_delta?: number;
}

export interface ScreenCandidate {
  symbol: string;
  option_type: string;
  strike: number;
  expiration: string;
  last_price: number;
  volume: number;
  open_interest: number;
  voi_ratio: number;
  delta: number;
  implied_volatility: number;
  anomaly_score: number;
}

export interface ScreenResponse {
  count: number;
  candidates: ScreenCandidate[];
}

export type SignalType =
  | "smart_money"
  | "sweep"
  | "block"
  | "dark_pool"
  | "first_timer"
  | "index_hedge"
  | "gamma_squeeze"
  | "sector_rotation";

export interface ClassifiedSignal {
  symbol: string;
  option_type: string;
  strike: number;
  expiration: string;
  last_price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  implied_volatility: number;
  voi_ratio: number;
  leaps_score: number;
  theta_price_ratio: number;
  dte: number;
  signal_type: SignalType;
  composite_score: number;
  tier: "🔴 conviction" | "🟠 strong" | "🟡 monitor" | "⚪ noise";
  narrative: string;
  tags: string[];
  asset_type: "STOCK" | "ETF";
  cap_type: "LARGE" | "GROWTH";
  sector: string;
  timestamp?: string;
  iv_history?: number[];
  iv_percentile?: number;
}

export interface SignalResponse {
  count: number;
  signals: ClassifiedSignal[];
}

export interface DashboardSummary {
  total_signals: number;
  by_tier: Record<string, number>;
  by_type: Record<string, number>;
  top_signals: ClassifiedSignal[];
  last_updated: string;
}

export interface ContractPrice {
  last: number;
  high: number;
  low: number;
  change_pct: number;
  bid: number;
  ask: number;
}

export interface ContractVolume {
  total: number;
  vs_avg: number;
  premium: number;
}

export interface ContractOI {
  total: number;
  change: number;
}

export interface ContractIV {
  current: number;
  change_pct: number;
}

export interface ContractGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface ContractEntry {
  rank: number;
  underlying: string;
  is_etf: boolean;
  contract_code: string;
  strike: number;
  expiration: string;
  option_type: string;
  price: ContractPrice;
  volume: ContractVolume;
  oi: ContractOI;
  iv: ContractIV;
  greeks: ContractGreeks;
  leap_cp_ratio: number;
  narrative: string;
}

export interface ContractRankingResponse {
  date: string;
  category: string;
  total: number;
  rankings: ContractEntry[];
}

export interface ContractDashboardStats {
  date: string;
  total_contracts: number;
  total_volume: number;
  total_premium: number;
  call_put_ratio: number;
  dragon_tiger: ContractEntry[];
  individual: ContractEntry[];
  etf: ContractEntry[];
  premium: ContractEntry[];
}

export interface TrackerItem {
  contract_code: string;
  underlying: string;
  option_type: string;
  strike: number;
  expiration: string;
  added_at: string;
  notes: string;
  status: string;
  alert_threshold: number | null;
}

export interface TrackedContractWithSnapshot extends TrackerItem {
  last_price: number | null;
  volume: number | null;
  open_interest: number | null;
  oi_change: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  premium: number | null;
  volume_vs_avg: number | null;
  prev_oi: number | null;
  prev_volume: number | null;
  prev_price: number | null;
  oi_delta: number | null;
  volume_delta: number | null;
  price_delta: number | null;
  oi_delta_pct: number | null;
  oi_30d_high: number | null;
}

export interface TrackerListResponse {
  count: number;
  contracts: TrackedContractWithSnapshot[];
}

export interface TrackerSnapshot {
  snapshot_date: string;
  last_price: number;
  volume: number;
  open_interest: number | null;
  oi_change: number | null;
  iv: number | null;
  iv_change_pct: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  premium: number | null;
  volume_vs_avg: number | null;
}

export interface TrackerHistoryResponse {
  contract_code: string;
  count: number;
  history: TrackerSnapshot[];
}

export interface RankingDatesResponse {
  dates: string[];
}

/**
 * Abstract data source interface.
 * All methods return Promises matching the backend API contract.
 */
export interface DataSource {
  screen(params: ScreenParams): Promise<ScreenResponse>;
  getSignals(symbols?: string[]): Promise<SignalResponse>;
  getDashboard(): Promise<DashboardSummary>;
  getContractRanking(category?: string): Promise<ContractRankingResponse>;
  getContractStats(): Promise<ContractDashboardStats>;
  getHistoricalRanking(snapshotDate: string, category?: string): Promise<ContractRankingResponse>;
  getRankingDates(): Promise<RankingDatesResponse>;
  getTracker(status?: string): Promise<TrackerListResponse>;
  addTracker(params: {
    contract_code: string;
    underlying: string;
    option_type: string;
    strike: number;
    expiration: string;
    notes?: string;
  }): Promise<TrackerItem>;
  removeTracker(contract_code: string): Promise<{ removed: boolean; contract_code: string }>;
  getTrackerHistory(contract_code: string, limit?: number): Promise<TrackerHistoryResponse>;
  updateTracker(
    contract_code: string,
    updates: { notes?: string; status?: string }
  ): Promise<TrackerItem>;
}
