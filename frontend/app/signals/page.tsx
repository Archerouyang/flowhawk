"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Signal {
  symbol: string;
  optionType: string;
  strike: number;
  expiration: string;
  dte: number;
  lastPrice: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  voiRatio: number;
  leapsScore: number;
  thetaPriceRatio: number;
  bid: number;
  ask: number;
  rationale: string[];
}

const mockSignals: Signal[] = [
  {
    symbol: "AAPL",
    optionType: "C",
    strike: 185.0,
    expiration: "2026-12-18",
    dte: 202,
    lastPrice: 12.5,
    delta: 0.72,
    gamma: 0.012,
    theta: -0.035,
    vega: 0.18,
    iv: 0.32,
    voiRatio: 4.2,
    leapsScore: 0.85,
    thetaPriceRatio: 0.0028,
    bid: 12.2,
    ask: 12.8,
    rationale: [
      "Volume/OI spike (4.2x) indicates unusual activity",
      "Low time decay (0.28%) — theta works in our favor",
      "Strong delta (0.72) captures directional move",
      "Tight spread (4.8%) ensures clean entry",
    ],
  },
  {
    symbol: "TSLA",
    optionType: "C",
    strike: 220.0,
    expiration: "2026-09-19",
    dte: 112,
    lastPrice: 18.3,
    delta: 0.68,
    gamma: 0.015,
    theta: -0.042,
    vega: 0.22,
    iv: 0.45,
    voiRatio: 5.1,
    leapsScore: 0.92,
    thetaPriceRatio: 0.0023,
    bid: 18.0,
    ask: 18.6,
    rationale: [
      "Volume/OI spike (5.1x) — highest in universe",
      "Very low theta/price (0.23%) for this IV level",
      "Solid delta (0.68) with room for expansion",
      "Spread within tolerance (3.3%)",
    ],
  },
];

function GreeksRadar({ signal }: { signal: Signal }) {
  const greeks = [
    { label: "Delta", value: Math.abs(signal.delta), max: 1 },
    { label: "Gamma", value: signal.gamma * 100, max: 2 },
    { label: "Theta", value: Math.abs(signal.theta) * 100, max: 5 },
    { label: "Vega", value: signal.vega, max: 0.5 },
  ];

  return (
    <div className="relative h-48 w-48">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r * 40}
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
        ))}
        {/* Axis lines */}
        {greeks.map((_, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={50 + Math.cos(angle) * 40}
              y2={50 + Math.sin(angle) * 40}
              stroke="var(--border)"
              strokeWidth="0.5"
            />
          );
        })}
        {/* Data polygon */}
        <polygon
          points={greeks
            .map((g, i) => {
              const angle = (i * 90 - 90) * (Math.PI / 180);
              const r = (g.value / g.max) * 40;
              return `${50 + Math.cos(angle) * r},${50 + Math.sin(angle) * r}`;
            })
            .join(" ")}
          fill="rgba(0, 212, 170, 0.2)"
          stroke="#00d4aa"
          strokeWidth="1.5"
        />
        {/* Labels */}
        {greeks.map((g, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const x = 50 + Math.cos(angle) * 46;
          const y = 50 + Math.sin(angle) * 46;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#888"
              fontSize="6"
            >
              {g.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function SignalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🎯 Trade Signals</h1>
        <p className="text-sm text-muted-foreground">
          LEAPS recommendations from the full pipeline
        </p>
      </div>

      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="cards">Signal Cards</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          {mockSignals.map((signal, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_200px_1fr]">
                  {/* Header */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">
                          {signal.symbol} {signal.optionType} ${signal.strike.toFixed(1)}
                        </h3>
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
                          Score: {signal.leapsScore.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Exp: {signal.expiration} | DTE: {signal.dte}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Last Price</p>
                        <p className="text-lg font-semibold">${signal.lastPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spread</p>
                        <p className="text-lg font-semibold">
                          {(((signal.ask - signal.bid) / signal.lastPrice) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Theta/Price</p>
                        <p className="text-lg font-semibold">
                          {(signal.thetaPriceRatio * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Greeks Radar */}
                  <div className="flex flex-col items-center justify-center">
                    <p className="mb-2 text-xs text-muted-foreground">Greeks Profile</p>
                    <GreeksRadar signal={signal} />
                  </div>

                  {/* Rationale & Risk */}
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">Signal Rationale</p>
                      <ul className="space-y-1">
                        {signal.rationale.map((r, j) => (
                          <li key={j} className="text-sm text-muted-foreground">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium">Risk Profile</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-md bg-muted p-2 text-center">
                          <p className="text-xs text-muted-foreground">Max Loss</p>
                          <p className="font-semibold">${signal.lastPrice.toFixed(2)}</p>
                        </div>
                        <div className="rounded-md bg-muted p-2 text-center">
                          <p className="text-xs text-muted-foreground">Breakeven</p>
                          <p className="font-semibold">
                            ${(signal.strike + signal.lastPrice).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted p-2 text-center">
                          <p className="text-xs text-muted-foreground">Delta</p>
                          <p className="font-semibold">{signal.delta.toFixed(3)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="table">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <p className="text-muted-foreground">Table view coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
