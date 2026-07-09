import { getShortsFeed } from "@/lib/trailers";
import { ShortsFeed } from "@/components/shorts/shorts-feed";

export const revalidate = 3600;

export const metadata = {
  title: "Shorts",
  description: "A vertical feed of trending trailers.",
};

export default async function ShortsPage() {
  const items = await getShortsFeed();
  return <ShortsFeed items={items} />;
}
