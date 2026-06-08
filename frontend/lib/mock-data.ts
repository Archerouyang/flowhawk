/**
 * Mock data constants for development mode.
 *
 * Extracted from api.ts to keep the data layer clean.
 */

import type {
  ClassifiedSignal,
  ContractEntry,
  ScreenParams,
  ScreenResponse,
  SignalResponse,
  DashboardSummary,
  ContractRankingResponse,
  ContractDashboardStats,
  TrackerListResponse,
  TrackerHistoryResponse,
  TrackerItem,
  TrackedContractWithSnapshot,
} from "./data-source";

export const MOCK_CLASSIFIED_SIGNALS: ClassifiedSignal[] = [
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
    timestamp: "2026-06-03T09:42:00Z",
    iv_history: [0.28, 0.29, 0.30, 0.31, 0.30, 0.31, 0.32, 0.33, 0.32, 0.32],
    iv_percentile: 72,
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
    timestamp: "2026-06-03T10:15:00Z",
    iv_history: [0.38, 0.40, 0.42, 0.41, 0.43, 0.44, 0.45, 0.44, 0.45, 0.45],
    iv_percentile: 88,
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
    timestamp: "2026-06-03T09:58:00Z",
    iv_history: [0.24, 0.25, 0.26, 0.27, 0.26, 0.27, 0.28, 0.27, 0.28, 0.28],
    iv_percentile: 45,
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
    timestamp: "2026-06-03T10:05:00Z",
    iv_history: [0.48, 0.50, 0.52, 0.53, 0.54, 0.55, 0.55, 0.54, 0.55, 0.55],
    iv_percentile: 95,
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
    timestamp: "2026-06-03T09:30:00Z",
    iv_history: [0.28, 0.29, 0.30, 0.31, 0.30, 0.31, 0.32, 0.31, 0.32, 0.32],
    iv_percentile: 55,
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
    timestamp: "2026-06-03T10:22:00Z",
    iv_history: [0.40, 0.41, 0.42, 0.43, 0.44, 0.44, 0.45, 0.44, 0.45, 0.45],
    iv_percentile: 82,
  },
  {
    symbol: "NVDA",
    option_type: "C",
    strike: 130,
    expiration: "2027-01-15",
    last_price: 22.0,
    delta: 0.75,
    gamma: 0.015,
    theta: -0.038,
    vega: 0.25,
    implied_volatility: 0.38,
    voi_ratio: 3.8,
    leaps_score: 0.88,
    theta_price_ratio: 0.0017,
    dte: 228,
    signal_type: "sweep",
    composite_score: 91,
    tier: "🔴 conviction",
    narrative:
      "NVDA 多交易所扫单——3 分钟内 12 笔 sweep order 合计 $2.1M，方向一致做多。急迫性极强。",
    tags: ["Sweep cluster", "Multi-exchange", "$2M+ premium"],
    asset_type: "STOCK",
    cap_type: "LARGE",
    sector: "Technology",
    timestamp: "2026-06-03T10:35:00Z",
    iv_history: [0.32, 0.33, 0.34, 0.35, 0.34, 0.35, 0.36, 0.37, 0.38, 0.38],
    iv_percentile: 78,
  },
  {
    symbol: "META",
    option_type: "C",
    strike: 580,
    expiration: "2026-12-18",
    last_price: 32.0,
    delta: 0.62,
    gamma: 0.011,
    theta: -0.040,
    vega: 0.20,
    implied_volatility: 0.30,
    voi_ratio: 4.2,
    leaps_score: 0.82,
    theta_price_ratio: 0.0013,
    dte: 203,
    signal_type: "block",
    composite_score: 88,
    tier: "🔴 conviction",
    narrative:
      "META 580c 单笔 $890K block trade——暗池成交，机构在 580 行权价建立大额远月 call 仓位。",
    tags: ["Block $800K+", "Dark pool print", "Institutional build"],
    asset_type: "STOCK",
    cap_type: "LARGE",
    sector: "Communication Services",
    timestamp: "2026-06-03T10:18:00Z",
    iv_history: [0.26, 0.27, 0.28, 0.29, 0.28, 0.29, 0.30, 0.30, 0.30, 0.30],
    iv_percentile: 62,
  },
  {
    symbol: "AMD",
    option_type: "P",
    strike: 155,
    expiration: "2026-10-17",
    last_price: 8.50,
    delta: -0.38,
    gamma: 0.012,
    theta: -0.042,
    vega: 0.22,
    implied_volatility: 0.42,
    voi_ratio: 2.8,
    leaps_score: 0.78,
    theta_price_ratio: 0.0049,
    dte: 137,
    signal_type: "dark_pool",
    composite_score: 76,
    tier: "🟠 strong",
    narrative:
      "AMD 155p 暗池 $1.2M 成交——不在公开订单簿显示，隐藏卖压。芯片板块尾部风险对冲。",
    tags: ["Dark pool $1M+", "Hidden flow", "Sector hedge"],
    asset_type: "STOCK",
    cap_type: "LARGE",
    sector: "Technology",
    timestamp: "2026-06-03T09:55:00Z",
    iv_history: [0.36, 0.37, 0.38, 0.39, 0.40, 0.41, 0.42, 0.41, 0.42, 0.42],
    iv_percentile: 85,
  },
  {
    symbol: "ARKK",
    option_type: "C",
    strike: 50,
    expiration: "2026-08-15",
    last_price: 3.80,
    delta: 0.55,
    gamma: 0.012,
    theta: -0.035,
    vega: 0.28,
    implied_volatility: 0.42,
    voi_ratio: 12.3,
    leaps_score: 0.85,
    theta_price_ratio: 0.0092,
    dte: 74,
    signal_type: "sector_rotation",
    composite_score: 79,
    tier: "🟠 strong",
    narrative:
      "ARKK 创新 ETF call  surge——板块级别的资金轮动信号，成长股资金回流。",
    tags: ["Sector rotation", "Growth inflow", "ETF flow"],
    asset_type: "ETF",
    cap_type: "GROWTH",
    sector: "Technology",
    timestamp: "2026-06-03T10:08:00Z",
    iv_history: [0.36, 0.37, 0.38, 0.39, 0.40, 0.41, 0.42, 0.41, 0.42, 0.42],
    iv_percentile: 90,
  },
];

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
  leapCp: number = 0,
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
    leap_cp_ratio: leapCp,
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
  makeContract(11, "NFLX", false, "NFLX260815C750", 750, "2026-08-15", "C", 18.20, 20.50, 16.80, 4.5, 18.00, 18.50, 14200, 5.8, 25.84, 9800, 1200, 0.35, 3.2, 0.58, 0.009, -0.048, 0.24, "⚡ 5.8x volume | Streaming wars heating up — far-dated call flow"),
  makeContract(12, "JPM", false, "JPM260815C220", 220, "2026-08-15", "C", 5.80, 6.50, 5.20, 2.1, 5.60, 5.90, 13800, 4.5, 8.00, 22100, 800, 0.22, 1.5, 0.48, 0.012, -0.038, 0.18, "📈 4.5x volume | Banking sector rotation into calls"),
  makeContract(13, "IWM", true, "IWM260815C215", 215, "2026-08-15", "C", 4.20, 4.80, 3.80, 3.2, 4.10, 4.30, 13500, 3.9, 5.67, 18500, 600, 0.28, 2.1, 0.52, 0.010, -0.042, 0.22, "📈 3.9x volume | Small cap resurgence — Russell 2000 call positioning"),
  makeContract(14, "AVGO", false, "AVGO260815C185", 185, "2026-08-15", "C", 8.50, 9.80, 7.60, 7.8, 8.30, 8.70, 13200, 6.2, 11.22, 7600, 1400, 0.32, 4.5, 0.62, 0.013, -0.045, 0.20, "⚡ 6.2x volume | Broadcom AI chip demand driving call volume"),
  makeContract(15, "XLF", true, "XLF260815C42", 42, "2026-08-15", "C", 2.10, 2.40, 1.90, 2.8, 2.05, 2.15, 12800, 4.1, 2.69, 15200, 500, 0.25, 1.8, 0.55, 0.011, -0.035, 0.16, "📈 4.1x volume | Financial sector ETF call accumulation"),
  makeContract(16, "JNJ", false, "JNJ260815C165", 165, "2026-08-15", "C", 3.50, 3.90, 3.20, 1.5, 3.40, 3.60, 12500, 3.5, 4.38, 11200, 400, 0.20, 0.8, 0.45, 0.010, -0.032, 0.15, "📈 3.5x volume | Healthcare defensive positioning with calls"),
  makeContract(17, "WMT", false, "WMT260815C105", 105, "2026-08-15", "C", 2.80, 3.10, 2.60, 1.8, 2.75, 2.85, 12200, 4.2, 3.42, 8900, 350, 0.18, 1.2, 0.50, 0.012, -0.030, 0.14, "📈 4.2x volume | Consumer staples call flow ahead of earnings"),
  makeContract(18, "XLE", true, "XLE260815C92", 92, "2026-08-15", "C", 3.80, 4.20, 3.50, 5.2, 3.70, 3.90, 11800, 5.5, 4.49, 9800, 800, 0.30, 3.5, 0.58, 0.014, -0.040, 0.19, "⚡ 5.5x volume | Energy sector rotation — OPEC decision pending"),
  makeContract(19, "ORCL", false, "ORCL260815C175", 175, "2026-08-15", "C", 6.20, 7.00, 5.60, 6.5, 6.10, 6.30, 11500, 5.8, 7.13, 6500, 900, 0.28, 4.2, 0.60, 0.011, -0.042, 0.21, "⚡ 5.8x volume | Cloud database demand driving Oracle call flow"),
  makeContract(20, "BAC", false, "BAC260815C42", 42, "2026-08-15", "C", 1.85, 2.10, 1.65, 3.2, 1.80, 1.90, 11200, 4.8, 2.07, 14500, 600, 0.26, 2.5, 0.52, 0.013, -0.036, 0.17, "📈 4.8x volume | Bank of America call buildup — rate cut bets"),
  makeContract(21, "XLK", true, "XLK260815C230", 230, "2026-08-15", "C", 5.50, 6.10, 5.00, 4.8, 5.40, 5.60, 10800, 4.5, 5.94, 12100, 700, 0.24, 2.8, 0.54, 0.009, -0.038, 0.20, "📈 4.5x volume | Tech sector ETF call flow — AI momentum"),
  makeContract(22, "UNH", false, "UNH260815C620", 620, "2026-08-15", "C", 12.50, 14.00, 11.50, 2.5, 12.20, 12.80, 10500, 3.8, 13.13, 5200, 450, 0.22, 1.5, 0.48, 0.008, -0.045, 0.22, "📈 3.8x volume | UnitedHealth defensive call positioning"),
  makeContract(23, "HD", false, "HD260815C380", 380, "2026-08-15", "C", 7.80, 8.60, 7.10, 3.5, 7.60, 8.00, 10200, 4.2, 7.96, 4800, 380, 0.20, 2.1, 0.50, 0.010, -0.040, 0.18, "📈 4.2x volume | Home improvement calls — housing data pending"),
  makeContract(24, "CRM", false, "CRM260815C315", 315, "2026-08-15", "C", 9.50, 10.80, 8.60, 8.2, 9.30, 9.70, 9800, 6.5, 9.31, 5600, 1100, 0.30, 5.2, 0.62, 0.012, -0.048, 0.23, "⚡ 6.5x volume | Salesforce AI monetization driving call demand"),
  makeContract(25, "PFE", false, "PFE260815C32", 32, "2026-08-15", "C", 1.20, 1.40, 1.10, 2.8, 1.18, 1.22, 9500, 3.5, 1.14, 18200, 300, 0.24, 1.8, 0.55, 0.015, -0.028, 0.13, "📈 3.5x volume | Pharma value play — deep OTM call accumulation"),
  makeContract(26, "GOOGL", false, "GOOGL260815C170", 170, "2026-08-15", "C", 8.20, 9.50, 7.50, 3.8, 8.00, 8.40, 9200, 4.2, 7.54, 11200, 650, 0.28, 2.5, 0.58, 0.011, -0.042, 0.20, "📈 4.2x volume | Alphabet AI search monetization call accumulation"),
  makeContract(27, "AMZN", false, "AMZN260815C200", 200, "2026-08-15", "C", 12.50, 14.00, 11.50, 4.5, 12.20, 12.80, 8800, 5.1, 11.00, 9800, 520, 0.30, 3.2, 0.60, 0.012, -0.045, 0.21, "⚡ 5.1x volume | Amazon AWS growth narrative driving call demand"),
  makeContract(28, "DIS", false, "DIS260815C110", 110, "2026-08-15", "C", 4.20, 4.80, 3.80, 3.2, 4.10, 4.30, 8400, 4.5, 3.53, 7200, 380, 0.26, 2.1, 0.52, 0.010, -0.038, 0.18, "📈 4.5x volume | Disney streaming + parks recovery call positioning"),
  makeContract(29, "NKE", false, "NKE260815C100", 100, "2026-08-15", "C", 5.50, 6.20, 5.00, 2.8, 5.40, 5.60, 8100, 3.8, 4.46, 6500, 290, 0.24, 1.8, 0.50, 0.009, -0.035, 0.17, "📈 3.8x volume | Nike consumer recovery — brand strength call bets"),
  makeContract(30, "INTC", false, "INTC260815C25", 25, "2026-08-15", "C", 2.80, 3.20, 2.50, 5.5, 2.70, 2.90, 7800, 6.2, 2.18, 8900, 420, 0.32, 3.5, 0.55, 0.014, -0.040, 0.19, "⚡ 6.2x volume | Intel turnaround play — deep value call accumulation"),
  makeContract(31, "PYPL", false, "PYPL260815C70", 70, "2026-08-15", "C", 3.50, 4.00, 3.10, 4.2, 3.40, 3.60, 7500, 5.5, 2.63, 5800, 350, 0.35, 2.8, 0.52, 0.013, -0.042, 0.20, "⚡ 5.5x volume | PayPal fintech recovery — oversold bounce calls"),
  makeContract(32, "UBER", false, "UBER260815C80", 80, "2026-08-15", "C", 6.20, 7.00, 5.60, 6.8, 6.10, 6.30, 7200, 7.1, 4.46, 6200, 480, 0.38, 4.2, 0.58, 0.015, -0.048, 0.22, "🔥 7.1x volume | Uber mobility + delivery dual growth call buildup"),
  makeContract(33, "ARKK", true, "ARKK260815C50", 50, "2026-08-15", "C", 3.80, 4.50, 3.30, 8.5, 3.70, 3.90, 14200, 12.3, 5.40, 18500, 1200, 0.42, 6.8, 0.55, 0.012, -0.055, 0.28, "🔥 12.3x volume | ARKK innovation ETF call surge — Cathie Wood momentum"),
  makeContract(34, "TLT", true, "TLT260815P95", 95, "2026-08-15", "P", 2.50, 3.00, 2.10, 5.2, 2.40, 2.60, 13800, 8.5, 3.45, 22100, 1800, 0.28, 4.2, -0.35, 0.008, -0.058, 0.32, "🔥 8.5x volume | Treasury bond put hedge — rate cut expectation positioning"),
  makeContract(35, "GLD", true, "GLD260815C220", 220, "2026-08-15", "C", 4.20, 4.80, 3.80, 3.2, 4.10, 4.30, 13200, 5.1, 5.54, 15600, 850, 0.22, 2.5, 0.48, 0.009, -0.042, 0.24, "⚡ 5.1x volume | Gold ETF call flow — inflation hedge demand"),
  makeContract(36, "VOO", true, "VOO260815C500", 500, "2026-08-15", "C", 5.50, 6.10, 5.00, 2.1, 5.40, 5.60, 12800, 3.8, 7.04, 14200, 520, 0.18, 1.5, 0.52, 0.008, -0.038, 0.22, "📈 3.8x volume | S&P 500 core ETF call accumulation — passive inflows"),
  makeContract(37, "XLU", true, "XLU260815C70", 70, "2026-08-15", "C", 1.85, 2.10, 1.65, 2.8, 1.80, 1.90, 12500, 4.2, 2.31, 16800, 480, 0.20, 1.8, 0.50, 0.011, -0.032, 0.15, "📈 4.2x volume | Utilities defensive rotation — rate-sensitive sector calls"),
  makeContract(38, "XLI", true, "XLI260815C120", 120, "2026-08-15", "C", 2.80, 3.20, 2.50, 3.5, 2.70, 2.90, 12200, 4.8, 3.42, 13200, 420, 0.24, 2.1, 0.52, 0.010, -0.040, 0.18, "📈 4.8x volume | Industrials ETF call flow — infrastructure bill plays"),
  makeContract(39, "XLP", true, "XLP260815C75", 75, "2026-08-15", "C", 2.10, 2.40, 1.90, 2.1, 2.05, 2.15, 11800, 3.5, 2.48, 11500, 380, 0.18, 1.2, 0.48, 0.009, -0.035, 0.16, "📈 3.5x volume | Consumer staples ETF calls — recession hedge positioning"),
  makeContract(40, "XLB", true, "XLB260815C85", 85, "2026-08-15", "C", 3.20, 3.60, 2.90, 4.2, 3.10, 3.30, 11500, 5.5, 3.68, 9800, 520, 0.26, 2.8, 0.54, 0.012, -0.042, 0.19, "⚡ 5.5x volume | Materials sector rotation — commodity supercycle calls"),
  makeContract(41, "KRE", true, "KRE260815C55", 55, "2026-08-15", "C", 1.95, 2.20, 1.75, 3.2, 1.90, 2.00, 11200, 6.2, 2.18, 14200, 650, 0.28, 3.2, 0.52, 0.013, -0.038, 0.17, "⚡ 6.2x volume | Regional banks ETF call surge — rate cut beta play"),
  makeContract(42, "IBB", true, "IBB260815C140", 140, "2026-08-15", "C", 5.80, 6.50, 5.20, 3.8, 5.70, 5.90, 10800, 4.5, 6.26, 8500, 480, 0.24, 2.1, 0.50, 0.010, -0.040, 0.20, "📈 4.5x volume | Biotech ETF call accumulation — M&A speculation pipeline"),
  makeContract(43, "SOXL", true, "SOXL260815C35", 35, "2026-08-15", "C", 8.50, 10.20, 7.20, 12.5, 8.20, 8.80, 10500, 15.2, 8.93, 9800, 1100, 0.55, 8.2, 0.62, 0.018, -0.062, 0.30, "🔥 15.2x volume | 3x Semiconductor leverage ETF — gamma squeeze on SOXL calls"),
  makeContract(44, "VXX", true, "VXX260815C15", 15, "2026-08-15", "C", 2.20, 2.60, 1.90, 8.5, 2.10, 2.30, 10200, 9.8, 2.24, 18500, 950, 0.45, 5.5, 0.48, 0.014, -0.055, 0.28, "🔥 9.8x volume | VIX futures ETF call spike — tail risk hedging demand"),
  makeContract(45, "EEM", true, "EEM260815C45", 45, "2026-08-15", "C", 1.50, 1.75, 1.30, 2.8, 1.45, 1.55, 9800, 4.2, 1.47, 11200, 380, 0.22, 1.8, 0.50, 0.010, -0.032, 0.16, "📈 4.2x volume | Emerging markets ETF call flow — China reopening narrative"),
  makeContract(46, "USO", true, "USO260815C80", 80, "2026-08-15", "C", 3.50, 4.00, 3.10, 4.5, 3.40, 3.60, 9500, 6.5, 3.33, 10200, 520, 0.30, 3.2, 0.55, 0.012, -0.042, 0.20, "⚡ 6.5x volume | Oil ETF call accumulation — supply tightness bets"),
  makeContract(47, "SCHD", true, "SCHD260815C25", 25, "2026-08-15", "C", 1.20, 1.35, 1.10, 1.8, 1.18, 1.22, 9200, 3.5, 1.10, 12800, 280, 0.16, 1.2, 0.48, 0.008, -0.028, 0.14, "📈 3.5x volume | Dividend aristocrats ETF calls — income + growth dual play"),
  makeContract(48, "JEPI", true, "JEPI260815C55", 55, "2026-08-15", "C", 2.80, 3.10, 2.60, 2.1, 2.75, 2.85, 8800, 4.1, 2.46, 9800, 350, 0.18, 1.5, 0.50, 0.009, -0.030, 0.15, "📈 4.1x volume | Covered call ETF call flow — volatility harvesting demand"),
  makeContract(49, "XLRE", true, "XLRE260815C40", 40, "2026-08-15", "C", 1.85, 2.10, 1.65, 3.2, 1.80, 1.90, 8500, 5.2, 1.57, 7200, 320, 0.24, 2.1, 0.52, 0.011, -0.035, 0.17, "⚡ 5.2x volume | Real estate ETF calls — rate-sensitive sector positioning"),
  makeContract(50, "TQQQ", true, "TQQQ260815C55", 55, "2026-08-15", "C", 6.50, 7.50, 5.80, 10.2, 6.30, 6.70, 8200, 18.5, 5.33, 11200, 850, 0.52, 8.2, 0.58, 0.016, -0.058, 0.32, "🔥 18.5x volume | 3x Nasdaq leverage ETF — extreme call gamma squeeze"),
];

