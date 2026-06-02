"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Target,
  LineChart,
  Brain,
  Pickaxe,
  FlaskConical,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/screener", label: "Screener", icon: Search },
  { href: "/dashboard/signals", label: "Signals", icon: Target },
  { href: "/backtest", label: "Backtest", icon: LineChart },
  { href: "/strategies", label: "Strategies", icon: Brain },
  { href: "/features", label: "Features", icon: Pickaxe },
  { href: "/factors", label: "Factors", icon: FlaskConical },
  { href: "/live", label: "Live Trading", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">🦅</span>
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-sidebar-foreground">
            FlowHawk
          </h1>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Options Screener
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs text-muted-foreground">
          FlowHawk v0.2.0
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          Data: Theta Data + FMP
        </p>
      </div>
    </aside>
  );
}
