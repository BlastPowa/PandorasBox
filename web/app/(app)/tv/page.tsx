import { DiscoverPage, type DiscoverSearchParams } from "@/components/discovery/discover-page";

export const revalidate = 1800;

export const metadata = {
  title: "Shows",
  description: "Discover new TV shows to watch.",
};

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
}) {
  return <DiscoverPage kind="tv" searchParams={await searchParams} />;
}
