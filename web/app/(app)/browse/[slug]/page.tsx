import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBrowseSection } from "@/lib/browse-sections";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";

export const revalidate = 3600;

export default async function BrowseSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = getBrowseSection(slug);
  if (!section) notFound();

  const items = await section.fetch(60);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <Link href="/browse" className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]">
        <ArrowLeft className="size-4" /> Browse
      </Link>
      <h1 className="font-display text-2xl font-bold">{section.title}</h1>
      {section.subtitle && <p className="mb-5 text-sm text-[var(--text-secondary)]">{section.subtitle}</p>}
      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState title="Nothing here yet" description="Try again later or check your TMDB API key." />
        ) : (
          <PosterGrid items={items} />
        )}
      </div>
    </div>
  );
}
