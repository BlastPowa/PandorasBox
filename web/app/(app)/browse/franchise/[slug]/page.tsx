import { notFound } from "next/navigation";
import { getFranchise, getFranchiseItems } from "@/lib/franchises";
import { FranchisePage } from "@/components/discovery/franchise-page";

export const revalidate = 86400;

export default async function BrowseFranchisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const franchise = getFranchise(slug);
  if (!franchise) notFound();

  const items = await getFranchiseItems(slug);

  return <FranchisePage franchise={franchise} items={items} />;
}
