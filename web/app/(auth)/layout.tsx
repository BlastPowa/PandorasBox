import { connection } from "next/server";
import Link from "next/link";
import { Brand } from "@/components/shell/brand";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // The request nonce must also be present on Next's inline hydration scripts.
  await connection();
  return (
    <div className="pb-auth-layout flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Brand />
      </div>
      {children}
      <p className="mt-8 max-w-sm text-center text-xs leading-relaxed text-[var(--text-muted)]">
        PBox tracks movies, series, anime, K-drama, cartoons, manga &amp; manhwa, and
        links you to where they&apos;re streaming. Data from TMDB, AniList &amp; MangaDex.
      </p>
      <nav aria-label="Policies" className="mt-4 flex flex-wrap justify-center gap-5 text-xs text-[var(--text-muted)]"><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Terms</Link><Link href="/faq">Contact</Link></nav>
    </div>
  );
}
