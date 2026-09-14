"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-white font-semibold shadow-sm hover:bg-[var(--accent-hover)] hover:shadow-md",
        gold:
          "bg-[#fff7ed] text-[#9a3412] font-semibold border border-[#fed7aa] hover:bg-[#ffedd5]",
        glass:
          "border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text)] shadow-sm hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]",
        ghost:
          "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--glass)]",
        outline:
          "border border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--glass)]",
        danger:
          "bg-[#fff1f0] border border-[#fecaca] text-[#c4320a] hover:bg-[#fee2e2]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";
