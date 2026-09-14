"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.14)]",
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

/** Search field with a compact, tactile focus treatment. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, icon, trailing, ...props }, ref) => (
    <div className="group relative flex items-center rounded-[14px]">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent)]">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text)] shadow-sm placeholder:text-[var(--text-muted)] outline-none transition-all duration-200",
          "focus:border-[rgb(var(--accent-rgb)/0.55)] focus:shadow-[0_0_0_3px_rgb(var(--accent-rgb)/0.10)]",
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
