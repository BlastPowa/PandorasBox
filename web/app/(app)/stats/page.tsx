import { StatsView } from "@/components/stats/stats-view";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";
import { getProfile } from "@/lib/auth";

export default async function StatsPage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Your story"
          title="Stats"
          description="See what you have finished, what you return to most, your favourite genres and how your library has grown over time."
        />
        <StatsView username={profile?.username ?? null} avatarUrl={profile?.avatar_url ?? null} />
      </div>
    </div>
  );
}
