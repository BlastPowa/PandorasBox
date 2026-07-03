import { StatsView } from "@/components/stats/stats-view";
import { getProfile } from "@/lib/auth";

export default async function StatsPage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <StatsView username={profile?.username ?? null} />
    </div>
  );
}
