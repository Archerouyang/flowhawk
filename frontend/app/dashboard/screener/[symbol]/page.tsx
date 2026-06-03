"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Zap,
  BarChart3,
} from "lucide-react";
import { MOCK_CLASSIFIED_SIGNALS } from "@/lib/api";

interface LargeTrade {
  time: string;
  direction: "Buy" | "Sell";
  price: number;
  size: number;
  premium: number;
  type: "Block" | "Sweep" | "Iceberg" | "Above Ask";
  exchange: string;
  contract_code: string;
  option_type: string;
  strike: number;
  expiration: string;
}

interface ChainEntry {
  contract_code: string;
  option_type: string;
  strike: number;
  expiration: string;
  last_price: number;
  change_pct: number;
  volume: number;
  vs_avg: number;
  oi: number;
  delta: number;
  iv: number;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 9301;
  return x - Math.floor(x);
}

function generateMockTrades(symbol: string): LargeTrade[] {
  const count = 8 + Math.floor(seededRandom(symbol.charCodeAt(0)) * 12);
  const trades: LargeTrade[] = [];
  const types: LargeTrade["type"][] = ["Block", "Sweep", "Iceberg", "Above Ask"];
  const exchanges = ["CBOE", "NYSE", "NASDAQ", "BATS", "ISE"];
  const expiries = ["2026-06-20", "2026-07-18", "2026-08-15", "2026-09-19", "2026-12-18"];
  const basePrice = 50 + seededRandom(symbol.charCodeAt(0)) * 500;

  for (let i = 0; i < count; i++) {
    const seed = symbol.charCodeAt(0) * 100 + i * 17;
    const isBuy = seededRandom(seed) > 0.35;
    const size = 500 + Math.floor(seededRandom(seed + 1) * 4500);
    const price = 1 + seededRandom(seed + 2) * 25;
    const premium = (size * price * 100) / 1000000;
    const hour = 9 + Math.floor(seededRandom(seed + 3) * 7);
    const minute = Math.floor(seededRandom(seed + 4) * 60);
    const typeIdx = Math.floor(seededRandom(seed + 5) * types.length);

    const isCall = seededRandom(seed + 7) > 0.35;
    const strike = Math.round(basePrice * (0.85 + seededRandom(seed + 8) * 0.3) / 5) * 5;
    const expiry = expiries[Math.floor(seededRandom(seed + 9) * expiries.length)];
    const expShort = expiry.replace(/-/g, "").slice(2);

    trades.push({
      time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      direction: isBuy ? "Buy" : "Sell",
      price: Number(price.toFixed(2)),
      size,
      premium: Number(premium.toFixed(2)),
      type: types[typeIdx],
      exchange: exchanges[Math.floor(seededRandom(seed + 6) * exchanges.length)],
      contract_code: `${symbol}${expShort}${isCall ? "C" : "P"}${strike}`,
      option_type: isCall ? "C" : "P",
      strike,
      expiration: expiry,
    });
  }

  // Sort by time (chronological)
  return trades.sort((a, b) => a.time.localeCompare(b.time));
}

function generateMockChain(symbol: string): ChainEntry[] {
  const count = 10 + Math.floor(seededRandom(symbol.charCodeAt(1)) * 10);
  const entries: ChainEntry[] = [];
  const basePrice = 50 + seededRandom(symbol.charCodeAt(0)) * 500;
  const expiries = ["2026-06-20", "2026-07-18", "2026-08-15", "2026-09-19", "2026-12-18"];

  for (let i = 0; i < count; i++) {
    const seed = symbol.charCodeAt(0) * 200 + i * 31;
    const isCall = seededRandom(seed) > 0.3;
    const strike = Math.round(basePrice * (0.8 + seededRandom(seed + 1) * 0.5) / 5) * 5;
    const expiry = expiries[Math.floor(seededRandom(seed + 2) * expiries.length)];
    const expShort = expiry.replace(/-/g, "").slice(2);
    const price = 0.5 + seededRandom(seed + 3) * 30;
    const change = (seededRandom(seed + 4) - 0.35) * 20;
    const vol = 1200 + Math.floor(seededRandom(seed + 5) * 25000);
    const vsAvg = 1.5 + seededRandom(seed + 6) * 15;

    entries.push({
      contract_code: `${symbol}${expShort}${isCall ? "C" : "P"}${strike}`,
      option_type: isCall ? "C" : "P",
      strike,
      expiration: expiry,
      last_price: Number(price.toFixed(2)),
      change_pct: Number(change.toFixed(1)),
      volume: vol,
      vs_avg: Number(vsAvg.toFixed(1)),
      oi: Math.floor(vol * (0.3 + seededRandom(seed + 7))),
      delta: Number((isCall ? 0.5 + seededRandom(seed + 8) * 0.4 : -0.5 - seededRandom(seed + 8) * 0.4).toFixed(2)),
      iv: Number((0.2 + seededRandom(seed + 9) * 0.4).toFixed(2)),
    });
  }

  return entries.sort((a, b) => b.volume - a.volume);
}

function ChangeBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isUp ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

export default function SymbolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase() || "";

  const trades = useMemo(() => generateMockTrades(symbol), [symbol]);
  const chain = useMemo(() => generateMockChain(symbol), [symbol]);
  const signals = useMemo(
    () => MOCK_CLASSIFIED_SIGNALS.filter((s: { symbol: string }) => s.symbol === symbol),
    [symbol]
  );

  const totalTradePremium = trades.reduce((s, t) => s + t.premium, 0);
  const buyCount = trades.filter((t) => t.direction === "Buy").length;
  const sellCount = trades.filter((t) => t.direction === "Sell").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{symbol}</h1>
          <p className="text-sm text-muted-foreground">
            个股期权大单异动 & 成交量总异动
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
          ← 返回 Dashboard
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">大单成交笔数</div>
            <div className="text-2xl font-bold">{trades.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">大单总成交额</div>
            <div className="text-2xl font-bold text-blue-400">${totalTradePremium.toFixed(1)}M</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Buy / Sell</div>
            <div className="text-2xl font-bold">
              <span className="text-emerald-400">{buyCount}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-rose-400">{sellCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">活跃期权合约</div>
            <div className="text-2xl font-bold text-purple-400">{chain.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Signal Discovery */}
      {signals.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-400" />
              信号发掘 — {signals.length} 条
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {signals.map((sig: { symbol: string; expiration: string; option_type: string; strike: number; tier: string; composite_score: number; signal_type: string }) => (
                <button
                  key={`${sig.symbol}-${sig.strike}-${sig.expiration}`}
                  onClick={() => router.push(`/dashboard/signals/${sig.symbol}${sig.expiration.replace(/-/g, "").slice(2)}${sig.option_type}${sig.strike}`)}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <Badge
                    variant="outline"
                    className={
                      sig.option_type === "C"
                        ? "border-emerald-500/30 text-emerald-400 text-xs"
                        : "border-rose-500/30 text-rose-400 text-xs"
                    }
                  >
                    {sig.option_type}
                  </Badge>
                  <span className="font-mono">${sig.strike}</span>
                  <Badge
                    variant="secondary"
                    className={
                      sig.tier === "🔴 conviction"
                        ? "bg-red-500/20 text-red-400"
                        : sig.tier === "🟠 strong"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }
                  >
                    {sig.composite_score}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{sig.signal_type}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Large Trade Anomaly */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            大单异动（单笔 $100K+）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>时间</TableHead>
                  <TableHead>合约</TableHead>
                  <TableHead>方向</TableHead>
                  <TableHead className="text-right">成交价</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>交易所</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="font-mono text-sm">{t.time}</TableCell>
                    <TableCell className="font-mono font-bold text-sm">
                      {t.contract_code}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          t.direction === "Buy"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"
                            : "border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs"
                        }
                      >
                        {t.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${t.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{t.size.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-blue-400">
                      ${t.premium.toFixed(2)}M
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.exchange}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Option Chain — Volume Anomaly */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            成交量总异动（期权链）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>合约</TableHead>
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead className="text-right">最新价</TableHead>
                  <TableHead className="text-right">涨跌幅</TableHead>
                  <TableHead className="text-right">成交量</TableHead>
                  <TableHead className="text-right">量能</TableHead>
                  <TableHead className="text-right">持仓量</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead className="text-right">IV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chain.map((e, i) => (
                  <TableRow
                    key={`${e.contract_code}-${i}`}
                    className="border-border cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`/dashboard/signals/${e.contract_code}`)}
                  >
                    <TableCell>
                      <div className="font-mono font-bold text-sm">{e.contract_code}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          e.option_type === "C"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"
                            : "border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs"
                        }
                      >
                        {e.option_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${e.last_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <ChangeBadge pct={e.change_pct} />
                    </TableCell>
                    <TableCell className="text-right font-mono">{e.volume.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {e.vs_avg >= 10 ? (
                        <span className="text-xs font-bold text-red-400">🔥 {e.vs_avg.toFixed(1)}x</span>
                      ) : e.vs_avg >= 5 ? (
                        <span className="text-xs font-bold text-orange-400">⚡ {e.vs_avg.toFixed(1)}x</span>
                      ) : e.vs_avg >= 2 ? (
                        <span className="text-xs text-yellow-400">📈 {e.vs_avg.toFixed(1)}x</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{e.vs_avg.toFixed(1)}x</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {e.oi.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {e.delta.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {(e.iv * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
