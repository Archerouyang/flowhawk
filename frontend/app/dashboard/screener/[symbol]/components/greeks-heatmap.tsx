"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface ChainEntry {
  contract_code: string;
  option_type: string;
  strike: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface Props {
  chain: ChainEntry[];
  underlyingPrice: number;
}

function heatColor(value: number, min: number, max: number, type: "delta" | "gamma" | "theta" | "vega"): string {
  if (max === min) return "bg-slate-800";
  const norm = Math.min(Math.max((value - min) / (max - min), 0), 1);

  if (type === "delta") {
    // Blue for positive, red for negative
    return value >= 0
      ? `rgba(34,197,94,${0.1 + norm * 0.5})` // green
      : `rgba(239,68,68,${0.1 + norm * 0.5})`; // red
  }
  if (type === "gamma") {
    // Higher gamma = more yellow/orange
    return `rgba(234,179,8,${0.1 + norm * 0.6})`;
  }
  if (type === "theta") {
    // Theta is usually negative; more negative = deeper red
    return `rgba(239,68,68,${0.1 + norm * 0.5})`;
  }
  // vega
  return `rgba(59,130,246,${0.1 + norm * 0.5})`;
}

function textColor(value: number, type: "delta" | "gamma" | "theta" | "vega"): string {
  if (type === "delta") return value >= 0 ? "text-emerald-300" : "text-rose-300";
  if (type === "gamma") return "text-yellow-300";
  if (type === "theta") return "text-rose-300";
  return "text-blue-300";
}

export default function GreeksHeatmap({ chain, underlyingPrice }: Props) {
  const sorted = [...chain].sort((a, b) => a.strike - b.strike);
  const deltas = sorted.map((c) => c.delta);
  const gammas = sorted.map((c) => c.gamma);
  const thetas = sorted.map((c) => c.theta);
  const vegas = sorted.map((c) => c.vega);

  const ranges = {
    delta: { min: Math.min(...deltas), max: Math.max(...deltas) },
    gamma: { min: Math.min(...gammas), max: Math.max(...gammas) },
    theta: { min: Math.min(...thetas), max: Math.max(...thetas) },
    vega: { min: Math.min(...vegas), max: Math.max(...vegas) },
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-400" />
          Greeks 热力图
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  合约
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  行权价
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  Delta
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  Gamma
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  Theta
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  Vega
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const isAtm = Math.abs(c.strike - underlyingPrice) < underlyingPrice * 0.02;
                return (
                  <tr
                    key={c.contract_code}
                    className={`border-b border-border/50 ${isAtm ? "bg-amber-500/5" : ""}`}
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 px-1 ${
                            c.option_type === "C"
                              ? "border-emerald-500/30 text-emerald-400"
                              : "border-rose-500/30 text-rose-400"
                          }`}
                        >
                          {c.option_type}
                        </Badge>
                        <span className="font-mono text-xs">{c.contract_code}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">
                      {isAtm && <span className="mr-1 text-amber-400">★</span>}
                      ${c.strike}
                    </td>
                    <td
                      className="px-3 py-1.5 text-center font-mono text-xs rounded-sm"
                      style={{
                        backgroundColor: heatColor(c.delta, ranges.delta.min, ranges.delta.max, "delta"),
                      }}
                    >
                      <span className={textColor(c.delta, "delta")}>{c.delta.toFixed(2)}</span>
                    </td>
                    <td
                      className="px-3 py-1.5 text-center font-mono text-xs rounded-sm"
                      style={{
                        backgroundColor: heatColor(c.gamma, ranges.gamma.min, ranges.gamma.max, "gamma"),
                      }}
                    >
                      <span className={textColor(c.gamma, "gamma")}>{c.gamma.toFixed(3)}</span>
                    </td>
                    <td
                      className="px-3 py-1.5 text-center font-mono text-xs rounded-sm"
                      style={{
                        backgroundColor: heatColor(c.theta, ranges.theta.min, ranges.theta.max, "theta"),
                      }}
                    >
                      <span className={textColor(c.theta, "theta")}>{c.theta.toFixed(3)}</span>
                    </td>
                    <td
                      className="px-3 py-1.5 text-center font-mono text-xs rounded-sm"
                      style={{
                        backgroundColor: heatColor(c.vega, ranges.vega.min, ranges.vega.max, "vega"),
                      }}
                    >
                      <span className={textColor(c.vega, "vega")}>{c.vega.toFixed(3)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
