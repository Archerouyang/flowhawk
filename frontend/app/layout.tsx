import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OverlayCleanup } from "@/components/overlay-cleanup";

export const metadata: Metadata = {
  title: "FlowHawk — Options Anomaly Screener",
  description: "Find the smart money before it moves",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <OverlayCleanup />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-60 flex-1 p-6">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
