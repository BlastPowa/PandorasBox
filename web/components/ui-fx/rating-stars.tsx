"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  /** 0–10 scale, rendered as 10 individually-clickable stars. */
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export function RatingStars({
  value,
  onChange,
  size = 14,
  readOnly = false,
  className,
}: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const effective = hover ?? value ?? 0;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      onMouseLeave={() => setHover(null)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Rating"
    >
      <div className="flex items-center gap-[1px]">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((point) => {
          const filled = effective >= point;
          return (
            <button
              key={point}
              type="button"
              disabled={readOnly}
              aria-label={`${point} out of 10`}
              onMouseEnter={() => !readOnly && setHover(point)}
              onClick={() => onChange?.(point)}
              className={cn(
                "transition-transform duration-150",
                !readOnly && "hover:scale-125 cursor-pointer",
                readOnly && "cursor-default"
              )}
            >
              <Star
                width={size}
                height={size}
                className={filled ? "text-[var(--gold)]" : "text-[rgba(255,255,255,0.2)]"}
                fill={filled ? "var(--gold)" : "none"}
              />
            </button>
          );
        })}
      </div>
      {value !== null && value > 0 && (
        <span className="font-mono text-xs text-[var(--text-secondary)]">{value.toFixed(0)}/10</span>
      )}
    </div>
  );
}
