import { notFound } from "next/navigation";
import { getFranchise, getFranchiseItems, getMagicalFantasyGroups } from "@/lib/franchises";
import { FranchisePage } from "@/components/discovery/franchise-page";
import { MagicalFantasyPage } from "@/components/discovery/magical-fantasy-page";

export const revalidate = 86400;

export default async function BrowseFranchisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const franchise = getFranchise(slug);
  if (!franchise) notFound();

  if (slug === "magical-fantasy") return <MagicalFantasyPage groups={await getMagicalFantasyGroups()} />;
  const items = await getFranchiseItems(slug);

  return <FranchisePage franchise={franchise} items={items} />;
}
