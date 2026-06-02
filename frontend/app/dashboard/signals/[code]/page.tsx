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
  };
}

function generateMockDetail(code: string): ContractDetail {
  // Parse code like "AAPL261218C185"
  const underlying = code.replace(/\d+$/, "").replace(/[CP]\d+$/, "").replace(/\d{6}$/, "");
  const isCall = code.includes("C");

  return {
    code,
    underlying,
    strike: 185,
    expiration: "2026-12-18",
    option_type: isCall ? "C" : "P",
    last_price: 12.5,
    high: 13.2,
    low: 11.8,
    change_pct: 5.2,
    volume: 34200,
    open_interest: 12500,
    iv: 0.32,
    delta: 0.72,
    gamma: 0.012,
    theta: -0.035,
    vega: 0.18,
    leap_cp_ratio: 4.33,
    trades: [
      { time: "10:05:23", price: 12.45, volume: 500, side: "BUY", flags: ["ASK"] },
      { time: "10:07:15", price: 12.48, volume: 500, side: "BUY", flags: ["ASK"] },
      { time: "10:09:42", price: 12.50, volume: 500, side: "BUY", flags: ["ABOVE_ASK"] },
      { time: "10:12:08", price: 12.52, volume: 500, side: "BUY", flags: ["ABOVE_ASK", "SWEEP"] },
      { time: "10:15:33", price: 12.55, volume: 500, side: "BUY", flags: ["ABOVE_ASK"] },
      { time: "10:18:19", price: 12.50, volume: 500, side: "BUY", flags: ["ASK"] },
      { time: "10:22:45", price: 12.48, volume: 300, side: "SELL", flags: [] },
      { time: "10:25:12", price: 12.52, volume: 500, side: "BUY", flags: ["ABOVE_ASK", "SWEEP"] },
      { time: "10:28:56", price: 12.55, volume: 500, side: "BUY", flags: ["ABOVE_ASK"] },
      { time: "10:31:22", price: 12.58, volume: 500, side: "BUY", flags: ["ABOVE_ASK", "SWEEP"] },
      { time: "10:35:48", price: 12.50, volume: 200, side: "SELL", flags: [] },
      { time: "10:38:15", price: 12.60, volume: 500, side: "BUY", flags: ["ABOVE_ASK"] },
      { time: "10:42:33", price: 12.55, volume: 500, side: "BUY", flags: ["ASK"] },
      { time: "10:45:09", price: 12.52, volume: 400, side: "BUY", flags: ["ASK"] },
      { time: "10:48:27", price: 12.50, volume: 300, side: "SELL", flags: [] },
      { time: "10:52:18", price: 12.58, volume: 500, side: "BUY", flags: ["ABOVE_ASK", "SWEEP"] },
      { time: "10:55:44", price: 12.62, volume: 500, side: "BUY", flags: ["ABOVE_ASK"] },
      { time: "10:58:11", price: 12.60, volume: 200, side: "SELL", flags: [] },
      { time: "11:02:36", price: 12.65, volume: 500, side: "BUY", flags: ["ABOVE_ASK", "SWEEP"] },
      { time: "11:05:52", price: 12.62, volume: 500, side: "BUY", flags: ["ASK"] },
    ],
    analysis: {
      is_repeated: true,
      repeat_count: 12,
      sweep_detected: true,
      above_ask_count: 8,
      direction: "BULLISH",
      confidence: 87,
      narrative:
        "12 笔 500 手重复买单，其中 8 笔高于 ask 成交，检测到 5 次 sweep 订单。主动做多特征明显。",
    },
  };
}

function matchSignal(code: string, signals: ClassifiedSignal[]): ClassifiedSignal | null {
  // code format: SYMBOLyymmddC/Pstrike (e.g. AAPL261218C185)
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

  const a = detail.analysis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            {detail.code}
          </h1>
          <p className="text-sm text-muted-foreground">
            {detail.underlying} · ${detail.strike} · {detail.expiration} ·
            {detail.option_type === "C" ? "认购" : "认沽"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            a.direction === "BULLISH"
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              : "border-rose-500/30 text-rose-400 bg-rose-500/10"
          }
        >
          {a.direction} {a.confidence}%
        </Badge>
      </div>

      {/* Price & Greeks */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">最新价</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${detail.last_price}</div>
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
              {detail.volume.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              OI: {detail.open_interest.toLocaleString()}
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

      {/* Signal Info */}
      {signal && (
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

      {/* Analysis Summary */}
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
                {a.repeat_count} 笔
              </div>
            </div>
            <div className="rounded bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground">高于 Ask</div>
              <div className="text-2xl font-bold text-orange-400">
                {a.above_ask_count} 笔
              </div>
            </div>
            <div className="rounded bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground">Sweep 订单</div>
              <div className="text-2xl font-bold text-purple-400">
                {a.sweep_detected ? "检测到" : "无"}
              </div>
            </div>
            <div className="rounded bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground">方向判定</div>
              <div
                className={`text-2xl font-bold ${
                  a.direction === "BULLISH"
                    ? "text-emerald-400"
                    : a.direction === "BEARISH"
                    ? "text-rose-400"
                    : "text-gray-400"
                }`}
              >
                {a.direction === "BULLISH"
                  ? "做多"
                  : a.direction === "BEARISH"
                  ? "做空"
                  : "中性"}
              </div>
            </div>
          </div>
          <div className="rounded border border-border bg-muted/50 p-3 text-sm">
            {a.narrative}
          </div>
        </CardContent>
      </Card>

      {/* Trade Records */}
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
                    <TableCell className="font-mono">${t.price.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">
                      {t.volume.toLocaleString()}
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
                        {t.side === "BUY" ? "买入" : "卖出"}
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

      {/* Warning */}
      <div className="flex items-start gap-3 rounded border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-400">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <div className="font-bold">免责声明</div>
          <div className="text-muted-foreground">
            以上分析基于模拟数据，仅供研究参考。实际交易需结合实时行情和个人判断。
            重复成交检测标准为：同一合约在短时间内（30分钟内）出现 ≥3
            次成交量相同或相近（±10%）的成交。
          </div>
        </div>
      </div>
    </div>
  );
}
