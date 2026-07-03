"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=unchecked]:bg-[rgba(255,255,255,0.08)] data-[state=checked]:bg-[linear-gradient(120deg,var(--accent),var(--accent-2))]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-lg transition-transform duration-200",
          "data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[22px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
