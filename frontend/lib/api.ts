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

export interface SignalResult {
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
}

export interface SignalResponse {
  count: number;
  signals: SignalResult[];
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

function mockSignals(): SignalResponse {
  return {
    count: 2,
    signals: [
      {
        symbol: "AAPL", option_type: "C", strike: 185,
        expiration: "2026-12-18", last_price: 12.5,
        delta: 0.72, gamma: 0.012, theta: -0.035,
        vega: 0.18, implied_volatility: 0.32,
        voi_ratio: 4.2, leaps_score: 0.85,
        theta_price_ratio: 0.0028, dte: 202,
      },
      {
        symbol: "TSLA", option_type: "C", strike: 220,
        expiration: "2026-09-19", last_price: 18.3,
        delta: 0.68, gamma: 0.015, theta: -0.042,
        vega: 0.22, implied_volatility: 0.45,
        voi_ratio: 5.1, leaps_score: 0.92,
        theta_price_ratio: 0.0023, dte: 112,
      },
    ],
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
