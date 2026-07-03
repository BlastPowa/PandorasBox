"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ExpandableText({ text, clamp = 4 }: { text: string; clamp?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280;
  return (
    <div>
      <p
        className={cn("text-sm leading-relaxed text-[var(--text-secondary)]", !open && "line-clamp-4")}
        style={!open ? { WebkitLineClamp: clamp } : undefined}
      >
        {text}
      </p>
      {long && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
