/**
 * FlowHawk API client.
 *
 * In dev mode (NEXT_PUBLIC_USE_MOCK=true or no backend running),
 * data comes from local mock functions.
 *
 * Otherwise, calls are proxied to the FastAPI backend via Next.js rewrites.
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const API_BASE = "/api/v1";

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
  // classification
  signal_type: SignalType;
  composite_score: number;
  tier: "🔴 conviction" | "🟠 strong" | "🟡 monitor" | "⚪ noise";
  narrative: string;
  tags: string[];
  // meta
  asset_type: "STOCK" | "ETF";
  cap_type: "LARGE" | "GROWTH";
  sector: string;
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

/* ─── Mock data (used when backend is not running) ─── */

function mockScreen(_params: ScreenParams): ScreenResponse {
  return {
    count: 5,
    candidates: [
      {
        symbol: "AAPL", option_type: "C", strike: 185,
        expiration: "2026-12-18", last_price: 12.5,
        volume: 3420, open_interest: 12500,
        voi_ratio: 4.2, delta: 0.72,
        implied_volatility: 0.32, anomaly_score: 0.85,
      },
      {
        symbol: "TSLA", option_type: "C", strike: 220,
        expiration: "2026-09-19", last_price: 18.3,
        volume: 5600, open_interest: 8900,
        voi_ratio: 5.1, delta: 0.68,
        implied_volatility: 0.45, anomaly_score: 0.92,
      },
      {
        symbol: "NVDA", option_type: "C", strike: 130,
        expiration: "2027-01-15", last_price: 22.0,
        volume: 8900, open_interest: 15600,
        voi_ratio: 3.8, delta: 0.75,
        implied_volatility: 0.38, anomaly_score: 0.78,
      },
      {
        symbol: "MSFT", option_type: "C", strike: 420,
        expiration: "2026-11-20", last_price: 28.5,
        volume: 2100, open_interest: 7800,
        voi_ratio: 3.5, delta: 0.70,
        implied_volatility: 0.25, anomaly_score: 0.71,
      },
      {
        symbol: "AMZN", option_type: "C", strike: 195,
        expiration: "2026-10-17", last_price: 15.2,
        volume: 4500, open_interest: 11200,
        voi_ratio: 6.2, delta: 0.65,
        implied_volatility: 0.35, anomaly_score: 0.88,
      },
    ],
  };
}

const MOCK_CLASSIFIED_SIGNALS: ClassifiedSignal[] = [
  {
    symbol: "BSX",
    option_type: "C",
    strike: 67.5,
    expiration: "2026-12-18",
    last_price: 3.2,
    delta: 0.72,
    gamma: 0.012,
    theta: -0.035,
    vega: 0.18,
    implied_volatility: 0.32,
    voi_ratio: 4.33,
    leaps_score: 0.87,
    theta_price_ratio: 0.0028,
    dte: 203,
    signal_type: "smart_money",
    composite_score: 87,
    tier: "🔴 conviction",
    narrative:
      "BSX 跌 2.68%，但 12 月 67.5 call 异常堆积——聪明钱在建远月仓。C/P 4.33，LEAP 比 4.53。",
    tags: ["LEAPS call rate > 10x", "Down day + call build"],
    asset_type: "STOCK",
    cap_type: "LARGE",
    sector: "Healthcare",
  },
  {
    symbol: "SPCE",
    option_type: "C",
    strike: 7,
    expiration: "2026-07-17",
    last_price: 1.85,
    delta: 0.65,
    gamma: 0.015,
    theta: -0.042,
    vega: 0.22,
    implied_volatility: 0.45,
    voi_ratio: 9.94,
    leaps_score: 0.92,
    theta_price_ratio: 0.0023,
    dte: 46,
    signal_type: "first_timer",
    composite_score: 94,
    tier: "🔴 conviction",
    narrative:
      "SPCE 首次上榜，LEAPS call 27x——小盘航空概念，容易被忽视。不到 2 个月后股价涨 201%。",
    tags: ["First appearance", "LEAPS call rate > 20x", "Small cap"],
    asset_type: "STOCK",
    cap_type: "GROWTH",
    sector: "Industrials",
  },
  {
    symbol: "SMH",
    option_type: "P",
    strike: 550,
    expiration: "2026-06-05",
    last_price: 8.5,
    delta: -0.38,
    gamma: 0.008,
    theta: -0.055,
    vega: 0.25,
    implied_volatility: 0.28,
    voi_ratio: 0.14,
    leaps_score: 0.75,
    theta_price_ratio: 0.0065,
    dte: 4,
    signal_type: "index_hedge",
    composite_score: 73,
    tier: "🟠 strong",
    narrative:
      "SMH 涨 0.73%，但 put 墙高耸——C/P 0.14，机构在锁尾部风险。个股做多 + 指数对冲结构。",
    tags: ["Put wall detected", "Index up + puts堆积"],
    asset_type: "ETF",
    cap_type: "LARGE",
    sector: "Technology",
  },
  {
    symbol: "ONDS",
    option_type: "C",
    strike: 13,
    expiration: "2026-05-29",
    last_price: 2.5,
    delta: 0.78,
    gamma: 0.018,
    theta: -0.065,
    vega: 0.12,
    implied_volatility: 0.55,
    voi_ratio: 4.41,
    leaps_score: 0.81,
    theta_price_ratio: 0.026,
    dte: 1,
    signal_type: "gamma_squeeze",
    composite_score: 68,
    tier: "🟠 strong",
    narrative:
      "ONDS 单日 +22.69%，C/P 4.41，LEAP 7.44——远月也堆 call，赌的不是今天。政策预期驱动。",
    tags: ["+15% day move", "LEAP > 5x"],
    asset_type: "STOCK",
    cap_type: "GROWTH",
    sector: "Industrials",
  },
  {
    symbol: "AAPL",
    option_type: "C",
    strike: 185,
    expiration: "2026-12-18",
    last_price: 12.5,
    delta: 0.72,
    gamma: 0.012,
    theta: -0.035,
    vega: 0.18,
    implied_volatility: 0.32,
    voi_ratio: 4.2,
    leaps_score: 0.85,
    theta_price_ratio: 0.0028,
    dte: 202,
    signal_type: "smart_money",
    composite_score: 85,
    tier: "🔴 conviction",
    narrative:
      "AAPL 跌 1.2%，但 12 月 185 call 异常活跃——机构用 call 替代持股，建仓成本可控。",
    tags: ["LEAPS call rate > 5x", "Down day + call build"],
    asset_type: "STOCK",
    cap_type: "LARGE",
    sector: "Technology",
  },
  {
    symbol: "TSLA",
    option_type: "C",
    strike: 220,
    expiration: "2026-09-19",
    last_price: 18.3,
    delta: 0.68,
    gamma: 0.015,
    theta: -0.042,
    vega: 0.22,
    implied_volatility: 0.45,
    voi_ratio: 5.1,
    leaps_score: 0.92,
    theta_price_ratio: 0.0023,
    dte: 112,
    signal_type: "smart_money",
    composite_score: 82,
    tier: "🔴 conviction",
    narrative:
      "TSLA 平盘，但 9 月 220 call 大量建仓——聪明钱在建远月仓，DTE 112，方向性押注。",
    tags: ["LEAPS call rate > 5x"],
    asset_type: "STOCK",
    cap_type: "LARGE",
    sector: "Consumer Discretionary",
  },
];

