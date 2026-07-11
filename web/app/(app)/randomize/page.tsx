import { Randomizer } from "@/components/discovery/randomizer";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";
import { Dices } from "lucide-react";

export const metadata = { title: "Randomize · PBox" };

export default function RandomizePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <DiscoveryPageHeader eyebrow="PBox Randomizer" title="Open the Box" description="Choose a few preferences—or leave everything open—and let PBox find your next story." actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] sm:grid"><Dices className="size-6" /></div>} />
      <div className="h-6" />
      <Randomizer />
    </div>
  );
}
