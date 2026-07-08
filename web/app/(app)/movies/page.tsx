import { DiscoverPage, type DiscoverSearchParams } from "@/components/discovery/discover-page";

export const revalidate = 1800;

export const metadata = {
  title: "Movies",
  description: "Discover new movies to watch.",
};

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
}) {
  return <DiscoverPage kind="movie" searchParams={await searchParams} />;
}
