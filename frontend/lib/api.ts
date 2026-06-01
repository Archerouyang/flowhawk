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
