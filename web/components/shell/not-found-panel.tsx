import Link from "next/link";
import { Compass, Home } from "lucide-react";

export function NotFoundPanel() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-[var(--glass)]">
        <Compass className="size-8 text-[var(--accent)]" />
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold">404</h1>
        <p className="mt-1 text-[var(--text-secondary)]">This page doesn&apos;t exist, or the box was never opened.</p>
      </div>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-5 py-2.5 text-sm font-bold text-[#0a0a0f]"
      >
        <Home className="size-4" /> Back to Home
      </Link>
    </div>
  );
}
