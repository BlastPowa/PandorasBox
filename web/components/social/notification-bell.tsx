"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?filter=unread&limit=1", { cache: "no-store" });
      if (response.ok) setCount(Number(((await response.json()) as { unreadCount?: number }).unreadCount ?? 0));
    } catch { /* non-critical chrome */ }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void refresh());
    window.addEventListener("pbox:notifications-change", refresh);
    return () => window.removeEventListener("pbox:notifications-change", refresh);
  }, [refresh]);
  return (
    <Link href="/notifications" aria-label={count ? `${count} unread notifications` : "Notifications"} title="Notifications" className="relative grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
      <Bell className="size-5" />
      {count > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 font-mono text-[10px] font-bold text-black">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
