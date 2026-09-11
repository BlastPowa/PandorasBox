"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  variant: "info" | "success" | "warning";
}

const DISMISSED_KEY = "pb_dismissed_announcements";

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function dismiss(id: string) {
  const set = getDismissed();
  set.add(id);
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

const VARIANT_STYLES: Record<Announcement["variant"], string> = {
  info: "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]",
  success: "border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] text-emerald-300",
  warning: "border-[rgb(var(--gold-rgb)/0.35)] bg-[rgb(var(--gold-rgb)/0.12)] text-[var(--gold)]",
};

export function AnnouncementsBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await createClient()
        .from("announcements")
        .select("id, title, body, variant")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const latest = (data as Announcement[] | null)?.[0] ?? null;
      const dismissed = getDismissed();
      setAnnouncement(latest && !dismissed.has(latest.id) ? latest : null);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !announcement) return null;

  return (
    <aside className="pbox-announcement-toast" aria-live="polite" aria-label="Admin announcement">
      <div className="flex items-start gap-3 p-4">
        <div className={`grid size-10 shrink-0 place-items-center rounded-xl border ${VARIANT_STYLES[announcement.variant]}`}>
          <Megaphone className="size-5" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">PBox update</p>
          <h2 className="mt-1 text-sm font-semibold text-[var(--text)]">{announcement.title}</h2>
          {announcement.body && (
            <p className="mt-1.5 max-h-32 overflow-y-auto pr-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {announcement.body}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            dismiss(announcement.id);
            setAnnouncement(null);
          }}
          className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Dismiss announcement"
          title="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
}