const MOCK_DRAGON_TIGER_TOP25: ContractEntry[] = MOCK_DRAGON_TIGER.slice(0, 25);
const MOCK_INDIVIDUAL: ContractEntry[] = MOCK_DRAGON_TIGER
  .filter((e) => !e.is_etf)
  .slice(0, 25)
  .map((e, i) => ({ ...e, rank: i + 1 }));
const MOCK_ETF_NEW: ContractEntry[] = MOCK_DRAGON_TIGER
  .filter((e) => e.is_etf)
  .slice(0, 25)
  .map((e, i) => ({ ...e, rank: i + 1 }));
const MOCK_PREMIUM: ContractEntry[] = [...MOCK_DRAGON_TIGER]
  .sort((a, b) => b.volume.premium - a.volume.premium)
  .slice(0, 25)
  .map((e, i) => ({ ...e, rank: i + 1 }));

const MOCK_TRACKER_KEY = "flowhawk_mock_tracker";

const DEFAULT_MOCK_TRACKER_CONTRACTS: TrackedContractWithSnapshot[] = [
  {
    contract_code: "AAPL261218C185",
    underlying: "AAPL",
    option_type: "C",
    strike: 185,
    expiration: "2026-12-18",
    added_at: "2026-06-01T10:00:00Z",
    notes: "异常大单，建仓信号",
    status: "active",
    alert_threshold: null,
    last_price: 12.50,
    volume: 34200,
    open_interest: 12500,
    oi_change: 1200,
    iv: 0.32,
    delta: 0.72,
    gamma: 0.012,
    theta: -0.035,
    vega: 0.18,
    premium: 42.75,
    volume_vs_avg: 8.5,
    prev_oi: 11300,
    prev_volume: 28000,
    prev_price: 11.80,
    oi_delta: 1200,
    volume_delta: 6200,
    price_delta: 0.70,
    oi_delta_pct: 10.62,
    oi_30d_high: 13000,
  },
  {
    contract_code: "NVDA270115C130",
    underlying: "NVDA",
    option_type: "C",
    strike: 130,
    expiration: "2027-01-15",
    added_at: "2026-06-02T14:30:00Z",
    notes: "LEAP call 堆积，机构做多",
    status: "active",
    alert_threshold: null,
    last_price: 22.00,
    volume: 28900,
    open_interest: 15600,
    oi_change: 3400,
    iv: 0.38,
    delta: 0.75,
    gamma: 0.015,
    theta: -0.038,
    vega: 0.25,
    premium: 63.58,
    volume_vs_avg: 12.3,
    prev_oi: 12200,
    prev_volume: 21000,
    prev_price: 20.50,
    oi_delta: 3400,
    volume_delta: 7900,
    price_delta: 1.50,
    oi_delta_pct: 27.87,
    oi_30d_high: 16000,
  },
  {
    contract_code: "SMH260605P550",
    underlying: "SMH",
    option_type: "P",
    strike: 550,
    expiration: "2026-06-05",
    added_at: "2026-06-03T09:15:00Z",
    notes: "Put wall，对冲芯片风险",
    status: "alerted",
    alert_threshold: -15.0,
    last_price: 8.50,
    volume: 15200,
    open_interest: 22100,
    oi_change: -1800,
    iv: 0.28,
    delta: -0.38,
    gamma: 0.008,
    theta: -0.055,
    vega: 0.25,
    premium: 12.92,
    volume_vs_avg: 9.4,
    prev_oi: 23900,
    prev_volume: 18000,
    prev_price: 9.20,
    oi_delta: -1800,
    volume_delta: -2800,
    price_delta: -0.70,
    oi_delta_pct: -7.53,
    oi_30d_high: 25000,
  },
];

