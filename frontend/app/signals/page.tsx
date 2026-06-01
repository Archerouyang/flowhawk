"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSignals, type ClassifiedSignal } from "@/lib/api";

const TIER_COLORS: Record<string, string> = {
  "🔴 conviction": "bg-red-500/20 text-red-400 border-red-500/30",
  "🟠 strong": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "🟡 monitor": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "⚪ noise": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const SIGNAL_TYPE_ICONS: Record<string, string> = {
  smart_money: "🔮",
  first_timer: "🆕",
  index_hedge: "🛡️",
  gamma_squeeze: "🚀",
  sector_rotation: "🔄",
};

function SignalCard({ signal }: { signal: ClassifiedSignal }) {
  const greeks = [
    { label: "Delta", value: signal.delta },
    { label: "Gamma", value: signal.gamma },
    { label: "Theta", value: signal.theta },
    { label: "Vega", value: signal.vega },
  ];

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">
                  {signal.symbol} {signal.option_type} ${signal.strike.toFixed(1)}
                </h3>
                <Badge
                  variant="outline"
                  className={TIER_COLORS[signal.tier] || "border-border"}
                >
                  {signal.tier}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {SIGNAL_TYPE_ICONS[signal.signal_type] || "🔹"}{" "}
                  {signal.signal_type}
                </span>
                <span>•</span>
                <span>
                  {signal.asset_type} | {signal.cap_type} | {signal.sector}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {signal.composite_score}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>

          {/* Narrative */}
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {signal.narrative}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {signal.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-4 gap-3">
            {greeks.map((g) => (
              <div key={g.label} className="rounded-md bg-muted p-2 text-center">
                <div className="text-xs text-muted-foreground">{g.label}</div>
                <div className="font-semibold">{g.value.toFixed(3)}</div>
              </div>
            ))}
          </div>

          {/* Contract Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Expiration</span>
              <div className="font-medium">{signal.expiration}</div>
            </div>
            <div>
              <span className="text-muted-foreground">DTE</span>
              <div className="font-medium">{signal.dte}</div>
            </div>
            <div>
              <span className="text-muted-foreground">IV</span>
              <div className="font-medium">{(signal.implied_volatility * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Risk */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-md border border-border bg-card p-2 text-center">
              <div className="text-xs text-muted-foreground">Last Price</div>
              <div className="font-semibold">${signal.last_price.toFixed(2)}</div>
            </div>
            <div className="rounded-md border border-border bg-card p-2 text-center">
              <div className="text-xs text-muted-foreground">V/OI</div>
              <div className="font-semibold">{signal.voi_ratio.toFixed(1)}x</div>
            </div>
            <div className="rounded-md border border-border bg-card p-2 text-center">
              <div className="text-xs text-muted-foreground">Theta/Price</div>
              <div className="font-semibold">
                {(signal.theta_price_ratio * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<ClassifiedSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSignals(["AAPL", "TSLA", "NVDA", "MSFT", "AMZN"])
      .then((res) => setSignals(res.signals))
      .finally(() => setLoading(false));
  }, []);

  const byType: Record<string, ClassifiedSignal[]> = {};
  for (const s of signals) {
    byType[s.signal_type] = byType[s.signal_type] || [];
    byType[s.signal_type].push(s);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🎯 Trade Signals</h1>
        <p className="text-sm text-muted-foreground">
          {signals.length} signals classified and scored
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all">
            All ({signals.length})
          </TabsTrigger>
          <TabsTrigger value="smart_money">
            🔮 Smart Money ({byType["smart_money"]?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="first_timer">
            🆕 First Timer ({byType["first_timer"]?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="index_hedge">
            🛡️ Hedge ({byType["index_hedge"]?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="gamma_squeeze">
            🚀 Gamma ({byType["gamma_squeeze"]?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {signals.map((sig, i) => (
            <SignalCard key={i} signal={sig} />
          ))}
        </TabsContent>

        {Object.entries(byType).map(([type, list]) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {list.map((sig, i) => (
              <SignalCard key={i} signal={sig} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
