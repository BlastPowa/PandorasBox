import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterRow } from "./poster-row";
import { DiscoveryPageHeader } from "./discovery-page-header";
import { BackButton } from "@/components/shell/back-button";
import { BulkAddToCollection } from "@/components/collections/bulk-add-to-collection";

export function MagicalFantasyPage({ groups }: { groups: { title: string; items: UnifiedSearchResult[] }[] }) {
  return <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8"><BackButton fallbackHref="/browse" label="Browse" className="mb-3" /><DiscoveryPageHeader eyebrow="PBox Worlds" title="Magical Fantasy" description="Complete film sagas, magical animation, sorcery stories, and enchanted television worlds." /><div className="mt-8 space-y-9">{groups.map((group) => <PosterRow key={group.title} title={group.title} subtitle="Curated in release order" items={group.items} action={<BulkAddToCollection items={group.items.map((item) => ({ id: item.id, type: item.type, source: item.source, title: item.title, posterUrl: item.posterUrl, year: item.year, anilistId: item.anilistId, tmdbId: item.tmdbId, mangadexId: item.mangadexId }))} />} />)}</div></div>;
}
