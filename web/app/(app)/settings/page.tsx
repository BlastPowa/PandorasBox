import { SettingsView } from "@/components/settings/settings-view";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";
import { getProfile } from "@/lib/auth";

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Make it yours"
          title="Settings"
          description="Tune your profile, artwork, appearance, connected services and library data from one calmer control centre."
        />
        <SettingsView
          username={profile?.username ?? null}
          country={profile?.country ?? "IE"}
          avatarUrl={profile?.avatar_url ?? null}
          bannerUrl={profile?.banner_url ?? null}
          profileBackgroundUrl={profile?.profile_background_url ?? null}
          profileBackgroundPosition={profile?.profile_background_position ?? "center"}
        />
      </div>
    </div>
  );
}
