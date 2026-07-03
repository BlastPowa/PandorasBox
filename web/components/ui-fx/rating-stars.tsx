"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  /** 0–10 scale (stored), rendered as 5 stars (each = 2 points). */
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export function RatingStars({
  value,
  onChange,
  size = 18,
  readOnly = false,
  className,
}: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const effective = hover ?? value ?? 0;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={() => setHover(null)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const points = star * 2;
        const filled = effective >= points;
        const half = !filled && effective >= points - 1;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${points} out of 10`}
            onMouseEnter={() => !readOnly && setHover(points)}
            onClick={() => onChange?.(points)}
            className={cn(
              "transition-transform duration-150",
              !readOnly && "hover:scale-125 cursor-pointer",
              readOnly && "cursor-default"
            )}
          >
            <Star
              width={size}
              height={size}
              className={cn(
                filled || half ? "text-[var(--gold)]" : "text-[rgba(255,255,255,0.2)]"
              )}
              fill={filled ? "var(--gold)" : "none"}
            />
          </button>
        );
      })}
      {value !== null && value > 0 && (
        <span className="ml-1 font-mono text-xs text-[var(--text-secondary)]">
          {value.toFixed(0)}/10
        </span>
      )}
    </div>
  );
}
