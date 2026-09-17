import { LibraryView } from "@/components/library/library-view";
import { Library } from "lucide-react";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";
import { TrackingHubNav } from "@/components/tracking/tracking-hub-nav";

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="space-y-5">
        <DiscoveryPageHeader
          eyebrow="Tracking hub · Library"
          title="My Library"
          description="Track progress, ratings and every title you want to remember across movies, TV, anime, manga and comics."
          actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] sm:grid"><Library className="size-6" /></div>}
        />
        <TrackingHubNav active="library" />
        <LibraryView />
      </div>
    </div>
  );
}
