"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none",
  {
    variants: {
      variant: {
        primary:
          "text-[#0a0a0f] font-semibold bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] shadow-[0_8px_30px_rgba(168,85,247,0.25)] hover:shadow-[0_10px_40px_rgba(168,85,247,0.4)] hover:brightness-110",
        gold:
          "text-[#0a0a0f] font-semibold bg-[linear-gradient(120deg,var(--gold),#ffcf6b)] shadow-[0_8px_30px_rgba(245,165,36,0.25)] hover:brightness-110",
        glass:
          "glass text-[var(--text)] glow-ring hover:bg-[var(--glass-strong)]",
        ghost:
          "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--glass)]",
        outline:
          "border border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--glass)]",
        danger:
          "bg-[rgba(239,68,68,0.14)] border border-[rgba(239,68,68,0.4)] text-[#fca5a5] hover:bg-[rgba(239,68,68,0.22)]",
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
