"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSignals } from "@/lib/api";
import type { ClassifiedSignal } from "@/lib/api";
import { Activity, BarChart3, Filter, TrendingUp } from "lucide-react";

const SIGNAL_TYPE_ICONS: Record<string, string> = {
  smart_money: "🔮",
  first_timer: "🆕",
  index_hedge: "🛡️",
  gamma_squeeze: "🚀",
  sector_rotation: "🔄",
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  smart_money: "Smart Money",
  first_timer: "First Timer",
  index_hedge: "Hedge",
  gamma_squeeze: "Gamma Squeeze",
  sector_rotation: "Sector Rotation",
};

function toContractCode(s: ClassifiedSignal): string {
  const exp = s.expiration.replace(/-/g, "").slice(2);
  return `${s.symbol}${exp}${s.option_type}${s.strike}`;
}

function ScoreRing({ score }: { score: number }) {
  const size = 36;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  const strokeColor =
    score >= 85 ? "stroke-emerald-400" : score >= 70 ? "stroke-amber-400" : "stroke-slate-400";

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-current opacity-10"
        style={{ strokeWidth: stroke }}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={strokeColor}
        style={{
          strokeWidth: stroke,
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          strokeLinecap: "round",
          transition: "stroke-dashoffset 0.3s ease",
        }}
      />
    </svg>
  );
}

function SignalCard({
  signal,
  onSelect,
}: {
  signal: ClassifiedSignal;
  onSelect: (s: ClassifiedSignal) => void;
}) {
  const isCall = signal.option_type === "C";

  return (
    <Card
      className="group border-border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:bg-muted/20"
      onClick={() => onSelect(signal)}
    >
      <CardContent className="p-3">
        {/* Layer 1: Compact row (always visible) */}
        <div className="flex items-center gap-3">
          <ScoreRing score={signal.composite_score} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg">{signal.symbol}</span>
              <Badge
                variant="outline"
                className={
                  isCall
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"
                    : "border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs"
                }
              >
                {signal.option_type}
              </Badge>
              <span className="font-mono text-sm text-muted-foreground">
                ${signal.strike.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span>
                {SIGNAL_TYPE_ICONS[signal.signal_type] || "🔹"} {signal.signal_type}
              </span>
              <span>•</span>
              <span>{signal.sector}</span>
              <span>•</span>
              <span>{signal.cap_type}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-bold">{signal.composite_score}</div>
          </div>
        </div>

        {/* Layer 2: Narrative + Tags (hover) */}
        <div className="mt-0 max-h-0 overflow-hidden group-hover:max-h-24 group-hover:mt-3 transition-all duration-200">
          <div className="rounded-md bg-muted/50 p-2 text-sm text-muted-foreground leading-relaxed">
            {signal.narrative}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {signal.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Layer 3: Greeks + Metrics (hover) */}
        <div className="mt-0 max-h-0 overflow-hidden group-hover:max-h-20 group-hover:mt-3 transition-all duration-200">
          <div className="flex items-center gap-4 font-mono text-xs">
            <span>Δ {signal.delta.toFixed(3)}</span>
            <span>Γ {signal.gamma.toFixed(3)}</span>
            <span>Θ {signal.theta.toFixed(3)}</span>
            <span>ν {signal.vega.toFixed(3)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
            <span>IV {(signal.implied_volatility * 100).toFixed(1)}%</span>
            <span>•</span>
            <span>DTE {signal.dte}</span>
            <span>•</span>
            <span>V/OI {signal.voi_ratio.toFixed(1)}x</span>
            <span>•</span>
            <span>${signal.last_price.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<ClassifiedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterSector, setFilterSector] = useState("all");
  const [filterDte, setFilterDte] = useState("all");
  const [sortBy, setSortBy] = useState("score_desc");

  useEffect(() => {
    getSignals()
      .then((res) => setSignals(res.signals))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (sig: ClassifiedSignal) => {
    router.push(`/dashboard/signals/${toContractCode(sig)}`);
  };

  const stats = useMemo(() => {
    return {
      total: signals.length,
      conviction: signals.filter((s) => s.tier === "🔴 conviction").length,
      strong: signals.filter((s) => s.tier === "🟠 strong").length,
      monitor: signals.filter((s) => s.tier === "🟡 monitor").length,
    };
  }, [signals]);

  const filteredSignals = useMemo(() => {
    let result = [...signals];

    if (filterType !== "all") {
      result = result.filter((s) => s.signal_type === filterType);
    }
    if (filterTier !== "all") {
      result = result.filter((s) => s.tier === filterTier);
    }
    if (filterSector !== "all") {
      result = result.filter((s) => s.sector === filterSector);
    }
    if (filterDte !== "all") {
      result = result.filter((s) => {
        const dte = s.dte;
        switch (filterDte) {
          case "<30":
            return dte < 30;
          case "30-90":
            return dte >= 30 && dte <= 90;
          case "90-180":
            return dte > 90 && dte <= 180;
          case ">180":
            return dte > 180;
          default:
            return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "score_desc":
          return b.composite_score - a.composite_score;
        case "score_asc":
          return a.composite_score - b.composite_score;
        case "dte_asc":
          return a.dte - b.dte;
        case "dte_desc":
          return b.dte - a.dte;
        case "voi_desc":
          return b.voi_ratio - a.voi_ratio;
        default:
          return 0;
      }
    });

    return result;
  }, [signals, filterType, filterTier, filterSector, filterDte, sortBy]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading signals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trade Signals</h1>
        <p className="text-sm text-muted-foreground">
          {signals.length} signals classified and scored
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Signals</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-2xl font-bold">{stats.conviction}</div>
              <div className="text-xs text-muted-foreground">Conviction</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-2xl font-bold">{stats.strong}</div>
              <div className="text-xs text-muted-foreground">Strong</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <div className="text-2xl font-bold">{stats.monitor}</div>
              <div className="text-xs text-muted-foreground">Monitor</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="smart_money">Smart Money</option>
          <option value="first_timer">First Timer</option>
          <option value="index_hedge">Index Hedge</option>
          <option value="gamma_squeeze">Gamma Squeeze</option>
          <option value="sector_rotation">Sector Rotation</option>
        </select>

        <select
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
        >
          <option value="all">All Tiers</option>
          <option value="🔴 conviction">Conviction</option>
          <option value="🟠 strong">Strong</option>
          <option value="🟡 monitor">Monitor</option>
          <option value="⚪ noise">Noise</option>
        </select>

        <select
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
        >
          <option value="all">All Sectors</option>
          <option value="Technology">Technology</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Industrials">Industrials</option>
          <option value="Consumer Discretionary">Consumer Discretionary</option>
          <option value="Financials">Financials</option>
          <option value="Communication Services">Communication Services</option>
        </select>

        <select
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          value={filterDte}
          onChange={(e) => setFilterDte(e.target.value)}
        >
          <option value="all">All DTE</option>
          <option value="<30">&lt;30</option>
          <option value="30-90">30-90</option>
          <option value="90-180">90-180</option>
          <option value=">180">&gt;180</option>
        </select>

        <select
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="score_desc">Score: High → Low</option>
          <option value="score_asc">Score: Low → High</option>
          <option value="dte_asc">DTE: Short → Long</option>
          <option value="dte_desc">DTE: Long → Short</option>
          <option value="voi_desc">V/OI: High → Low</option>
        </select>
      </div>

      {/* Signal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSignals.map((sig) => (
          <SignalCard
            key={`${sig.symbol}-${sig.strike}-${sig.expiration}`}
            signal={sig}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {filteredSignals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No signals match the selected filters.
        </div>
      )}
    </div>
  );
}
