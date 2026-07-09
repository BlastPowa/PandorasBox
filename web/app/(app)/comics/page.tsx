import { Suspense } from "react";
import { getComics } from "@/lib/comics";
import { ComicsBrowser } from "@/components/comics/comics-browser";
import { EmptyState, PosterSkeleton } from "@/components/ui-fx/feedback";

export const revalidate = 86400;

export const metadata = {
  title: "Comics",
  description: "Browse Marvel, DC, Image, Dark Horse & IDW series.",
};

async function ComicsContent() {
  const hasKey = Boolean(process.env.COMICVINE_API_KEY);
  if (!hasKey) {
    return <EmptyState title="Comic Vine API key required" description="Add COMICVINE_API_KEY to web/.env.local to load comics." />;
  }
  const initial = await getComics("marvel");
  return <ComicsBrowser initial={initial} />;
}

export default function ComicsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <PosterSkeleton key={i} />
            ))}
          </div>
        }
      >
        <ComicsContent />
      </Suspense>
    </div>
  );
}
