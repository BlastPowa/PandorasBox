import { Dices } from "lucide-react";
import { Randomizer } from "@/components/discovery/randomizer";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "Randomize · PBox" };

type SearchValue = string | string[] | undefined;

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RandomizePage({ searchParams }: { searchParams: Promise<Record<string, SearchValue>> }) {
  const params = await searchParams;
  const preset = {
    type: first(params.type),
    genres: first(params.genres),
    era: first(params.era),
    quality: first(params.quality),
    mode: first(params.mode),
  };
  return <div className="mx-auto max-w-[1400px] overflow-x-clip px-4 py-4 sm:py-6 md:px-8"><div className="hidden sm:block"><DiscoveryPageHeader eyebrow="PBox Randomizer" title="Open the Box" description="Choose a few preferences—or leave everything open—and let PBox find your next story." actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] sm:grid"><Dices className="size-6" /></div>} /></div><div className="mb-4 sm:hidden"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">PBox Randomizer</p><h1 className="font-display text-2xl font-bold">Open the Box</h1></div><div className="hidden h-6 sm:block" /><Randomizer preset={preset} /></div>;
}
