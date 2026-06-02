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
  TrendingUp,
  Activity,
  AlertTriangle,
  Target,
  Info,
} from "lucide-react";
import { getSignals, type ClassifiedSignal } from "@/lib/api";

interface TradeRecord {
  time: string;
  price: number;
  volume: number;
  side: "BUY" | "SELL";
  flags: string[];
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
  trades: TradeRecord[];
  analysis: {
    is_repeated: boolean;
    repeat_count: number;
    sweep_detected: boolean;
    above_ask_count: number;
    direction: "BULLISH" | "BEARISH" | "NEUTRAL";
    confidence: number;
    narrative: string;
  } | null;
}

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
      trades: [],
      analysis: null,
    };
  }

  const { underlying, expiry, option_type, strike } = parsed;
  const rng = seededRandom(code);
  const isCall = option_type === "C";

  // Generate realistic-looking but deterministic data
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
    trades,
    analysis: null, // signal analysis is injected only when a real signal is matched
  };
}

/** Build signal-derived analysis from a matched ClassifiedSignal */
function buildSignalAnalysis(signal: ClassifiedSignal): ContractDetail["analysis"] {
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
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            {detail.code}
          </h1>
          <p className="text-sm text-muted-foreground">
            {detail.underlying} · ${detail.strike} · {detail.expiration} ·
            {detail.option_type === "C" ? "Call" : "Put"}
          </p>
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
            无信号
          </Badge>
        )}
      </div>

      {/* Price & Greeks */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">最新价</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${detail.last_price.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">
              H: ${detail.high} / L: ${detail.low}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">成交量 / 持仓</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {detail.volume?.toLocaleString() ?? "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              OI: {detail.open_interest?.toLocaleString() ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">IV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(detail.iv * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              LEAP C/P: {detail.leap_cp_ratio.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Delta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{detail.delta.toFixed(3)}</div>
            <div className="text-xs text-muted-foreground">
              Γ {detail.gamma.toFixed(4)} / θ {detail.theta.toFixed(4)} / ν{" "}
              {detail.vega.toFixed(4)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signal Info — only shown when this contract is an actual signal */}
      {isSignal && signal && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              交易信号
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={
                  signal.tier === "🔴 conviction"
                    ? "border-red-500/30 text-red-400 bg-red-500/10"
                    : signal.tier === "🟠 strong"
                    ? "border-orange-500/30 text-orange-400 bg-orange-500/10"
                    : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                }
              >
                {signal.tier}
              </Badge>
              <Badge variant="secondary">{signal.signal_type}</Badge>
              <span className="text-sm text-muted-foreground">
                Score: {signal.composite_score}
              </span>
            </div>
            <div className="rounded border border-border bg-muted/50 p-3 text-sm">
              {signal.narrative}
            </div>
            <div className="flex flex-wrap gap-2">
              {signal.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No-signal notice */}
      {!isSignal && (
        <div className="flex items-start gap-3 rounded border border-blue-500/30 bg-blue-500/5 p-4 text-sm">
          <Info className="h-5 w-5 shrink-0 text-blue-400" />
          <div>
            <div className="font-bold text-blue-400">暂无交易信号</div>
            <div className="text-muted-foreground">
              该合约当前未通过异常检测筛选。以下仅展示基础合约信息和逐笔成交数据。
            </div>
          </div>
        </div>
      )}

      {/* Signal Analysis — only shown for actual signals */}
      {isSignal && analysis && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              信号分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded bg-muted p-3 text-center">
                <div className="text-xs text-muted-foreground">重复成交</div>
                <div className="text-2xl font-bold text-red-400">
                  {analysis.repeat_count} 笔
                </div>
              </div>
              <div className="rounded bg-muted p-3 text-center">
                <div className="text-xs text-muted-foreground">高于 Ask</div>
                <div className="text-2xl font-bold text-orange-400">
                  {analysis.above_ask_count} 笔
                </div>
              </div>
              <div className="rounded bg-muted p-3 text-center">
                <div className="text-xs text-muted-foreground">Sweep 订单</div>
                <div className="text-2xl font-bold text-purple-400">
                  {analysis.sweep_detected ? "检测到" : "无"}
                </div>
              </div>
              <div className="rounded bg-muted p-3 text-center">
                <div className="text-xs text-muted-foreground">方向判定</div>
                <div
                  className={`text-2xl font-bold ${
                    analysis.direction === "BULLISH"
                      ? "text-emerald-400"
                      : analysis.direction === "BEARISH"
                      ? "text-rose-400"
                      : "text-gray-400"
                  }`}
                >
                  {analysis.direction === "BULLISH"
                    ? "做多"
                    : analysis.direction === "BEARISH"
                    ? "做空"
                    : "中性"}
                </div>
              </div>
            </div>
            <div className="rounded border border-border bg-muted/50 p-3 text-sm">
              {analysis.narrative}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Records — shown for all contracts */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            逐笔成交明细
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>时间</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>成交量</TableHead>
                  <TableHead>方向</TableHead>
                  <TableHead>标记</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.trades.map((t, i) => (
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
                    <TableCell className="font-mono">
                      {t.volume?.toLocaleString() ?? "-"}
                    </TableCell>
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
                            高于Ask
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

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-400">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <div className="font-bold">免责声明</div>
          <div className="text-muted-foreground">
            以上数据仅供研究参考。实际交易需结合实时行情和个人判断。
            {isSignal && " 信号分析基于模拟检测算法，不构成投资建议。"}
          </div>
        </div>
      </div>
    </div>
  );
}
