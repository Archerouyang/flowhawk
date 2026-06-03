"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRightLeft, Layers, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface LargeTrade {
  time: string;
  direction: "Buy" | "Sell";
  price: number;
  size: number;
  premium: number;
  type: string;
  exchange: string;
  contract_code: string;
}

interface Props {
  trades: LargeTrade[];
}

const typeIcon: Record<string, React.ReactNode> = {
  Block: <Layers className="h-3.5 w-3.5" />,
  Sweep: <Zap className="h-3.5 w-3.5" />,
  Iceberg: <ArrowRightLeft className="h-3.5 w-3.5" />,
  "Above Ask": <ArrowUpCircle className="h-3.5 w-3.5" />,
};

export default function TradeTimeline({ trades }: Props) {
  const sorted = [...trades].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          大单异动时间线（单笔 $100K+）
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative pl-6 pr-4 py-4">
          {/* Timeline line */}
          <div className="absolute left-8 top-4 bottom-4 w-px bg-border" />

          <div className="space-y-3">
            {sorted.map((t, i) => (
              <div key={i} className="relative flex items-start gap-4">
                {/* Dot on timeline */}
                <div
                  className={`relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 border-2 ${
                    t.direction === "Buy"
                      ? "border-emerald-500 bg-emerald-500/20"
                      : "border-rose-500 bg-rose-500/20"
                  }`}
                />

                {/* Time */}
                <div className="w-12 shrink-0 text-xs font-mono text-muted-foreground pt-1">
                  {t.time}
                </div>

                {/* Card */}
                <div
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/30 ${
                    t.direction === "Buy"
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-rose-500/20 bg-rose-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs shrink-0">
                        {t.contract_code}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1 shrink-0 ${
                          t.direction === "Buy"
                            ? "border-emerald-500/30 text-emerald-400"
                            : "border-rose-500/30 text-rose-400"
                        }`}
                      >
                        {t.direction === "Buy" ? (
                          <ArrowUpCircle className="h-3 w-3 mr-0.5" />
                        ) : (
                          <ArrowDownCircle className="h-3 w-3 mr-0.5" />
                        )}
                        {t.direction}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1 shrink-0">
                        {typeIcon[t.type] || null}
                        <span className="ml-1">{t.type}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="font-mono text-blue-400">
                        ${t.premium.toFixed(2)}M
                      </span>
                      <span className="text-muted-foreground">{t.exchange}</span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      数量: <span className="font-mono">{t.size.toLocaleString()}</span>
                    </span>
                    <span>
                      成交价: <span className="font-mono">${t.price.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
