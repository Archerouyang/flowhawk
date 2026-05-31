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

const icData = [
  { factor: "V/OI", ic: 0.08, std: 0.15 },
  { factor: "IV_Rank", ic: 0.06, std: 0.12 },
  { factor: "Delta", ic: 0.04, std: 0.10 },
  { factor: "Theta/Price", ic: 0.03, std: 0.08 },
  { factor: "RSI", ic: 0.02, std: 0.09 },
  { factor: "ATR", ic: 0.01, std: 0.07 },
  { factor: "Spread", ic: -0.02, std: 0.11 },
];

export default function FactorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🔬 Factor Research</h1>
        <p className="text-sm text-muted-foreground">
          IC analysis and correlation research
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">
            Information Coefficient (IC) vs 1-Day Forward Return
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={icData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d34" />
              <XAxis
                dataKey="factor"
                stroke="#888"
                tick={{ fill: "#888", fontSize: 12 }}
              />
              <YAxis
                stroke="#888"
                tick={{ fill: "#888", fontSize: 12 }}
                domain={[-0.05, 0.1]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1d24",
                  border: "1px solid #2a2d34",
                  borderRadius: "6px",
                }}
                labelStyle={{ color: "#e8e8e8" }}
              />
              <Bar dataKey="ic" radius={[4, 4, 0, 0]}>
                {icData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.ic >= 0 ? "#00d4aa" : "#ff6b6b"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Interpretation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Positive IC means the factor predicts future returns. V/OI shows the
            strongest predictive power (IC = 0.08) with moderate stability (std =
            0.15).
          </p>
          <p>
            Factors with IC &gt; 0.02 are considered predictive. The spread factor
            shows negative IC, suggesting wider spreads predict lower returns.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
