import { Brand } from "@/components/shell/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Brand />
      </div>
      {children}
      <p className="mt-8 max-w-sm text-center text-xs leading-relaxed text-[var(--text-muted)]">
        Pandora&apos;s Box tracks movies, series, anime, K-drama, cartoons, manga &amp; manhwa, and
        links you to where they&apos;re streaming. Data from TMDB, AniList &amp; MangaDex.
      </p>
    </div>
  );
}
