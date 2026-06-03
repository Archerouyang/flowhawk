"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { getSignals } from "@/lib/api";
import type { ClassifiedSignal, SignalType } from "@/lib/api";
import {
  Activity,
  BarChart3,
  Filter,
  TrendingUp,
  Search,
  SlidersHorizontal,
  Clock,
  X,
  Target,
  Zap,
  Eye,
} from "lucide-react";

/* ─── Signal Type Configuration ─── */

interface SignalTypeConfig {
  label: string;
  icon: string;
  color: string;
  barColor: string;
  bgColor: string;
}

const SIGNAL_CONFIG: Record<SignalType, SignalTypeConfig> = {
  smart_money: {
    label: "Smart Money",
    icon: "🔮",
    color: "text-purple-400",
    barColor: "bg-purple-500",
    bgColor: "bg-purple-500/10",
  },
  sweep: {
    label: "Sweep",
    icon: "⚡",
    color: "text-orange-400",
    barColor: "bg-orange-500",
    bgColor: "bg-orange-500/10",
  },
  block: {
    label: "Block",
    icon: "🧱",
    color: "text-blue-400",
    barColor: "bg-blue-500",
    bgColor: "bg-blue-500/10",
  },
  dark_pool: {
    label: "Dark Pool",
    icon: "🌑",
    color: "text-slate-400",
    barColor: "bg-slate-500",
    bgColor: "bg-slate-500/10",
  },
  first_timer: {
    label: "First Timer",
    icon: "🆕",
    color: "text-emerald-400",
    barColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  index_hedge: {
    label: "Hedge",
    icon: "🛡️",
    color: "text-cyan-400",
    barColor: "bg-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  gamma_squeeze: {
    label: "Gamma",
    icon: "🚀",
    color: "text-red-400",
    barColor: "bg-red-500",
    bgColor: "bg-red-500/10",
  },
  sector_rotation: {
    label: "Rotation",
    icon: "🔄",
    color: "text-yellow-400",
    barColor: "bg-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
};

const FILTER_PILLS: { value: SignalType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "smart_money", label: "Smart💰" },
  { value: "sweep", label: "Sweep⚡" },
  { value: "block", label: "Block🧱" },
  { value: "dark_pool", label: "Dark🌑" },
  { value: "gamma_squeeze", label: "Gamma🚀" },
  { value: "index_hedge", label: "Hedge🛡️" },
  { value: "sector_rotation", label: "Rotate🔄" },
  { value: "first_timer", label: "New🆕" },
];

/* ─── Helpers ─── */

function toContractCode(s: ClassifiedSignal): string {
  const exp = s.expiration.replace(/-/g, "").slice(2);
  return `${s.symbol}${exp}${s.option_type}${s.strike}`;
}

function relativeTime(timestamp?: string): string {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function tierColor(tier: string): string {
  switch (tier) {
    case "🔴 conviction":
      return "text-red-400";
    case "🟠 strong":
      return "text-orange-400";
    case "🟡 monitor":
      return "text-yellow-400";
    default:
      return "text-slate-400";
  }
}

function tierBg(tier: string): string {
  switch (tier) {
    case "🔴 conviction":
      return "bg-red-500/10 border-red-500/20";
    case "🟠 strong":
      return "bg-orange-500/10 border-orange-500/20";
    case "🟡 monitor":
      return "bg-yellow-500/10 border-yellow-500/20";
    default:
      return "bg-slate-500/10 border-slate-500/20";
  }
}

/* ─── Components ─── */

function ScoreRing({ score }: { score: number }) {
  const size = 48; /* HARDCODED */
  const stroke = 4; /* HARDCODED */
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100); /* HARDCODED */
  const offset = circumference - (progress / 100) * circumference;

  const strokeColor =
    score >= 85 /* HARDCODED */
      ? "stroke-emerald-400"
      : score >= 70 /* HARDCODED */
        ? "stroke-amber-400"
        : "stroke-slate-400";

  return (
    <div className="relative shrink-0">
      <svg width={size} height={size} className="-rotate-90">
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
            transition: "stroke-dashoffset 0.5s ease",
            filter: score >= 85 /* HARDCODED */ ? "drop-shadow(0 0 4px rgba(52,211,153,0.3))" : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{score}</span>
      </div>
    </div>
  );
}

function SignalCard({
  signal,
  onSelect,
  onSymbolClick,
}: {
  signal: ClassifiedSignal;
  onSelect: (s: ClassifiedSignal) => void;
  onSymbolClick?: (symbol: string) => void;
}) {
  const config = SIGNAL_CONFIG[signal.signal_type];
  const isCall = signal.option_type === "C"; /* HARDCODED */

  return (
    <Card
      className="group relative border-border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:bg-muted/20 hover:shadow-md"
      onClick={() => onSelect(signal)}
    >
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.barColor}`} /> /* HARDCODED */

      <CardContent className="p-3 pl-4">
        {/* Row 1: Symbol + Type + Strike | Score | Time */}
        <div className="flex items-center gap-3">
          <ScoreRing score={signal.composite_score} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="font-mono font-bold text-lg hover:text-blue-400 hover:underline transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onSymbolClick?.(signal.symbol);
                }}
              >
                {signal.symbol}
              </button>
              <Badge
                variant="outline"
                className={
                  isCall
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs" /* HARDCODED */
                    : "border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs" /* HARDCODED */
                }
              >
                {signal.option_type}
              </Badge>
              <span className="font-mono text-sm text-muted-foreground">
                ${signal.strike.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                {signal.expiration}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className={`font-medium ${config.color}`}>
                {config.icon} {config.label}
              </span>
              <span className="text-border">|</span>
              <span>{signal.sector}</span>
              <span className="text-border">|</span>
              <span>{signal.cap_type}</span>
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <div className="text-3xl font-bold">{signal.composite_score}</div>
            {signal.timestamp && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {relativeTime(signal.timestamp)}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Tags (always visible, compact) */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {signal.tags.slice(0, 3 /* HARDCODED */).map((tag, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5" /* HARDCODED */
            >
              {tag}
            </Badge>
          ))}
          {signal.tags.length > 3 /* HARDCODED */ && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{signal.tags.length - 3 /* HARDCODED */}
            </span>
          )}
        </div>

        {/* Row 3: Greeks + Metrics (always visible) */}
        <div className="mt-2.5 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 font-mono text-muted-foreground">
              <span title="Delta">Δ {signal.delta.toFixed(2)}</span>
              <span title="Gamma">Γ {signal.gamma.toFixed(3)}</span>
              <span title="Theta">Θ {signal.theta.toFixed(3)}</span>
              <span title="Vega">ν {signal.vega.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>IV {(signal.implied_volatility * 100).toFixed(1)}%</span>
              <span className="text-border">|</span>
              <span>DTE {signal.dte}</span>
              <span className="text-border">|</span>
              <span className={signal.voi_ratio >= 5 /* HARDCODED */ ? "text-orange-400 font-medium" : ""}>
                V/OI {signal.voi_ratio.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IVSparkline({ history }: { history: number[] }) {
  const vals = history.map((v) => v * 100);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  return (
    <div className="mt-2">
      <div className="flex items-end gap-0.5 h-10">
        {vals.map((v, i) => {
          const h = ((v - min) / range) * 100;
          const isCurrent = i === vals.length - 1;
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm ${isCurrent ? "bg-cyan-400" : "bg-cyan-400/30"}`}
              style={{ height: `${Math.max(h, 15)}%` }}
              title={`Day ${i + 1}: ${v.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>10d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function SignalDetailPanel({ signal, onClose }: { signal: ClassifiedSignal; onClose: () => void }) {
  const config = SIGNAL_CONFIG[signal.signal_type];
  const isCall = signal.option_type === "C";
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${config.color}`}>{config.icon}</span>
          <SheetTitle className="text-lg">
            <button
              className="hover:text-blue-400 hover:underline transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/screener/${signal.symbol}`);
              }}
            >
              {signal.symbol}
            </button>
            {' '}<span className="text-muted-foreground">{signal.option_type}${signal.strike}</span>
          </SheetTitle>
        </div>
        <SheetDescription className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              isCall
                ? "border-emerald-500/30 text-emerald-400 text-xs"
                : "border-rose-500/30 text-rose-400 text-xs"
            }
          >
            {isCall ? "Call" : "Put"}
          </Badge>
          <span className="text-muted-foreground">{signal.expiration}</span>
          <span className="text-muted-foreground">DTE {signal.dte}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto space-y-5 p-4">
        {/* Score + Tier */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold">{signal.composite_score}</div>
            <div className="text-xs text-muted-foreground mt-1">Composite Score</div>
          </div>
          <div className="flex-1">
            <Badge
              variant="outline"
              className={`text-sm px-3 py-1 ${tierBg(signal.tier)} ${tierColor(signal.tier)}`}
            >
              {signal.tier}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1.5">
              {config.icon} {config.label} Signal
            </div>
          </div>
        </div>

        <Separator />

        {/* Contract Info */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-400" />
            Contract Info
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded-md p-2.5">
              <div className="text-xs text-muted-foreground">Last Price</div>
              <div className="font-mono font-medium">${signal.last_price.toFixed(2)}</div>
            </div>
            <div className="bg-muted/50 rounded-md p-2.5">
              <div className="text-xs text-muted-foreground">V/OI Ratio</div>
              <div className={`font-mono font-medium ${signal.voi_ratio >= 5 ? "text-orange-400" : ""}`}>
                {signal.voi_ratio.toFixed(1)}x
              </div>
            </div>
            <div className="bg-muted/50 rounded-md p-2.5">
              <div className="text-xs text-muted-foreground">LEAPS Score</div>
              <div className="font-mono font-medium">{signal.leaps_score.toFixed(2)}</div>
            </div>
            <div className="bg-muted/50 rounded-md p-2.5">
              <div className="text-xs text-muted-foreground">Theta/Price</div>
              <div className="font-mono font-medium">{signal.theta_price_ratio.toFixed(4)}</div>
            </div>
          </div>
        </div>

        {/* Greeks — clean numeric cards */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-400" />
            Greeks
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Delta", value: signal.delta.toFixed(2), color: "text-blue-400", desc: "Direction" },
              { label: "Gamma", value: signal.gamma.toFixed(3), color: "text-purple-400", desc: "Convexity" },
              { label: "Theta", value: signal.theta.toFixed(3), color: "text-orange-400", desc: "Time decay" },
              { label: "Vega", value: signal.vega.toFixed(2), color: "text-emerald-400", desc: "Volatility" },
            ].map((g) => (
              <div key={g.label} className="bg-muted/50 rounded-md p-2.5 text-center">
                <div className={`text-lg font-mono font-bold ${g.color}`}>{g.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{g.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* IV — current + history sparkline */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Implied Volatility
          </h3>
          <div className="bg-muted/50 rounded-md p-3">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-2xl font-mono font-bold">{(signal.implied_volatility * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Current IV</div>
              </div>
              {signal.iv_percentile !== undefined && (
                <div className="text-right">
                  <div className={`text-lg font-mono font-bold ${signal.iv_percentile >= 80 ? "text-red-400" : signal.iv_percentile >= 50 ? "text-amber-400" : "text-emerald-400"}`}>
                    {signal.iv_percentile}%
                  </div>
                  <div className="text-xs text-muted-foreground">{signal.iv_percentile >= 80 ? "Elevated" : signal.iv_percentile >= 50 ? "Above avg" : "Below avg"}</div>
                </div>
              )}
            </div>
            {/* Sparkline */}
            {signal.iv_history && signal.iv_history.length > 0 && (
              <IVSparkline history={signal.iv_history} />
            )}
          </div>
        </div>

        {/* Narrative */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-cyan-400" />
            Signal Narrative
          </h3>
          <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground leading-relaxed">
            {signal.narrative}
          </div>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {signal.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onClose();
              setTimeout(() => router.push(`/dashboard/screener/${signal.symbol}`), 150);
            }}
          >
            <Search className="h-4 w-4 mr-2" />
            Research {signal.symbol}
          </Button>
          <Button
            className="w-full"
            onClick={() => router.push(`/dashboard/signals/${toContractCode(signal)}`)}
          >
            <Target className="h-4 w-4 mr-2" />
            View Full Analysis
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<ClassifiedSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<SignalType | "all">("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterSector, setFilterSector] = useState("all");
  const [filterDte, setFilterDte] = useState("all");
  const [sortBy, setSortBy] = useState("score_desc");
  const [searchSymbol, setSearchSymbol] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("symbol") || "";
    }
    return "";
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<ClassifiedSignal | null>(null);

  useEffect(() => {
    getSignals()
      .then((res) => setSignals(res.signals))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    return {
      total: signals.length,
      byType: Object.fromEntries(
        Object.keys(SIGNAL_CONFIG).map((type) => [
          type,
          signals.filter((s) => s.signal_type === type).length,
        ])
      ) as Record<SignalType, number>,
      conviction: signals.filter((s) => s.tier === "🔴 conviction").length,
      strong: signals.filter((s) => s.tier === "🟠 strong").length,
      monitor: signals.filter((s) => s.tier === "🟡 monitor").length,
    };
  }, [signals]);

  const filteredSignals = useMemo(() => {
    let result = [...signals];

    if (searchSymbol.trim()) {
      const q = searchSymbol.trim().toUpperCase();
      result = result.filter((s) => s.symbol.toUpperCase().includes(q));
    }
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
  }, [signals, searchSymbol, filterType, filterTier, filterSector, filterDte, sortBy]);

  const activeFilterCount = [
    filterType !== "all",
    filterTier !== "all",
    filterSector !== "all",
    filterDte !== "all",
    searchSymbol.trim() !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setFilterType("all");
    setFilterTier("all");
    setFilterSector("all");
    setFilterDte("all");
    setSearchSymbol("");
  }

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Signals</h1>
          <p className="text-sm text-muted-foreground">
            {signals.length} signals classified and scored
          </p>
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </Button>
        )}
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

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_PILLS.map((pill) => {
          const isActive = filterType === pill.value;
          const config =
            pill.value !== "all" ? SIGNAL_CONFIG[pill.value as SignalType] : null;
          return (
            <button
              key={pill.value}
              onClick={() => setFilterType(pill.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border ${
                isActive
                  ? config
                    ? `${config.bgColor} ${config.color} border-current`
                    : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {pill.label}
              {pill.value !== "all" && stats.byType[pill.value as SignalType] > 0 && (
                <span className="ml-1.5 text-xs opacity-70">
                  {stats.byType[pill.value as SignalType]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + Advanced Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol (e.g. AAPL)"
            className="h-9 rounded-md border border-border bg-card pl-9 pr-3 text-sm w-56"
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? "bg-muted" : ""}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          Advanced
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 px-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
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

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg border border-border">
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
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredSignals.length} of {signals.length} signals
      </div>

      {/* Signal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSignals.map((sig) => (
          <SignalCard
            key={`${sig.symbol}-${sig.strike}-${sig.expiration}`}
            signal={sig}
            onSelect={setSelectedSignal}
            onSymbolClick={(symbol) => router.push(`/dashboard/screener/${symbol}`)}
          />
        ))}
      </div>

      {filteredSignals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No signals match the selected filters.</p>
          {activeFilterCount > 0 && (
            <Button variant="link" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Detail Panel */}
      <Sheet
        open={selectedSignal !== null}
        onOpenChange={(open: boolean) => !open && setSelectedSignal(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] sm:max-w-[480px] p-0"
        >
          {selectedSignal && <SignalDetailPanel signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
