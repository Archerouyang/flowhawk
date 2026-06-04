"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reset body scroll/pointer styles when navigating between pages.
 *
 * Radix Dialog/Sheet sets overflow:hidden on body while open. If the
 * component is unmounted while the overlay is still open (e.g. user clicks
 * a sidebar link), the style may not be cleaned up, leaving the new page
 * un-scrollable.
 */
export function OverlayCleanup() {
  const pathname = usePathname();

  useEffect(() => {
    // Force-reset any leftover scroll-lock styles on route change
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    document.body.removeAttribute("data-scroll-locked");
    document.documentElement.style.overflow = "";
  }, [pathname]);

  return null;
}
