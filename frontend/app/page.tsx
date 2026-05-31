import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, BarChart3, Zap } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Options anomaly signal overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Anomalies Today
            </CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">--</div>
            <p className="text-xs text-muted-foreground">Run scan to populate</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg V/OI Ratio
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">--</div>
            <p className="text-xs text-muted-foreground">Volume / Open Interest</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Sector
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">--</div>
            <p className="text-xs text-muted-foreground">By anomaly count</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Signals Generated
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">--</div>
            <p className="text-xs text-muted-foreground">LEAPS recommendations</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • <a href="/screener" className="text-primary hover:underline">Run Screener</a> — Scan for options anomalies
            </p>
            <p className="text-sm text-muted-foreground">
              • <a href="/signals" className="text-primary hover:underline">View Signals</a> — See LEAPS recommendations
            </p>
            <p className="text-sm text-muted-foreground">
              • <a href="/backtest" className="text-primary hover:underline">Backtest Strategy</a> — Validate historically
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { stage: "Options Anomaly Detection", status: "Ready" },
              { stage: "Stock Technical Filter", status: "Ready" },
              { stage: "LEAPS Selection", status: "Ready" },
              { stage: "News Sentiment (Deep Research)", status: "Planned" },
            ].map((item) => (
              <div key={item.stage} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.stage}</span>
                <span
                  className={`text-xs font-medium ${
                    item.status === "Ready"
                      ? "text-primary"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
