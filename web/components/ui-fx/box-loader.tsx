export function BoxLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16">
      <div className="pb-loader" role="status" aria-label={label ?? "Loading"}>
        <span className="pb-loader__ring" />
        <span className="pb-loader__ring" />
        <span className="pb-loader__ring" />
        <span className="pb-loader__core" />
      </div>
      {label && (
        <p className="animate-pulse font-display text-sm font-semibold text-[var(--text-secondary)]">
          {label}
        </p>
      )}
    </div>
  );
}
