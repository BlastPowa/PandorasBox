"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.25)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  trailing?: ReactNode;
}

/** Glowing search field (uiverse-style focus glow). */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, icon, trailing, ...props }, ref) => (
    <div className="group fx-glow-border relative flex items-center rounded-full">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent)]">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-full border border-[var(--border)] bg-[var(--glass)] backdrop-blur-md text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200",
          "focus:border-[rgba(168,85,247,0.5)] focus:shadow-[0_0_0_3px_rgba(168,85,247,0.18),0_8px_30px_rgba(168,85,247,0.12)]",
          icon ? "pl-11" : "pl-4",
          trailing ? "pr-11" : "pr-4",
          className
        )}
        {...props}
      />
      {trailing && <span className="absolute right-3.5">{trailing}</span>}
    </div>
  )
);
SearchInput.displayName = "SearchInput";
