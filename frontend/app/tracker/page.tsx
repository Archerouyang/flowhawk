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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Eye,
  Trash2,
  FileText,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
} from "lucide-react";
import {
  getTracker,
  addTracker,
  removeTracker,
  getTrackerHistory,
  type TrackedContractWithSnapshot,
  type TrackerSnapshot,
} from "@/lib/api";

function ChangeCell({
  value,
  suffix = "",
  invert = false,
}: {
  value: number | null;
  suffix?: string;
  invert?: boolean;
}) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">-</span>;
  const isPositive = value >= 0;
  const isGood = invert ? !isPositive : isPositive;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isGood ? "text-emerald-400" : "text-rose-400"
      }`}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "追踪中", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    alerted: { label: "预警", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    closed: { label: "已关闭", className: "bg-muted text-muted-foreground" },
  };
  const config = map[status] || map.active;
  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function HistoryChart({ data }: { data: TrackerSnapshot[] }) {
  if (!data.length) return null;
  const prices = data.map((d) => d.last_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * 100;
      const y = 100 - ((p - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-blue-400"
      />
    </svg>
  );
}

export default function TrackerPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<TrackedContractWithSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TrackedContractWithSnapshot | null>(null);
  const [history, setHistory] = useState<TrackerSnapshot[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadTracker();
  }, []);

  async function loadTracker() {
    setLoading(true);
    try {
      const res = await getTracker();
      setContracts(res.contracts);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(code: string) {
    await removeTracker(code);
    setContracts((prev) => prev.filter((c) => c.contract_code !== code));
  }

  async function handleViewHistory(c: TrackedContractWithSnapshot) {
    setSelected(c);
    setHistoryLoading(true);
    try {
      const res = await getTrackerHistory(c.contract_code, 30);
      setHistory(res.history);
    } finally {
      setHistoryLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading tracker...</div>
      </div>
    );
  }

  const [newCode, setNewCode] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  function parseContractCode(code: string) {
    // Format: SYMBOL + YYMMDD + C/P + STRIKE
    // e.g. AAPL261218C185
    const m = code.match(/^([A-Z]+)(\d{6})([CP])(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const [, underlying, dateStr, optionType, strikeStr] = m;
    const yy = dateStr.slice(0, 2);
    const mm = dateStr.slice(2, 4);
    const dd = dateStr.slice(4, 6);
    return {
      contract_code: code,
      underlying,
      option_type: optionType,
      strike: parseFloat(strikeStr),
      expiration: `20${yy}-${mm}-${dd}`,
    };
  }

  async function handleAdd() {
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    const parsed = parseContractCode(code);
    if (!parsed) {
      alert("合约代码格式错误，示例: AAPL261218C185");
      return;
    }
    setAdding(true);
    try {
      await addTracker({
        ...parsed,
        notes: newNotes.trim() || `手动添加追踪`,
      });
      setNewCode("");
      setNewNotes("");
      await loadTracker();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-400" />
            期权追踪器
          </h1>
          <p className="text-sm text-muted-foreground">
            持续追踪异常仓位 — {contracts.length} 个合约
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTracker}>
          <Activity className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* Add Tracker Form */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            添加追踪
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="合约代码，如 AAPL261218C185"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono placeholder:text-muted-foreground/50"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                格式: 标的 + 到期日(YYMMDD) + C/P + 行权价
              </p>
            </div>
            <div className="flex-[2]">
              <input
                type="text"
                placeholder="备注（可选），如 异常大单建仓"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={adding || !newCode.trim()}
              className="h-10 px-6"
            >
              {adding ? "添加中..." : "添加追踪"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              追踪中
            </CardTitle>
            <Eye className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {contracts.filter((c) => c.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              预警
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {contracts.filter((c) => c.status === "alerted").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              OI 增长最多
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {(() => {
                const max = contracts.reduce(
                  (best, c) =>
                    (c.oi_delta || 0) > (best.oi_delta || 0) ? c : best,
                  contracts[0]
                );
                return max ? `${max.underlying} ${max.oi_delta_pct?.toFixed(1)}%` : "-";
              })()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              OI 下降最多
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">
              {(() => {
                const min = contracts.reduce(
                  (best, c) =>
                    (c.oi_delta || 0) < (best.oi_delta || 0) ? c : best,
                  contracts[0]
                );
                return min ? `${min.underlying} ${min.oi_delta_pct?.toFixed(1)}%` : "-";
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tracker Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-400" />
            追踪列表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">暂无追踪合约</p>
              <p className="text-sm mt-1">在 Dashboard 或 Screener 页面点击"追踪"按钮添加</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>合约</TableHead>
                    <TableHead className="w-16">Type</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">最新价</TableHead>
                    <TableHead className="text-right">价变</TableHead>
                    <TableHead className="text-right">成交量</TableHead>
                    <TableHead className="text-right">量变</TableHead>
                    <TableHead className="text-right">OI</TableHead>
                    <TableHead className="text-right">OI 变化</TableHead>
                    <TableHead className="text-right">OI 变化%</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.contract_code} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <div className="font-mono font-bold">{c.contract_code}</div>
                        <div className="text-xs text-muted-foreground">{c.underlying}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            c.option_type === "C"
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                              : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                          }`}
                        >
                          {c.option_type === "C" ? "Call" : "Put"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {c.last_price?.toFixed(2) ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChangeCell value={c.price_delta ?? null} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {c.volume?.toLocaleString() ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChangeCell value={c.volume_delta ?? null} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {c.open_interest?.toLocaleString() ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChangeCell
                          value={c.oi_delta ?? null}
                          invert={c.option_type === "P"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <ChangeCell
                          value={c.oi_delta_pct ?? null}
                          suffix="%"
                          invert={c.option_type === "P"}
                        />
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground truncate">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 shrink-0" />
                          {c.notes || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewHistory(c)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-400 hover:text-rose-300"
                            onClick={() => handleRemove(c.contract_code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              {selected?.contract_code} — 历史追踪
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-8 text-center text-muted-foreground">加载中...</div>
          ) : (
            <div className="space-y-4">
              {/* Price chart */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  价格走势
                </div>
                <HistoryChart data={history} />
              </div>

              {/* History table */}
              <div className="overflow-x-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>日期</TableHead>
                      <TableHead className="text-right">价格</TableHead>
                      <TableHead className="text-right">成交量</TableHead>
                      <TableHead className="text-right">OI</TableHead>
                      <TableHead className="text-right">OI 变化</TableHead>
                      <TableHead className="text-right">IV</TableHead>
                      <TableHead className="text-right">成交额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.snapshot_date} className="border-border">
                        <TableCell className="font-mono text-xs">{h.snapshot_date}</TableCell>
                        <TableCell className="text-right font-mono">{h.last_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{h.volume.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{h.open_interest.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <ChangeCell value={h.oi_change} />
                        </TableCell>
                        <TableCell className="text-right font-mono">{(h.iv * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-mono">${h.premium.toFixed(1)}M</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