function mockSignals(): SignalResponse {
  return {
    count: MOCK_CLASSIFIED_SIGNALS.length,
    signals: MOCK_CLASSIFIED_SIGNALS,
  };
}

function mockDashboard(): DashboardSummary {
  const signals = MOCK_CLASSIFIED_SIGNALS;
  const by_tier: Record<string, number> = {};
  const by_type: Record<string, number> = {};

  for (const s of signals) {
    by_tier[s.tier] = (by_tier[s.tier] || 0) + 1;
    by_type[s.signal_type] = (by_type[s.signal_type] || 0) + 1;
  }

  return {
    total_signals: signals.length,
    by_tier,
    by_type,
    top_signals: signals.slice(0, 5),
    last_updated: new Date().toISOString(),
  };
}

/* ─── Public API ─── */

export async function screen(params: ScreenParams): Promise<ScreenResponse> {
  if (USE_MOCK) return mockScreen(params);
  return post<ScreenResponse>("/screen", params);
}

export async function getSignals(symbols: string[]): Promise<SignalResponse> {
  if (USE_MOCK) return mockSignals();
  return post<SignalResponse>("/signals", { symbols });
}

export async function getDashboard(): Promise<DashboardSummary> {
  if (USE_MOCK) return mockDashboard();
  return post<DashboardSummary>("/dashboard", {});
}

// ─── Contract-Level Ranking API ───

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
  top_big_mover: ContractEntry | null;
  top_volume_spike: ContractEntry | null;
}

function makeContract(
  rank: number,
  underlying: string,
  isEtf: boolean,
  code: string,
  strike: number,
  exp: string,
  optType: string,
  last: number,
  high: number,
  low: number,
  change: number,
  bid: number,
  ask: number,
  vol: number,
  vsAvg: number,
  prem: number,
  oi: number,
  oiChg: number,
  iv: number,
  ivChg: number,
  delta: number,
  gamma: number,
  theta: number,
  vega: number,
  narrative: string,
): ContractEntry {
  return {
    rank,
    underlying,
    is_etf: isEtf,
    contract_code: code,
    strike,
    expiration: exp,
    option_type: optType,
    price: { last, high, low, change_pct: change, bid, ask },
    volume: { total: vol, vs_avg: vsAvg, premium: prem },
    oi: { total: oi, change: oiChg },
    iv: { current: iv, change_pct: ivChg },
    greeks: { delta, gamma, theta, vega },
    narrative,
  };
}

