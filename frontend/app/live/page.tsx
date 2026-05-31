"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const positions = [
  {
    symbol: "AAPL",
    type: "C",
    strike: 185.0,
    exp: "2026-12-18",
    entry: 12.5,
    current: 14.2,
    qty: 10,
    daysHeld: 15,
  },
  {
    symbol: "TSLA",
    type: "C",
    strike: 220.0,
    exp: "2026-09-19",
    entry: 18.3,
    current: 15.8,
    qty: 5,
    daysHeld: 8,
  },
  {
    symbol: "NVDA",
    type: "C",
    strike: 130.0,
    exp: "2027-01-15",
    entry: 22.0,
    current: 26.5,
    qty: 8,
    daysHeld: 22,
  },
];

function generatePnLCurve() {
  const data = [];
  let pnl = 0;
  for (let i = 0; i < 30; i++) {
    pnl += (Math.random() - 0.45) * 1000;
    data.push({ day: i, pnl: Math.round(pnl) });
  }
  return data;
}

export default function LiveTradingPage() {
  const totalPnL = positions.reduce(
    (sum, p) => sum + (p.current - p.entry) * p.qty * 100,
    0
  );
  const totalInvested = positions.reduce(
    (sum, p) => sum + p.entry * p.qty * 100,
    0
  );
  const pnlPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">💼 Live Trading</h1>
        <p className="text-sm text-muted-foreground">
          Track positions and P&L in real-time
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">Open Positions</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ${totalInvested.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Invested</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div
              className={`text-2xl font-bold ${
                totalPnL >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              ${totalPnL.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Unrealized P&L</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {positions.filter((p) => p.current > p.entry).length} /{" "}
              {positions.filter((p) => p.current <= p.entry).length}
            </div>
            <p className="text-xs text-muted-foreground">Winning / Losing</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {positions.map((p, i) => {
          const pnl = (p.current - p.entry) * p.qty * 100;
          const pnlPct = ((p.current - p.entry) / p.entry) * 100;
          const isWin = pnl >= 0;

          return (
            <Card key={i} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="grid items-center gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                  <div>
                    <div className="text-lg font-semibold">
                      {p.symbol} {p.type} ${p.strike.toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Exp: {p.exp} | Held: {p.daysHeld}d
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Qty</p>
                    <p className="font-semibold">{p.qty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entry</p>
                    <p className="font-semibold">${p.entry.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="font-semibold">${p.current.toFixed(2)}</p>
                  </div>
                  <div
                    className={`rounded-md border p-2 text-center ${
                      isWin
                        ? "border-primary/30 bg-primary/10"
                        : "border-destructive/30 bg-destructive/10"
                    }`}
                  >
                    <p
                      className={`font-bold ${
                        isWin ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {isWin ? "📈" : "📉"} ${pnl.toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        isWin ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {pnlPct >= 0 ? "+" : ""}
                      {pnlPct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Cumulative P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={generatePnLCurve()}>
              <defs>
                <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={totalPnL >= 0 ? "#00d4aa" : "#ff6b6b"}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={totalPnL >= 0 ? "#00d4aa" : "#ff6b6b"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d34" />
              <XAxis
                dataKey="day"
                stroke="#888"
                tick={{ fill: "#888", fontSize: 12 }}
              />
              <YAxis
                stroke="#888"
                tick={{ fill: "#888", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1d24",
                  border: "1px solid #2a2d34",
                  borderRadius: "6px",
                }}
                labelStyle={{ color: "#e8e8e8" }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={totalPnL >= 0 ? "#00d4aa" : "#ff6b6b"}
                fillOpacity={1}
                fill="url(#colorPnL)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
