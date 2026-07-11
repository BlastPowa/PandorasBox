"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  /** Optional leading icon (provider logos). Plain <img>: these are 20px
   * third-party marks, so next/image's machinery buys nothing here. */
  iconUrl?: string;
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
  multiple = false,
}: {
  allLabel: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Renders an accent dot before the label (matches the Sort pill). */
  showDot?: boolean;
  multiple?: boolean;
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

  const selectedValues = value?.split(",").filter(Boolean) ?? [];
  const active = options.find((o) => o.value === value);
  const label = multiple && selectedValues.length > 0 ? `${selectedValues.length} Genres` : active?.label ?? allLabel;

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
        {active?.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.iconUrl} alt="" aria-hidden="true" className="size-4 rounded-[4px] object-cover" />
        )}
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 max-h-[55dvh] w-auto overflow-y-auto rounded-[var(--radius-xl)] border border-[rgb(var(--accent-rgb)/0.3)] bg-[var(--bg-elevated)] p-2 shadow-2xl backdrop-blur-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:mt-2 md:max-h-72 md:w-52 md:rounded-[var(--radius-md)] md:p-1"
        >
          {[{ value: "", label: allLabel }, ...options].map((opt) => {
            const optValue = opt.value === "" ? null : opt.value;
            const selected = optValue === null ? selectedValues.length === 0 : multiple ? selectedValues.includes(optValue) : optValue === value;
            return (
              <button
                key={opt.value || "__all"}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (multiple && optValue) {
                    const next = selected ? selectedValues.filter((item) => item !== optValue) : [...selectedValues, optValue];
                    onChange(next.length > 0 ? next.join(",") : null);
                  } else {
                    onChange(optValue);
                    setOpen(false);
                  }
                }}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium transition-colors md:min-h-0 md:text-xs",
                  selected
                    ? "bg-[var(--glass)] text-[var(--text)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--glass)] hover:text-[var(--text)]"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {"iconUrl" in opt && opt.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opt.iconUrl} alt="" aria-hidden="true" className="size-5 shrink-0 rounded-full object-cover" />
                  )}
                  <span className="truncate">{opt.label}</span>
                </span>
                {selected && <Check className="size-3.5 shrink-0 text-[var(--accent)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
