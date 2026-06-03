"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface ChainEntry {
  strike: number;
  volume: number;
  option_type: string;
}

interface Props {
  chain: ChainEntry[];
  underlyingPrice: number;
}

export default function VolumeProfile({ chain, underlyingPrice }: Props) {
  // Aggregate volume by strike (sum calls + puts)
  const grouped = new Map<number, { volume: number; callVol: number; putVol: number }>();
  for (const e of chain) {
    const existing = grouped.get(e.strike) || { volume: 0, callVol: 0, putVol: 0 };
    existing.volume += e.volume;
    if (e.option_type === "C") existing.callVol += e.volume;
    else existing.putVol += e.volume;
    grouped.set(e.strike, existing);
  }

  const data = Array.from(grouped.entries())
    .map(([strike, v]) => ({
      strike: `$${strike}`,
      strikeNum: strike,
      volume: v.volume,
      callVol: v.callVol,
      putVol: v.putVol,
    }))
    .sort((a, b) => a.strikeNum - b.strikeNum);

  const maxVol = Math.max(...data.map((d) => d.volume), 1);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          成交量分布（按行权价）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="strike"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#334155" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#334155" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(v, name) => {
                  const label = name === "callVol" ? "Call" : name === "putVol" ? "Put" : "Total";
                  return [Number(v).toLocaleString(), label];
                }}
              />
              <ReferenceLine
                x={`$${Math.round(underlyingPrice / 5) * 5}`}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: "ATM",
                  position: "top",
                  fill: "#f59e0b",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="callVol" stackId="a" radius={[2, 2, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.volume > maxVol * 0.7 ? "#22c55e" : "#22c55e99"}
                  />
                ))}
              </Bar>
              <Bar dataKey="putVol" stackId="a" radius={[2, 2, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.volume > maxVol * 0.7 ? "#ef4444" : "#ef444499"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
