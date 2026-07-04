"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqEntry {
  question: string;
  answer: React.ReactNode;
}

export function FaqAccordion({ entries }: { entries: FaqEntry[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const isOpen = open === i;
        return (
          <div key={entry.question} className="glass overflow-hidden rounded-[var(--radius-md)]">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold">{entry.question}</span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-[var(--text-muted)] transition-transform", isOpen && "rotate-180 text-[var(--accent)]")}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 text-sm leading-relaxed text-[var(--text-secondary)]">{entry.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
