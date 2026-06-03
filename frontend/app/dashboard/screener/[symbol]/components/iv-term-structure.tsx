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
} from "recharts";
import { TrendingUp } from "lucide-react";

interface ChainEntry {
  expiration: string;
  iv: number;
}

interface Props {
  chain: ChainEntry[];
}

export default function IVTermStructure({ chain }: Props) {
  // Group by expiration, compute avg IV
  const grouped = new Map<string, number[]>();
  for (const e of chain) {
    const arr = grouped.get(e.expiration) || [];
    arr.push(e.iv);
    grouped.set(e.expiration, arr);
  }

  const data = Array.from(grouped.entries())
    .map(([exp, ivs]) => ({
      exp: exp.slice(5), // "06-20"
      iv: Number((ivs.reduce((a, b) => a + b, 0) / ivs.length).toFixed(2)),
    }))
    .sort((a, b) => a.exp.localeCompare(b.exp));

  const maxIv = Math.max(...data.map((d) => d.iv), 0.01);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          IV 期限结构
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="exp"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#334155" }}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                domain={[0, Math.ceil(maxIv * 120) / 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, "Avg IV"]}
              />
              <Bar dataKey="iv" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      i === 0
                        ? "#3b82f6"
                        : data[i].iv > data[i - 1].iv
                        ? "#ef4444"
                        : "#22c55e"
                    }
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
