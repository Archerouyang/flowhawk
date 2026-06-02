"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Flame,
  TrendingUp,
  Activity,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Target,
} from "lucide-react";
import {
  getContractStats,
  getSignals,
  type ContractEntry,
  type ContractDashboardStats,
  type ClassifiedSignal,
} from "@/lib/api";

type CategoryKey = "dragon_tiger" | "individual" | "etf";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  dragon_tiger: "总榜",
  individual: "个股",
  etf: "ETF",
};

function ChangeBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isUp ? "text-emerald-400" : "text-rose-400"
      }`}
    >
      {isUp ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function ContractBadge({ type }: { type: string }) {
  const isCall = type === "C";
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        isCall
          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          : "border-rose-500/30 text-rose-400 bg-rose-500/10"
      }`}
    >
      {isCall ? "Call" : "Put"}
    </Badge>
  );
}

function VolumeBadge({ vsAvg }: { vsAvg: number }) {
  if (vsAvg >= 10)
    return (
      <span className="text-xs font-bold text-red-400">🔥 {vsAvg.toFixed(1)}x</span>
    );
  if (vsAvg >= 5)
    return (
      <span className="text-xs font-bold text-orange-400">
        ⚡ {vsAvg.toFixed(1)}x
      </span>
    );
  if (vsAvg >= 2)
    return (
      <span className="text-xs text-yellow-400">📈 {vsAvg.toFixed(1)}x</span>
    );
  return <span className="text-xs text-muted-foreground">{vsAvg.toFixed(1)}x</span>;
}

function RankingTable({
  entries,
  onSelect,
}: {
  entries: ContractEntry[];
  onSelect: (e: ContractEntry) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-10">#</TableHead>
            <TableHead>合约</TableHead>
            <TableHead className="w-16">类型</TableHead>
            <TableHead className="text-right">最新价</TableHead>
            <TableHead className="text-right">涨跌幅</TableHead>
            <TableHead className="text-right">成交量</TableHead>
            <TableHead className="text-right">量能</TableHead>
            <TableHead className="text-right">成交额</TableHead>
            <TableHead className="text-right">LEAP C/P</TableHead>
            <TableHead className="text-right">Delta</TableHead>
            <TableHead>异动说明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.contract_code}
              className="border-border cursor-pointer hover:bg-muted/30"
              onClick={() => onSelect(entry)}
            >
              <TableCell className="font-mono text-muted-foreground">
                {entry.rank}
              </TableCell>
              <TableCell>
                <div className="font-mono font-bold">{entry.contract_code}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.underlying} · ${entry.strike} · {entry.expiration}
                </div>
              </TableCell>
              <TableCell>
                <ContractBadge type={entry.option_type} />
              </TableCell>
              <TableCell className="text-right font-mono">
                {entry.price.last.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                <ChangeBadge pct={entry.price.change_pct} />
              </TableCell>
              <TableCell className="text-right font-mono">
                {entry.volume.total.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <VolumeBadge vsAvg={entry.volume.vs_avg} />
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                ${entry.volume.premium.toFixed(1)}M
              </TableCell>
              <TableCell className="text-right font-mono">
                {entry.leap_cp_ratio > 50 ? (
                  <span className="text-emerald-400">{entry.leap_cp_ratio.toFixed(1)}</span>
                ) : entry.leap_cp_ratio > 2 ? (
                  <span className="text-amber-400">{entry.leap_cp_ratio.toFixed(1)}</span>
                ) : (
                  <span className="text-muted-foreground">{entry.leap_cp_ratio.toFixed(1)}</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {entry.greeks.delta.toFixed(2)}
              </TableCell>
              <TableCell className="max-w-xs text-xs text-muted-foreground truncate">
                {entry.narrative}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function toContractCode(s: ClassifiedSignal): string {
  const exp = s.expiration.replace(/-/g, "").slice(2);
  return `${s.symbol}${exp}${s.option_type}${s.strike}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ContractDashboardStats | null>(null);
  const [signals, setSignals] = useState<ClassifiedSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getContractStats(), getSignals()]).then(([s, sig]) => {
      if (cancelled) return;
      setStats(s);
      setSignals(sig.signals);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([getContractStats(), getSignals()]).then(([s, sig]) => {
      setStats(s);
      setSignals(sig.signals);
      setLoading(false);
    });
  };

  const handleSelect = (entry: ContractEntry) => {
    router.push(`/dashboard/signals/${entry.contract_code}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading rankings...</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <Flame className="inline h-6 w-6 text-orange-500 mr-2" />
            期权龙虎榜
          </h1>
          <p className="text-sm text-muted-foreground">
            全市场期权成交量排行 — {stats.date}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总合约数
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {stats.total_contracts.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总成交量
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {(stats.total_volume / 10000).toFixed(0)}万
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总成交额
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ${stats.total_premium.toFixed(1)}M
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Call/Put 比
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {stats.call_put_ratio.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signals Summary */}
      {signals.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-400" />
                今日信号 — {signals.length} 条
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/signals")}
              >
                查看全部 →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {signals.slice(0, 6).map((sig) => (
                <button
                  key={`${sig.symbol}-${sig.strike}-${sig.expiration}`}
                  onClick={() => router.push(`/dashboard/signals/${toContractCode(sig)}`)}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-mono font-bold">{sig.symbol}</span>
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
                  <span className="text-muted-foreground">${sig.strike}</span>
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
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Volume Rankings */}
      <Tabs defaultValue="dragon_tiger" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dragon_tiger">总榜 Top 25</TabsTrigger>
          <TabsTrigger value="individual">个股 Top 25</TabsTrigger>
          <TabsTrigger value="etf">ETF Top 25</TabsTrigger>
        </TabsList>

        {(["dragon_tiger", "individual", "etf"] as CategoryKey[]).map((cat) => (
          <TabsContent key={cat} value={cat}>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {CATEGORY_LABELS[cat]} 成交量龙虎榜 — {stats[cat].length} 条
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RankingTable entries={stats[cat]} onSelect={handleSelect} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Premium Rankings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            成交额龙虎榜 Top 25
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <RankingTable entries={stats.premium} onSelect={handleSelect} />
        </CardContent>
      </Card>
    </div>
  );
}
