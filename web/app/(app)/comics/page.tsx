import { BookOpen } from "lucide-react";
import { getComics } from "@/lib/comics";
import { ComicCard } from "@/components/comics/comic-card";
import { EmptyState } from "@/components/ui-fx/feedback";

export const revalidate = 86400;

export default async function ComicsPage() {
  const [marvel, dc] = await Promise.all([getComics("marvel"), getComics("dc")]);
  const hasKey = Boolean(process.env.COMICVINE_API_KEY);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 md:px-8">
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="size-6 text-[var(--accent)]" />
          <h1 className="font-display text-2xl font-bold">Comics</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Marvel &amp; DC series, with covers and info from Comic Vine. We link out to legitimate reading platforms — Pandora&apos;s Box doesn&apos;t host comics.
        </p>
      </div>

      {!hasKey ? (
        <EmptyState title="Comic Vine API key required" description="Add COMICVINE_API_KEY to web/.env.local to load comics." />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Marvel</h2>
            {marvel.length === 0 ? (
              <EmptyState title="Couldn't load Marvel comics" description="Comic Vine may be temporarily unavailable." />
            ) : (
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                {marvel.map((c) => (
                  <ComicCard key={c.id} comic={c} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">DC</h2>
            {dc.length === 0 ? (
              <EmptyState title="Couldn't load DC comics" description="Comic Vine may be temporarily unavailable." />
            ) : (
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                {dc.map((c) => (
                  <ComicCard key={c.id} comic={c} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