function loadMockTrackerData(): TrackedContractWithSnapshot[] {
  if (typeof window === "undefined") return DEFAULT_MOCK_TRACKER_CONTRACTS;
  try {
    const raw = localStorage.getItem(MOCK_TRACKER_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(MOCK_TRACKER_KEY, JSON.stringify(DEFAULT_MOCK_TRACKER_CONTRACTS));
    return DEFAULT_MOCK_TRACKER_CONTRACTS;
  } catch {
    return DEFAULT_MOCK_TRACKER_CONTRACTS;
  }
}

function saveMockTrackerData(data: TrackedContractWithSnapshot[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MOCK_TRACKER_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

let MOCK_TRACKER_CONTRACTS: TrackedContractWithSnapshot[] = loadMockTrackerData();

/* ─── Exported helpers ─── */

export function getMockScreen(_params: ScreenParams): ScreenResponse {
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

export function getMockSignals(): SignalResponse {
  return {
    count: MOCK_CLASSIFIED_SIGNALS.length,
    signals: MOCK_CLASSIFIED_SIGNALS,
  };
}

export function getMockDashboard(): DashboardSummary {
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

export function getMockContractRanking(category: string): ContractRankingResponse {
  const map: Record<string, ContractEntry[]> = {
    dragon_tiger: MOCK_DRAGON_TIGER_TOP25,
    individual: MOCK_INDIVIDUAL,
    etf: MOCK_ETF_NEW,
  };
  const entries = map[category] || MOCK_DRAGON_TIGER_TOP25;
  return { date: new Date().toISOString().split("T")[0], category, total: entries.length, rankings: entries };
}

export function getMockContractStats(): ContractDashboardStats {
  return {
    date: new Date().toISOString().split("T")[0],
    total_contracts: 600,
    total_volume: 2340500,
    total_premium: 324.5,
    call_put_ratio: 2.04,
    dragon_tiger: MOCK_DRAGON_TIGER_TOP25,
    individual: MOCK_INDIVIDUAL,
    etf: MOCK_ETF_NEW,
    premium: MOCK_PREMIUM,
  };
}

export function getMockTrackerList(): TrackerListResponse {
  return { count: MOCK_TRACKER_CONTRACTS.length, contracts: MOCK_TRACKER_CONTRACTS };
}

export function getMockTrackerHistory(contract_code: string): TrackerHistoryResponse {
  const base = MOCK_TRACKER_CONTRACTS.find((c) => c.contract_code === contract_code);
  const today = new Date();
  const history: import("./data-source").TrackerSnapshot[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const noise = Math.sin(i * 1.5) * 0.1 + 1;
    history.push({
      snapshot_date: d.toISOString().split("T")[0],
      last_price: (base?.last_price || 10) * noise,
      volume: Math.floor((base?.volume || 10000) * (0.8 + Math.random() * 0.4)),
      open_interest: Math.floor((base?.open_interest || 10000) * (0.9 + Math.random() * 0.2)),
      oi_change: Math.floor((Math.random() - 0.5) * 2000),
      iv: (base?.iv || 0.3) * noise,
      iv_change_pct: (Math.random() - 0.5) * 5,
      delta: base?.delta || 0.5,
      gamma: base?.gamma || 0.01,
      theta: base?.theta || -0.04,
      vega: base?.vega || 0.2,
      premium: (base?.premium || 10) * noise,
      volume_vs_avg: (base?.volume_vs_avg || 5) * noise,
    });
  }
  return { contract_code, count: history.length, history };
}

export function addMockTracker(params: {
  contract_code: string;
  underlying: string;
  option_type: string;
  strike: number;
  expiration: string;
  notes?: string;
}): TrackerItem {
  const item: TrackedContractWithSnapshot = {
    contract_code: params.contract_code,
    underlying: params.underlying,
    option_type: params.option_type,
    strike: params.strike,
    expiration: params.expiration,
    added_at: new Date().toISOString(),
    notes: params.notes || "",
    status: "active",
    alert_threshold: null,
    last_price: null,
    volume: null,
    open_interest: null,
    oi_change: null,
    iv: null,
    delta: null,
    gamma: null,
    theta: null,
    vega: null,
    premium: null,
    volume_vs_avg: null,
    prev_oi: null,
    prev_volume: null,
    prev_price: null,
    oi_delta: null,
    volume_delta: null,
    price_delta: null,
    oi_delta_pct: null,
    oi_30d_high: null,
  };
  MOCK_TRACKER_CONTRACTS.push(item);
  saveMockTrackerData(MOCK_TRACKER_CONTRACTS);
  return item;
}

export function removeMockTracker(contract_code: string): { removed: boolean; contract_code: string } {
  const idx = MOCK_TRACKER_CONTRACTS.findIndex((c) => c.contract_code === contract_code);
  if (idx >= 0) {
    MOCK_TRACKER_CONTRACTS.splice(idx, 1);
    saveMockTrackerData(MOCK_TRACKER_CONTRACTS);
  }
  return { removed: idx >= 0, contract_code };
}

export function updateMockTracker(
  contract_code: string,
  updates: { notes?: string; status?: string }
): TrackerItem {
  return {
    contract_code,
    underlying: "MOCK",
    option_type: "C",
    strike: 100,
    expiration: "2026-12-18",
    added_at: new Date().toISOString(),
    notes: updates.notes || "",
    status: updates.status || "active",
    alert_threshold: null,
  };
}

// MOCK_CLASSIFIED_SIGNALS is already exported at the top of this file
