"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  Info,
  Zap,
  BarChart3,
} from "lucide-react";
import { getSignals, type ClassifiedSignal } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TradeRecord {
  time: string;
  price: number;
  volume: number;
  side: "BUY" | "SELL";
  flags: string[];
}

interface Analysis {
  is_repeated: boolean;
  repeat_count: number;
  sweep_detected: boolean;
  above_ask_count: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  narrative: string;
}

interface ContractDetail {
  code: string;
  underlying: string;
  strike: number;
  expiration: string;
  option_type: string;
  last_price: number;
  high: number;
  low: number;
  change_pct: number;
  volume: number;
  open_interest: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  leap_cp_ratio: number;
  // Longbridge fields
  call_volume: number;
  put_volume: number;
  stock_change_pct: number;
  stock_price: number;
  pre_market_price: number | null;
  post_market_price: number | null;
  trades: TradeRecord[];
  analysis: Analysis | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse contract code: SYMBOLyymmddC/Pstrike */
function parseContractCode(code: string): {
  underlying: string;
  expiry: string;
  option_type: "C" | "P";
  strike: number;
} | null {
  const m = code.match(/^([A-Z]+)(\d{6})([CP])([\d.]+)$/);
  if (!m) return null;
  const [, sym, dateStr, optType, strikeStr] = m;
  const yy = dateStr.slice(0, 2);
  const mm = dateStr.slice(2, 4);
  const dd = dateStr.slice(4, 6);
  return {
    underlying: sym,
    expiry: `20${yy}-${mm}-${dd}`,
    option_type: optType as "C" | "P",
    strike: parseFloat(strikeStr),
  };
}

/** Deterministic pseudo-random from string seed */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 16807 + 0) % 2147483647;
    return (h - 1) / 2147483646;
  };
}

/** Generate ContractDetail with all Longbridge fields */
function generateMockDetail(code: string): ContractDetail {
  const parsed = parseContractCode(code);
  if (!parsed) {
    return {
      code,
      underlying: "UNKNOWN",
      strike: 0,
      expiration: "",
      option_type: "C",
      last_price: 0,
      high: 0,
      low: 0,
      change_pct: 0,
      volume: 0,
      open_interest: 0,
      iv: 0,
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      leap_cp_ratio: 0,
      call_volume: 0,
      put_volume: 0,
      stock_change_pct: 0,
      stock_price: 0,
      pre_market_price: null,
      post_market_price: null,
      trades: [],
      analysis: null,
    };
  }

  const { underlying, expiry, option_type, strike } = parsed;
  const rng = seededRandom(code);
  const isCall = option_type === "C";

  // Base contract data
  const basePrice = 5 + rng() * 45;
  const lastPrice = Math.round(basePrice * 100) / 100;
  const changePct = (rng() - 0.5) * 20;
  const high = Math.round((lastPrice * (1 + Math.abs(rng() * 0.08))) * 100) / 100;
  const low = Math.round((lastPrice * (1 - Math.abs(rng() * 0.06))) * 100) / 100;
  const volume = Math.floor(2000 + rng() * 48000);
  const oi = Math.floor(3000 + rng() * 25000);
  const iv = 0.15 + rng() * 0.45;
  const delta = isCall ? 0.35 + rng() * 0.45 : -(0.35 + rng() * 0.45);
  const gamma = 0.005 + rng() * 0.02;
  const theta = -(0.01 + rng() * 0.06);
  const vega = 0.08 + rng() * 0.25;
  const leapCp = 0.5 + rng() * 12;

  // Longbridge fields
  const call_volume = Math.floor(10000 + rng() * 490000);
  const put_volume = Math.floor(5000 + rng() * 195000);
  const stock_change_pct = (rng() - 0.5) * 10;
  const stock_price = strike * (1.5 + rng() * 0.5);
  const pre_market_price = rng() > 0.3 ? stock_price * (0.99 + rng() * 0.02) : null;
  const post_market_price = rng() > 0.3 ? stock_price * (0.98 + rng() * 0.04) : null;

  // Generate trades
  const numTrades = 10 + Math.floor(rng() * 15);
  const trades: TradeRecord[] = [];
  const baseTradePrice = lastPrice * 0.98;
  for (let i = 0; i < numTrades; i++) {
    const tPrice = Math.round((baseTradePrice + (rng() - 0.5) * lastPrice * 0.06) * 100) / 100;
    const tVol = [100, 200, 300, 500, 1000][Math.floor(rng() * 5)];
    const isBuy = rng() > 0.35;
    const flags: string[] = [];
    if (isBuy && rng() > 0.5) flags.push("ASK");
    if (isBuy && rng() > 0.8) flags.push("ABOVE_ASK");
    if (isBuy && rng() > 0.9) flags.push("SWEEP");
    trades.push({
      time: `10:${String(Math.floor(5 + rng() * 54)).padStart(2, "0")}:${String(Math.floor(rng() * 60)).padStart(2, "0")}`,
      price: tPrice,
      volume: tVol,
      side: isBuy ? "BUY" : "SELL",
      flags,
    });
  }
  trades.sort((a, b) => a.time.localeCompare(b.time));

  return {
    code,
    underlying,
    strike,
    expiration: expiry,
    option_type,
    last_price: lastPrice,
    high,
    low,
    change_pct: Math.round(changePct * 100) / 100,
    volume,
    open_interest: oi,
    iv: Math.round(iv * 100) / 100,
    delta: Math.round(delta * 1000) / 1000,
    gamma: Math.round(gamma * 1000) / 1000,
    theta: Math.round(theta * 1000) / 1000,
    vega: Math.round(vega * 1000) / 1000,
    leap_cp_ratio: Math.round(leapCp * 100) / 100,
    call_volume,
    put_volume,
    stock_change_pct: Math.round(stock_change_pct * 100) / 100,
    stock_price: Math.round(stock_price * 100) / 100,
    pre_market_price: pre_market_price ? Math.round(pre_market_price * 100) / 100 : null,
    post_market_price: post_market_price ? Math.round(post_market_price * 100) / 100 : null,
    trades,
    analysis: null,
  };
}

