import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { PBoxMark, PBoxWordmark } from "@/components/shell/brand";

export const metadata: Metadata = { title: "Offline · PBox", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-[max(1.25rem,var(--safe-left))] py-[max(1.25rem,var(--safe-top))]">
      <section className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center shadow-2xl">
        <div className="mx-auto flex w-fit items-center gap-2"><PBoxMark /><PBoxWordmark /></div>
        <span className="mx-auto mt-7 grid size-16 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]"><WifiOff className="size-7" /></span>
        <h1 className="mt-5 font-display text-2xl font-bold">You’re offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">Reconnect to load your library, messages, and fresh discovery data. PBox does not store private API responses in the offline cache.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 font-bold text-black"><RefreshCw className="size-4" /> Try again</Link>
      </section>
    </main>
  );
}
