import { cn } from "@/lib/utils";

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block animate-spin rounded-full", className)}
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 9)),
        borderStyle: "solid",
        borderColor: "rgba(255,255,255,0.15)",
        borderTopColor: "var(--accent)",
      }}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[var(--radius-md)]", className)} />;
}

export function PosterSkeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton aspect-[2/3] w-full rounded-[var(--radius-md)]", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && <div className="text-[var(--accent)] opacity-80">{icon}</div>}
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
