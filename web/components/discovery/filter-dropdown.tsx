"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Pill-shaped dropdown used across the Movies/TV filter bar. `null` value means
 * "all", which is always offered as the first option.
 */
export function FilterDropdown({
  allLabel,
  options,
  value,
  onChange,
  showDot = false,
}: {
  allLabel: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Renders an accent dot before the label (matches the Sort pill). */
  showDot?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = options.find((o) => o.value === value);
  const label = active?.label ?? allLabel;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
          value
            ? "border-[var(--accent)] bg-[var(--glass-strong)] text-[var(--text)]"
            : "border-[var(--border)] bg-[var(--bg-surface)]/70 text-[var(--text-secondary)] hover:text-[var(--text)]"
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-[var(--accent)]" />}
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 max-h-72 w-52 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-2xl backdrop-blur-xl"
        >
          {[{ value: "", label: allLabel }, ...options].map((opt) => {
            const optValue = opt.value === "" ? null : opt.value;
            const selected = optValue === value;
            return (
              <button
                key={opt.value || "__all"}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(optValue);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-medium transition-colors",
                  selected
                    ? "bg-[var(--glass)] text-[var(--text)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--glass)] hover:text-[var(--text)]"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {selected && <Check className="size-3.5 shrink-0 text-[var(--accent)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