/** Derive Analysis from ClassifiedSignal */
function buildSignalAnalysis(signal: ClassifiedSignal): Analysis {
  const rng = seededRandom(signal.symbol + String(signal.strike));
  const isBullish = signal.option_type === "C";
  const repeatCount = Math.floor(3 + rng() * 15);
  const aboveAskCount = Math.floor(rng() * repeatCount);
  const sweepCount = Math.floor(rng() * aboveAskCount);
  return {
    is_repeated: repeatCount >= 3,
    repeat_count: repeatCount,
    sweep_detected: sweepCount > 0,
    above_ask_count: aboveAskCount,
    direction: isBullish ? "BULLISH" : "BEARISH",
    confidence: signal.composite_score,
    narrative: signal.narrative,
  };
}

/** Match contract code to ClassifiedSignal */
function matchSignal(code: string, signals: ClassifiedSignal[]): ClassifiedSignal | null {
  const m = code.match(/^([A-Z]+)(\d{6})([CP])([\d.]+)$/);
  if (!m) return null;
  const [, sym, , optType, strikeStr] = m;
  const strike = parseFloat(strikeStr);
  return (
    signals.find(
      (s) =>
        s.symbol === sym &&
        s.option_type === optType &&
        Math.abs(s.strike - strike) < 0.01
    ) || null
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const dashoffset = circumference * (1 - pct);

  let color = "text-slate-400";
  if (score >= 85) color = "text-emerald-400";
  else if (score >= 70) color = "text-amber-400";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
      <svg width="36" height="36" className="-rotate-90">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className="absolute text-[9px] font-bold">{score}</span>
    </div>
  );
}

