import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  macDots?: boolean;
  title?: string;
  strong?: boolean;
}

/** Halo-style frosted panel with optional macOS traffic-light header. */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, macDots, title, strong, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          strong ? "glass-strong" : "glass",
          "rounded-[var(--radius-lg)] overflow-hidden",
          className
        )}
        {...props}
      >
        {macDots && (
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            {title && (
              <span className="ml-3 font-display text-sm font-semibold text-[var(--text-secondary)]">
                {title}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";
