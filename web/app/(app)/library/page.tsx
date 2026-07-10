import { LibraryView } from "@/components/library/library-view";
import Link from "next/link";
import { BarChart3, Library } from "lucide-react";

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--media-border)] bg-[radial-gradient(circle_at_90%_0%,rgb(var(--accent-rgb)/0.24),transparent_42%),var(--bg-surface)] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div><span className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]"><Library className="size-4" /> Personal collection</span><h1 className="font-display text-3xl font-extrabold sm:text-4xl">My Library</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Track progress, ratings, and every title you want to remember.</p></div>
        <Link href="/stats" className="glass inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold hover:border-[var(--accent)]"><BarChart3 className="size-4 text-[var(--accent)]" /> View stats</Link>
      </header>
      <LibraryView />
    </div>
  );
}
