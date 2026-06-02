"use client";

import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Flame,
  TrendingUp,
  Activity,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  getContractRanking,
  getContractStats,
  type ContractEntry,
  type ContractDashboardStats,
} from "@/lib/api";

type CategoryKey = "dragon_tiger" | "individual" | "etf";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  dragon_tiger: "期权龙虎榜",
  individual: "个股期权",
  etf: "ETF 期权",
};

function ChangeBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isUp ? "text-red-400" : "text-green-400"
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
          ? "border-red-500/30 text-red-400 bg-red-500/10"
          : "border-green-500/30 text-green-400 bg-green-500/10"
      }`}
    >
      {isCall ? "认购" : "认沽"}
    </Badge>
  );
}

function VolumeBadge({ vsAvg }: { vsAvg: number }) {
  if (vsAvg >= 10)
    return (
      <span className="text-xs font-bold text-red-400">
        🔥 {vsAvg.toFixed(1)}x
      </span>
    );
  if (vsAvg >= 5)
    return (
      <span className="text-xs font-bold text-orange-400">
        ⚡ {vsAvg.toFixed(1)}x
      </span>
    );
  if (vsAvg >= 2)
    return (
      <span className="text-xs text-yellow-400">
        📈 {vsAvg.toFixed(1)}x
      </span>
    );
  return <span className="text-xs text-muted-foreground">{vsAvg.toFixed(1)}x</span>;
}

function ContractDetailDialog({
  entry,
  open,
  onClose,
}: {
  entry: ContractEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;
  const p = entry.price;
  const v = entry.volume;
  const o = entry.oi;
  const iv = entry.iv;
  const g = entry.greeks;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-lg">{entry.contract_code}</span>
            <ContractBadge type={entry.option_type} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Price */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">High</div>
              <div className="font-mono font-bold">{p.high.toFixed(2)}</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Low</div>
              <div className="font-mono font-bold">{p.low.toFixed(2)}</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Last</div>
              <div className="font-mono font-bold">{p.last.toFixed(2)}</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Change</div>
              <div className="font-mono font-bold">
                <ChangeBadge pct={p.change_pct} />
              </div>
            </div>
          </div>

          {/* Volume & OI */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="font-mono font-bold">{v.total.toLocaleString()}</div>
              <VolumeBadge vsAvg={v.vs_avg} />
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Premium</div>
              <div className="font-mono font-bold">${v.premium.toFixed(2)}M</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">OI Change</div>
              <div className="font-mono font-bold">
                {o.change > 0 ? "+" : ""}
                {o.change.toLocaleString()}
              </div>
            </div>
          </div>

          {/* IV */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">IV</div>
              <div className="font-mono font-bold">{(iv.current * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">IV Change</div>
              <div className="font-mono font-bold">
                <ChangeBadge pct={iv.change_pct} />
              </div>
            </div>
          </div>

          {/* Greeks */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Delta</div>
              <div className="font-mono font-bold">{g.delta.toFixed(3)}</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Gamma</div>
              <div className="font-mono font-bold">{g.gamma.toFixed(4)}</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Theta</div>
              <div className="font-mono font-bold">{g.theta.toFixed(4)}</div>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">Vega</div>
              <div className="font-mono font-bold">{g.vega.toFixed(4)}</div>
            </div>
          </div>

          {/* Narrative */}
          <div className="rounded border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            {entry.narrative}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
            <TableHead className="text-right">持仓</TableHead>
            <TableHead className="text-right">IV</TableHead>
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
              <TableCell className="text-right font-mono text-muted-foreground">
                {entry.oi.total.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {(entry.iv.current * 100).toFixed(0)}%
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

export default function DashboardPage() {
  const [stats, setStats] = useState<ContractDashboardStats | null>(null);
  const [rankings, setRankings] = useState<Record<CategoryKey, ContractEntry[]>>({
    dragon_tiger: [],
    individual: [],
    etf: [],
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContractEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, dt, ind, etf] = await Promise.all([
      getContractStats(),
      getContractRanking("dragon_tiger"),
      getContractRanking("individual"),
      getContractRanking("etf"),
    ]);
    setStats(s);
    setRankings({
      dragon_tiger: dt.rankings,
      individual: ind.rankings,
      etf: etf.rankings,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSelect = (entry: ContractEntry) => {
    setSelected(entry);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading rankings...</div>
      </div>
    );
  }

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
            全市场期权成交量排行 — {stats?.date}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
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
              <TrendingUp className="h-4 w-4 text-green-400" />
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
              <TrendingUp className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">
                {stats.call_put_ratio.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Movers */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.top_big_mover && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">🚀 最大波动</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg">
                    {stats.top_big_mover.contract_code}
                  </span>
                  <ChangeBadge pct={stats.top_big_mover.price.change_pct} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.top_big_mover.narrative}
                </div>
              </CardContent>
            </Card>
          )}
          {stats.top_volume_spike && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">🔥 量能异动</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg">
                    {stats.top_volume_spike.contract_code}
                  </span>
                  <VolumeBadge vsAvg={stats.top_volume_spike.volume.vs_avg} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.top_volume_spike.narrative}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rankings Tabs */}
      <Tabs defaultValue="dragon_tiger" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dragon_tiger">期权龙虎榜 Top 25</TabsTrigger>
          <TabsTrigger value="individual">个股期权</TabsTrigger>
          <TabsTrigger value="etf">ETF 期权</TabsTrigger>
        </TabsList>

        {(["dragon_tiger", "individual", "etf"] as CategoryKey[]).map((cat) => (
          <TabsContent key={cat} value={cat}>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {CATEGORY_LABELS[cat]} — {rankings[cat].length} 条
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RankingTable
                  entries={rankings[cat]}
                  onSelect={handleSelect}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <ContractDetailDialog
        entry={selected}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
