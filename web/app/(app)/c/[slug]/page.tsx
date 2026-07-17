import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/collections/collection-detail";
import { createClient } from "@/lib/supabase/server";

async function findCollection(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("collections")
    .select("id, name, description, cover_url")
    .eq("share_slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await findCollection(slug);
  if (!collection) return { title: "Collection unavailable · PBox" };
  const description = collection.description || `Explore ${collection.name}, a collection shared on PBox.`;
  const images = collection.cover_url ? [collection.cover_url] : [];
  return {
    title: `${collection.name} · PBox`, description,
    openGraph: { title: collection.name, description, type: "website", images },
    twitter: { card: "summary_large_image", title: collection.name, description, images },
  };
}

export default async function SharedCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await findCollection(slug);
  if (!collection) notFound();
  return <div className="mx-auto max-w-7xl px-4 py-6 md:px-8"><CollectionDetail id={collection.id} /></div>;
}
