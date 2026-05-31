"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const strategies = [
  {
    name: "V/OI Breakout",
    description:
      "Buy LEAPS calls when volume/open-interest ratio exceeds 3x with tight bid-ask spread.",
    signals: ["volume", "open_interest", "spread"],
    status: "Active",
  },
  {
    name: "IV Rank Reversal",
    description:
      "Enter when implied volatility rank drops below 20th percentile for high-conviction setups.",
    signals: ["iv_rank", "iv_percentile", "historical_vol"],
    status: "In Development",
  },
  {
    name: "Delta-Weighted Momentum",
    description:
      "Weight position size by delta and underlying momentum (RSI + MA cross).",
    signals: ["delta", "rsi", "ma_cross", "atr"],
    status: "Planned",
  },
  {
    name: "Multi-Factor Ensemble",
    description:
      "Combine V/OI, IV, technical, and sentiment factors into a composite score.",
    signals: ["voi_ratio", "iv_rank", "rsi", "news_sentiment", "earnings"],
    status: "Planned",
  },
];

const statusColors: Record<string, string> = {
  Active: "bg-primary/20 text-primary",
  "In Development": "bg-yellow-500/20 text-yellow-500",
  Planned: "bg-muted text-muted-foreground",
};

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🧠 Strategies</h1>
        <p className="text-sm text-muted-foreground">
          Compare and manage trading strategies
        </p>
      </div>

      <div className="space-y-4">
        {strategies.map((s) => (
          <Card key={s.name} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{s.name}</h3>
                    <Badge className={statusColors[s.status]}>{s.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {s.signals.map((sig) => (
                      <Badge
                        key={sig}
                        variant="outline"
                        className="border-border text-xs"
                      >
                        {sig}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  {s.status === "Active" && (
                    <Button size="sm" variant="outline">
                      Run Backtest
                    </Button>
                  )}
                  {s.status === "In Development" && (
                    <Button size="sm" variant="outline">
                      Continue Dev
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Create New Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Strategy builder coming in next release...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
