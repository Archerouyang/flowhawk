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
} from "recharts";

const featureGroups = {
  "Options Surface": [
    "voi_ratio",
    "premium",
    "spread_ratio",
    "iv_skew",
    "term_structure_slope",
    "put_call_ratio",
  ],
  Greeks: ["delta", "gamma", "theta", "vega", "charm", "vanna"],
  Technical: [
    "rsi_14",
    "ma_20_cross",
    "ma_50_cross",
    "atr_14",
    "bollinger_position",
    "macd_histogram",
  ],
  Sentiment: [
    "news_sentiment_score",
    "social_mention_velocity",
    "insider_buy_ratio",
    "institutional_flow",
  ],
  Macro: ["vix_level", "yield_curve_slope", "dxy_trend"],
};

const importanceData = [
  { feature: "voi_ratio", importance: 0.28 },
  { feature: "iv_rank", importance: 0.22 },
  { feature: "delta", importance: 0.18 },
  { feature: "theta_price_ratio", importance: 0.12 },
  { feature: "rsi_14", importance: 0.08 },
  { feature: "spread_ratio", importance: 0.06 },
  { feature: "news_sentiment", importance: 0.04 },
  { feature: "atr_14", importance: 0.02 },
];

export default function FeaturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">⛏️ Feature Mining</h1>
        <p className="text-sm text-muted-foreground">
          Discover and analyze predictive features
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(featureGroups).map(([group, features]) => (
          <Card key={group} className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {features.map((feat) => (
                  <span
                    key={feat}
                    className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-mono text-muted-foreground"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Feature Importance (SHAP-like)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={importanceData}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d34" />
              <XAxis
                type="number"
                stroke="#888"
                tick={{ fill: "#888", fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="feature"
                stroke="#888"
                tick={{ fill: "#888", fontSize: 12 }}
                width={100}
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
              <Bar dataKey="importance" fill="#00d4aa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