const MOCK_DRAGON_TIGER: ContractEntry[] = [
  makeContract(1, "AAPL", false, "AAPL261218C185", 185, "2026-12-18", "C", 12.50, 13.20, 11.80, 5.2, 12.00, 13.00, 34200, 8.5, 42.75, 12500, 1200, 0.32, 2.1, 0.72, 0.012, -0.035, 0.18, "🔥 8.5x volume | LEAPS call accumulation post-earnings"),
  makeContract(2, "NVDA", false, "NVDA270115C130", 130, "2027-01-15", "C", 22.00, 24.50, 20.10, 8.1, 21.50, 22.50, 28900, 12.3, 63.58, 15600, 3400, 0.38, 4.5, 0.75, 0.015, -0.038, 0.25, "🔥 12.3x volume | AI chip momentum driving far-dated calls"),
  makeContract(3, "TSLA", false, "TSLA260919C220", 220, "2026-09-19", "C", 18.30, 20.00, 16.50, 12.4, 17.80, 18.80, 24500, 6.2, 44.84, 8900, 2100, 0.45, 8.2, 0.68, 0.015, -0.042, 0.22, "⚡ 6.2x volume | Flat stock but call buildup — directional bet"),
  makeContract(4, "SPCE", false, "SPCE260717C7", 7, "2026-07-17", "C", 1.85, 2.40, 1.20, 28.5, 1.75, 1.95, 22300, 15.2, 4.13, 4200, 1800, 0.55, 15.0, 0.65, 0.015, -0.042, 0.22, "🔥 15.2x volume | First appearance, retail-driven aerospace narrative"),
  makeContract(5, "SPY", true, "SPY260620C545", 545, "2026-06-20", "C", 8.20, 9.10, 7.50, 3.8, 8.00, 8.40, 19800, 4.1, 16.24, 32100, 800, 0.18, 1.2, 0.52, 0.008, -0.055, 0.28, "📈 4.1x volume | Broad market call positioning ahead of Fed"),
  makeContract(6, "QQQ", true, "QQQ260620C495", 495, "2026-06-20", "C", 7.80, 8.50, 7.10, 4.2, 7.60, 8.00, 18500, 3.8, 14.43, 28500, 600, 0.22, 1.8, 0.48, 0.009, -0.052, 0.30, "📈 3.8x volume | Tech sector call flow on AI optimism"),
  makeContract(7, "MSFT", false, "MSFT261120C420", 420, "2026-11-20", "C", 28.50, 30.00, 27.00, 2.1, 28.00, 29.00, 17200, 5.5, 49.02, 7800, 900, 0.25, -1.5, 0.70, 0.010, -0.042, 0.22, "⚡ 5.5x volume | Smart money building 420c Nov"),
  makeContract(8, "AMD", false, "AMD261017C155", 155, "2026-10-17", "C", 8.50, 9.80, 7.40, 15.2, 8.20, 8.80, 16500, 7.1, 14.03, 6500, 1500, 0.42, 6.8, 0.65, 0.018, -0.035, 0.15, "⚡ 7.1x volume | Semiconductor momentum — 155c Oct"),
  makeContract(9, "SMH", true, "SMH260605P550", 550, "2026-06-05", "P", 8.50, 10.20, 7.00, 18.5, 8.20, 8.80, 15200, 9.4, 12.92, 22100, 4200, 0.28, 5.2, -0.38, 0.008, -0.055, 0.25, "🔥 9.4x volume | Put wall at 550 — institutions hedging chip risk"),
  makeContract(10, "META", false, "META261218C580", 580, "2026-12-18", "C", 32.00, 35.00, 29.50, 6.8, 31.50, 32.50, 14800, 4.2, 47.36, 11200, 1800, 0.30, 2.8, 0.62, 0.011, -0.040, 0.20, "📈 4.2x volume | Metaverse + AI dual narrative call flow"),
];

const MOCK_INDIVIDUAL: ContractEntry[] = MOCK_DRAGON_TIGER.filter(e => !e.is_etf).slice(0, 8);
const MOCK_ETF_NEW: ContractEntry[] = MOCK_DRAGON_TIGER.filter(e => e.is_etf).slice(0, 5);

function mockContractRanking(category: string): ContractRankingResponse {
  const map: Record<string, ContractEntry[]> = {
    dragon_tiger: MOCK_DRAGON_TIGER,
    individual: MOCK_INDIVIDUAL,
    etf: MOCK_ETF_NEW,
  };
  const entries = map[category] || MOCK_DRAGON_TIGER;
  return { date: new Date().toISOString().split("T")[0], category, total: entries.length, rankings: entries };
}

function mockContractStats(): ContractDashboardStats {
  return {
    date: new Date().toISOString().split("T")[0],
    total_contracts: 600,
    total_volume: 2340500,
    total_premium: 324.5,
    call_put_ratio: 2.04,
    top_big_mover: MOCK_DRAGON_TIGER[3], // SPCE
    top_volume_spike: MOCK_DRAGON_TIGER[3], // SPCE
  };
}

export async function getContractRanking(category: string = "dragon_tiger"): Promise<ContractRankingResponse> {
  if (USE_MOCK) return mockContractRanking(category);
  return post<ContractRankingResponse>("/ranking", { category });
}

export async function getContractStats(): Promise<ContractDashboardStats> {
  if (USE_MOCK) return mockContractStats();
  return post<ContractDashboardStats>("/dashboard", {});
}
