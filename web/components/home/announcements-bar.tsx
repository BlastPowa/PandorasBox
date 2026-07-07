"use client";

import { useEffect, useState } from "react";
import { Megaphone, X, ChevronDown } from "lucide-react";
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
  info: "border-[rgba(168,85,247,0.3)] bg-[rgba(168,85,247,0.1)] text-[var(--text)]",
  success: "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] text-[var(--text)]",
  warning: "border-[rgba(245,165,36,0.3)] bg-[rgba(245,165,36,0.1)] text-[#fbbf24]",
};

export function AnnouncementsBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await createClient()
        .from("announcements")
        .select("id, title, body, variant")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      const dismissed = getDismissed();
      setItems(((data as Announcement[] | null) ?? []).filter((a) => !dismissed.has(a.id)));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const open = openId === a.id;
        return (
          <div key={a.id} className={`overflow-hidden rounded-[var(--radius-md)] border ${VARIANT_STYLES[a.variant]}`}>
            <button
              onClick={() => setOpenId(open ? null : a.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold"
            >
              <Megaphone className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{a.title}</span>
              {a.body && (
                <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(a.id);
                  setItems((prev) => prev.filter((i) => i.id !== a.id));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    dismiss(a.id);
                    setItems((prev) => prev.filter((i) => i.id !== a.id));
                  }
                }}
                className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-[rgba(255,255,255,0.1)]"
                aria-label="Dismiss announcement"
              >
                <X className="size-3.5" />
              </span>
            </button>
            {open && a.body && (
              <p className="border-t border-[rgba(255,255,255,0.1)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                {a.body}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
