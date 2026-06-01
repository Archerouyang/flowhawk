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
import {
  Zap,
  TrendingUp,
  BarChart3,
  Search,
  ArrowRight,
} from "lucide-react";
import { getDashboard, type DashboardSummary, type ClassifiedSignal } from "@/lib/api";

const TIER_COLORS: Record<string, string> = {
  "🔴 conviction": "bg-red-500/20 text-red-400 border-red-500/30",
  "🟠 strong": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "🟡 monitor": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "⚪ noise": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  smart_money: "🔮 Smart Money",
  first_timer: "🆕 First Timer",
  index_hedge: "🛡️ Index Hedge",
  gamma_squeeze: "🚀 Gamma Squeeze",
  sector_rotation: "🔄 Sector",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  const total = summary.total_signals;
  const conviction = summary.by_tier["🔴 conviction"] || 0;
  const strong = summary.by_tier["🟠 strong"] || 0;
  const monitor = summary.by_tier["🟡 monitor"] || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(summary.last_updated).toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          🔄 Refresh
        </Button>
      </div>

      {/* Tier KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Signals
            </CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{total}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🔴 Conviction
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{conviction}</div>
            <p className="text-xs text-muted-foreground">Highest priority</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🟠 Strong
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">{strong}</div>
            <p className="text-xs text-muted-foreground">Add to watchlist</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🟡 Monitor
            </CardTitle>
            <Search className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">{monitor}</div>
            <p className="text-xs text-muted-foreground">Track closely</p>
          </CardContent>
        </Card>
      </div>

      {/* Signal Type Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Signal Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {SIGNAL_TYPE_LABELS[type] || type}
                  </span>
                  <Badge variant="outline" className="border-border">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-between" onClick={() => window.location.href = '/screener'}>
              Run Screener <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => window.location.href = '/signals'}>
              View Signals <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Top Signals Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Top Signals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Tier</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Strike</TableHead>
                  <TableHead>Exp</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="w-[40%]">Narrative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.top_signals.map((sig: ClassifiedSignal, i: number) => (
                  <TableRow key={i} className="border-border">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TIER_COLORS[sig.tier] || "border-border"}
                      >
                        {sig.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{sig.symbol}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {SIGNAL_TYPE_LABELS[sig.signal_type] || sig.signal_type}
                      </span>
                    </TableCell>
                    <TableCell>${sig.strike.toFixed(1)}</TableCell>
                    <TableCell>{sig.expiration}</TableCell>
                    <TableCell className="font-bold">{sig.composite_score}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                      {sig.narrative}
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