function AnomalyMetricsGrid({ detail }: { detail: ContractDetail }) {
  const totalOptVolume = detail.call_volume + detail.put_volume;
  const callPct = totalOptVolume > 0 ? (detail.call_volume / totalOptVolume) * 100 : 0;
  const putPct = totalOptVolume > 0 ? (detail.put_volume / totalOptVolume) * 100 : 0;

  const cpRatio = detail.put_volume > 0 ? detail.call_volume / detail.put_volume : detail.call_volume;

  const avgBase = Math.max(detail.volume * 0.15, 1);
  const vsAvg = detail.volume / avgBase;

  let vsAvgColor = "text-slate-400";
  if (vsAvg >= 10) vsAvgColor = "text-red-400";
  else if (vsAvg >= 5) vsAvgColor = "text-orange-400";
  else if (vsAvg >= 2) vsAvgColor = "text-yellow-400";

  const stockUp = detail.stock_change_pct >= 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Option Volume */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Option Volume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totalOptVolume > 0 ? (
            <>
              <div className="text-2xl font-bold">{totalOptVolume.toLocaleString()}</div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-emerald-400" style={{ width: `${callPct}%` }} />
                <div className="h-full bg-rose-400" style={{ width: `${putPct}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">Call {callPct.toFixed(0)}%</span>
                <span className="text-rose-400">Put {putPct.toFixed(0)}%</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Stock Change */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Stock Change</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${stockUp ? "text-emerald-400" : "text-rose-400"}`}>
              {detail.stock_change_pct >= 0 ? "+" : ""}
              {detail.stock_change_pct.toFixed(2)}%
            </span>
            {stockUp ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-rose-400" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">Last: ${detail.stock_price.toFixed(2)}</div>
          {detail.pre_market_price !== null && (
            <div className="text-xs text-muted-foreground">
              Pre: ${detail.pre_market_price.toFixed(2)}
            </div>
          )}
          {detail.post_market_price !== null && (
            <div className="text-xs text-muted-foreground">
              Post: ${detail.post_market_price.toFixed(2)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: C/P Ratio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Call/Put Ratio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-2xl font-bold">{cpRatio.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Call: {detail.call_volume.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Put: {detail.put_volume.toLocaleString()}</div>
          {cpRatio > 2 && <div className="text-xs text-emerald-400">Bullish bias</div>}
          {cpRatio < 0.5 && <div className="text-xs text-rose-400">Bearish bias</div>}
          {cpRatio >= 0.5 && cpRatio <= 2 && <div className="text-xs text-slate-400">Neutral</div>}
        </CardContent>
      </Card>

      {/* Card 4: vs Avg Volume */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">vs Avg Volume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className={`text-2xl font-bold ${vsAvgColor}`}>{vsAvg.toFixed(1)}x</div>
          <div className="text-xs text-muted-foreground">{detail.volume.toLocaleString()} today</div>
        </CardContent>
      </Card>
    </div>
  );
}

function GreeksBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(Math.abs(value) / max, 1);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function GreeksSection({ detail }: { detail: ContractDetail }) {
  const [now] = useState(() => Date.now());
  const dte = Math.max(
    0,
    Math.ceil(
      (new Date(detail.expiration).getTime() - now) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      <div className="space-y-4">
        <GreeksBar label="Delta" value={detail.delta} max={1} color="bg-blue-400" />
        <GreeksBar label="Gamma" value={detail.gamma} max={0.05} color="bg-purple-400" />
        <GreeksBar label="Theta" value={detail.theta} max={0.1} color="bg-amber-400" />
      </div>
      <div className="space-y-4">
        <GreeksBar label="Vega" value={detail.vega} max={0.3} color="bg-cyan-400" />
        <GreeksBar label="IV" value={detail.iv} max={1} color="bg-emerald-400" />
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">DTE</span>
            <span className="font-mono font-medium">{dte}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-400"
              style={{ width: `${Math.min(dte / 365, 1) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalNarrativePanel({
  signal,
  analysis,
}: {
  signal: ClassifiedSignal;
  analysis: Analysis;
}) {
  const tierColorMap: Record<string, string> = {
    "🔴 conviction": "border-red-500/30 text-red-400 bg-red-500/10",
    "🟠 strong": "border-orange-500/30 text-orange-400 bg-orange-500/10",
    "🟡 moderate": "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-purple-400" />
          <span className="font-semibold">{signal.signal_type}</span>
          <Badge variant="outline" className={tierColorMap[signal.tier] || "border-slate-500/30 text-slate-400 bg-slate-500/10"}>
            {signal.tier}
          </Badge>
        </div>
        <div className="rounded bg-muted/50 p-3 text-sm">{analysis.narrative}</div>
        <div className="flex flex-wrap gap-2">
          {signal.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NoSignalInfoBanner() {
  return (
    <div className="flex items-start gap-3 rounded border border-blue-500/30 bg-blue-500/5 p-4 text-sm">
      <Info className="h-5 w-5 shrink-0 text-blue-400" />
      <div>
        <div className="font-bold text-blue-400">No Signal</div>
        <div className="text-muted-foreground">
          This contract is not currently flagged by the anomaly screener. Only basic contract info and trade records are shown.
        </div>
      </div>
    </div>
  );
}

function FlowAnalysis({ detail, analysis }: { detail: ContractDetail; analysis: Analysis }) {
  const buyVolume = detail.trades
    .filter((t) => t.side === "BUY")
    .reduce((sum, t) => sum + t.volume, 0);
  const sellVolume = detail.trades
    .filter((t) => t.side === "SELL")
    .reduce((sum, t) => sum + t.volume, 0);
  const totalFlow = buyVolume + sellVolume;
  const buyPct = totalFlow > 0 ? (buyVolume / totalFlow) * 100 : 0;
  const sellPct = totalFlow > 0 ? (sellVolume / totalFlow) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs text-muted-foreground">Repeat Trades</div>
            <div className="text-2xl font-bold">{analysis.repeat_count}</div>
            <div className="text-xs text-muted-foreground">trades</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs text-muted-foreground">Above Ask</div>
            <div className="text-2xl font-bold">{analysis.above_ask_count}</div>
            <div className="text-xs text-muted-foreground">orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs text-muted-foreground">Sweep</div>
            <div className={`text-2xl font-bold ${analysis.sweep_detected ? "text-purple-400" : "text-slate-400"}`}>
              {analysis.sweep_detected ? "Detected" : "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      {totalFlow > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400">Buy {buyPct.toFixed(0)}%</span>
            <span className="text-rose-400">Sell {sellPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div className="h-full bg-emerald-400" style={{ width: `${buyPct}%` }} />
            <div className="h-full bg-rose-400" style={{ width: `${sellPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function TradeRecordsTable({ trades }: { trades: TradeRecord[] }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          Trade Records
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Time</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((t, i) => (
                <TableRow
                  key={i}
                  className={`border-border ${
                    t.flags.includes("ABOVE_ASK") || t.flags.includes("SWEEP")
                      ? "bg-red-500/5"
                      : ""
                  }`}
                >
                  <TableCell className="font-mono">{t.time}</TableCell>
                  <TableCell className="font-mono">${t.price?.toFixed(2) ?? "-"}</TableCell>
                  <TableCell className="font-mono">{t.volume?.toLocaleString() ?? "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        t.side === "BUY"
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-rose-500/30 text-rose-400"
                      }
                    >
                      {t.side === "BUY" ? "Buy" : "Sell"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.flags.includes("ABOVE_ASK") && (
                        <Badge
                          variant="outline"
                          className="border-orange-500/30 text-orange-400 text-xs"
                        >
                          Above Ask
                        </Badge>
                      )}
                      {t.flags.includes("SWEEP") && (
                        <Badge
                          variant="outline"
                          className="border-purple-500/30 text-purple-400 text-xs"
                        >
                          Sweep
                        </Badge>
                      )}
                      {t.flags.includes("ASK") && (
                        <Badge
                          variant="outline"
                          className="border-blue-500/30 text-blue-400 text-xs"
                        >
                          Ask
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SignalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const detail = useMemo(() => generateMockDetail(code), [code]);
  const [signal, setSignal] = useState<ClassifiedSignal | null>(null);

  useEffect(() => {
    getSignals().then((res) => {
      const matched = matchSignal(code, res.signals);
      setSignal(matched);
    });
  }, [code]);

  const analysis = signal ? buildSignalAnalysis(signal) : null;
  const isSignal = signal !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {isSignal && analysis && <ScoreRing score={analysis.confidence} />}

        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            {detail.underlying} ${detail.strike} {detail.option_type === "C" ? "Call" : "Put"} {detail.expiration}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{detail.code}</p>
        </div>

        {isSignal && analysis && (
          <Badge
            variant="outline"
            className={
              analysis.direction === "BULLISH"
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                : "border-rose-500/30 text-rose-400 bg-rose-500/10"
            }
          >
            {analysis.direction} {analysis.confidence}%
          </Badge>
        )}
        {!isSignal && (
          <Badge variant="outline" className="border-slate-500/30 text-slate-400 bg-slate-500/10">
            No Signal
          </Badge>
        )}
      </div>

      {/* Anomaly Metrics Grid */}
      <AnomalyMetricsGrid detail={detail} />

      {/* Signal Narrative or No-Signal Banner */}
      {isSignal && signal && analysis && (
        <SignalNarrativePanel signal={signal} analysis={analysis} />
      )}
      {!isSignal && <NoSignalInfoBanner />}

      {/* Greeks */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Greeks & IV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GreeksSection detail={detail} />
        </CardContent>
      </Card>

      {/* Flow Analysis — only for signals */}
      {isSignal && analysis && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Flow Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FlowAnalysis detail={detail} analysis={analysis} />
          </CardContent>
        </Card>
      )}

      {/* Trade Records */}
      <TradeRecordsTable trades={detail.trades} />

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-400">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <div className="font-bold">Disclaimer</div>
          <div className="text-muted-foreground">
            Data is for research purposes only. Actual trading requires real-time quotes and personal judgment.
            {isSignal && " Signal analysis is based on simulated detection algorithms and does not constitute investment advice."}
          </div>
        </div>
      </div>
    </div>
  );
}
