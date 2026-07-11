import { Dices } from "lucide-react";
import { Randomizer } from "@/components/discovery/randomizer";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "Randomize · PBox" };

export default function RandomizePage() {
  return <div className="mx-auto max-w-[1400px] overflow-x-clip px-4 py-4 sm:py-6 md:px-8"><div className="hidden sm:block"><DiscoveryPageHeader eyebrow="PBox Randomizer" title="Open the Box" description="Choose a few preferences—or leave everything open—and let PBox find your next story." actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] sm:grid"><Dices className="size-6" /></div>} /></div><div className="mb-4 sm:hidden"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">PBox Randomizer</p><h1 className="font-display text-2xl font-bold">Open the Box</h1></div><div className="hidden h-6 sm:block" /><Randomizer /></div>;
}
