"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function PBoxLoader({ className, label = "Opening PBox" }: { className?: string; label?: string }) {
  return (
    <div className={cn("pb-loader-stage", className)} role="status" aria-label={label}>
      <div className="pb-loader-orbit" aria-hidden="true"><span /><span /><span /></div>
      <svg viewBox="0 0 96 96" className="pb-loader-box" aria-hidden="true">
        <path className="pb-loader-lid pb-loader-lid-left" d="M48 22 13 38l35 17V22Z" />
        <path className="pb-loader-lid pb-loader-lid-right" d="m48 22 35 16-35 17V22Z" />
        <path className="pb-loader-side" d="m16 46 28 13v27L16 73V46Z" />
        <path className="pb-loader-side pb-loader-side-right" d="m80 46-28 13v27l28-13V46Z" />
        <path className="pb-loader-spark" d="m48 4 3 10 10 3-10 3-3 10-3-10-10-3 10-3 3-10Z" />
      </svg>
      <div className="pb-loader-copy"><strong>PBox</strong><span>{label}</span></div>
    </div>
  );
}

export function StartupSplash() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const timer = window.setTimeout(() => setVisible(false), standalone ? 950 : 520);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="pb-startup-splash"><PBoxLoader /></div>;
}
