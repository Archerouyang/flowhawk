"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScreenerResult {
  symbol: string;
  optionType: string;
  strike: number;
  expiration: string;
  lastPrice: number;
  volume: number;
  openInterest: number;
  voiRatio: number;
  delta: number;
  iv: number;
  anomalyScore: number;
}

const mockResults: ScreenerResult[] = [
  {
    symbol: "AAPL",
    optionType: "C",
    strike: 185.0,
    expiration: "2026-12-18",
    lastPrice: 12.5,
    volume: 3420,
    openInterest: 12500,
    voiRatio: 4.2,
    delta: 0.72,
    iv: 0.32,
    anomalyScore: 0.85,
  },
  {
    symbol: "TSLA",
    optionType: "C",
    strike: 220.0,
    expiration: "2026-09-19",
    lastPrice: 18.3,
    volume: 5600,
    openInterest: 8900,
    voiRatio: 5.1,
    delta: 0.68,
    iv: 0.45,
    anomalyScore: 0.92,
  },
  {
    symbol: "NVDA",
    optionType: "C",
    strike: 130.0,
    expiration: "2027-01-15",
    lastPrice: 22.0,
    volume: 8900,
    openInterest: 15600,
    voiRatio: 3.8,
    delta: 0.75,
    iv: 0.38,
    anomalyScore: 0.78,
  },
  {
    symbol: "MSFT",
    optionType: "C",
    strike: 420.0,
    expiration: "2026-11-20",
    lastPrice: 28.5,
    volume: 2100,
    openInterest: 7800,
    voiRatio: 3.5,
    delta: 0.70,
    iv: 0.25,
    anomalyScore: 0.71,
  },
  {
    symbol: "AMZN",
    optionType: "C",
    strike: 195.0,
    expiration: "2026-10-17",
    lastPrice: 15.2,
    volume: 4500,
    openInterest: 11200,
    voiRatio: 6.2,
    delta: 0.65,
    iv: 0.35,
    anomalyScore: 0.88,
  },
];

export default function ScreenerPage() {
  const [minVoi, setMinVoi] = useState([3.0]);
  const [minPremium, setMinPremium] = useState(100000);
  const [minDte, setMinDte] = useState([180]);
  const [deltaRange, setDeltaRange] = useState([0.5, 0.85]);
  const [results, setResults] = useState<ScreenerResult[]>(mockResults);
  const [hasRun, setHasRun] = useState(false);

  const handleScan = () => {
    setHasRun(true);
    // In real implementation, call API here
    const filtered = mockResults.filter(
      (r) =>
        r.voiRatio >= minVoi[0] &&
        r.delta >= deltaRange[0] &&
        r.delta <= deltaRange[1]
    );
    setResults(filtered);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🔍 Options Screener</h1>
        <p className="text-sm text-muted-foreground">
          Scan the market for options anomalies
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Filters */}
        <Card className="border-border bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Min V/OI Ratio: {minVoi[0]}x</label>
              <Slider
                value={minVoi}
                onValueChange={(v) => setMinVoi(v as number[])}
                min={1}
                max={10}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Premium ($)</label>
              <Input
                type="number"
                value={minPremium}
                onChange={(e) => setMinPremium(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min DTE: {minDte[0]} days</label>
              <Slider
                value={minDte}
                onValueChange={(v) => setMinDte(v as number[])}
                min={30}
                max={730}
                step={10}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Delta Range: {deltaRange[0]} - {deltaRange[1]}
              </label>
              <Slider
                value={deltaRange}
                onValueChange={(v) => setDeltaRange(v as number[])}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Symbols</label>
              <Input placeholder="AAPL, TSLA, NVDA..." defaultValue="AAPL, TSLA, NVDA, MSFT, AMZN" />
            </div>

            <Button onClick={handleScan} className="w-full">
              🚀 Run Scan
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {hasRun && results.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{results.length}</div>
                    <p className="text-xs text-muted-foreground">Candidates</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {(results.reduce((a, b) => a + b.voiRatio, 0) / results.length).toFixed(1)}x
                    </div>
                    <p className="text-xs text-muted-foreground">Avg V/OI</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      ${Math.max(...results.map((r) => r.lastPrice * r.volume)).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Max Premium</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {((results.reduce((a, b) => a + b.iv, 0) / results.length) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Avg IV</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Results</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead>Symbol</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Strike</TableHead>
                          <TableHead>Exp</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>OI</TableHead>
                          <TableHead>V/OI</TableHead>
                          <TableHead>Delta</TableHead>
                          <TableHead>IV</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((row, i) => (
                          <TableRow key={i} className="border-border">
                            <TableCell className="font-medium">{row.symbol}</TableCell>
                            <TableCell>
                              <Badge variant={row.optionType === "C" ? "default" : "secondary"}>
                                {row.optionType}
                              </Badge>
                            </TableCell>
                            <TableCell>${row.strike.toFixed(1)}</TableCell>
                            <TableCell>{row.expiration}</TableCell>
                            <TableCell>${row.lastPrice.toFixed(2)}</TableCell>
                            <TableCell>{row.volume.toLocaleString()}</TableCell>
                            <TableCell>{row.openInterest.toLocaleString()}</TableCell>
                            <TableCell className="text-primary font-medium">
                              {row.voiRatio.toFixed(1)}x
                            </TableCell>
                            <TableCell>{row.delta.toFixed(3)}</TableCell>
                            <TableCell>{(row.iv * 100).toFixed(1)}%</TableCell>
                            <TableCell>{row.anomalyScore.toFixed(3)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!hasRun && (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground">
                  Configure filters and click Run Scan to find options anomalies
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
