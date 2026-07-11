import type { ReactNode } from "react";

export function DiscoveryPageHeader({ eyebrow = "PBox Discovery", title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="relative overflow-visible rounded-[var(--radius-xl)] border border-[var(--media-border)] bg-[linear-gradient(120deg,rgb(var(--accent-rgb)/0.13),rgb(var(--accent-2-rgb)/0.06)_45%,var(--glass))] px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:px-7 sm:py-8">
      <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgb(var(--accent-rgb)/0.13)] blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions && <div className="w-full lg:w-auto">{actions}</div>}
      </div>
    </header>
  );
}
