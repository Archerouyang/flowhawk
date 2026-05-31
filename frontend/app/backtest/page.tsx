"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const strategies = [
  "V/OI Breakout",
  "IV Rank Reversal",
  "Delta-Weighted Momentum",
  "Multi-Factor",
];

function generateEquityCurve(days: number) {
  const data = [];
  let equity = 100000;
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    const change = (Math.random() - 0.48) * 2000;
    equity += change;
    data.push({
      date: date.toISOString().split("T")[0],
      equity: Math.round(equity),
      drawdown: Math.round(((equity - 100000) / 100000) * 100),
    });
  }
  return data;
}

export default function BacktestPage() {
  const [hasRun, setHasRun] = useState(false);
  const [data, setData] = useState<any[]>([]);

  const handleRun = () => {
    setHasRun(true);
    setData(generateEquityCurve(90));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📊 Backtest</h1>
        <p className="text-sm text-muted-foreground">
          Validate strategy performance historically
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Config */}
        <Card className="border-border bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Strategy</label>
              <Select defaultValue={strategies[0]}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Capital ($)</label>
              <Input type="number" defaultValue={100000} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Positions</label>
              <Input type="number" defaultValue={3} />
            </div>

            <Button onClick={handleRun} className="w-full">
              ▶️ Run Backtest
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {hasRun && (
            <>
              <div className="grid gap-4 sm:grid-cols-5">
                {[
                  { label: "Total Return", value: "+12.4%" },
                  { label: "Max Drawdown", value: "-8.2%" },
                  { label: "Sharpe Ratio", value: "1.34" },
                  { label: "Win Rate", value: "58.3%" },
                  { label: "Trades", value: "47" },
                ].map((metric) => (
                  <Card key={metric.label} className="border-border bg-card">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d34" />
                      <XAxis
                        dataKey="date"
                        stroke="#888"
                        tick={{ fill: "#888", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#888"
                        tick={{ fill: "#888", fontSize: 12 }}
                        domain={["dataMin - 5000", "dataMax + 5000"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1d24",
                          border: "1px solid #2a2d34",
                          borderRadius: "6px",
                        }}
                        labelStyle={{ color: "#e8e8e8" }}
                        itemStyle={{ color: "#00d4aa" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#00d4aa"
                        fillOpacity={1}
                        fill="url(#colorEquity)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {!hasRun && (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground">
                  Configure parameters and click Run Backtest
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
