import { CollectionDetail } from "@/components/collections/collection-detail";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <CollectionDetail id={id} />
    </div>
  );
}
