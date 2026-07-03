import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  className,
  height = 4,
}: {
  percent: number;
  className?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
