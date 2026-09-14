import { notFound, redirect } from "next/navigation";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; source: string; id: string }>;
  searchParams: Promise<{ title?: string; year?: string; season?: string; episode?: string }>;
}) {
  const { type, source, id } = await params;
  const query = await searchParams;
  if (type !== "movie" && type !== "series" && type !== "anime") notFound();
  const titleHref = `/title/${type}/${encodeURIComponent(decodeURIComponent(source))}/${encodeURIComponent(decodeURIComponent(id))}`;
  const progressAnchor = type !== "movie" && (query.season || query.episode) ? "#pbox-episodes" : "#where-to-watch";
  redirect(`${titleHref}${progressAnchor}`);
}
