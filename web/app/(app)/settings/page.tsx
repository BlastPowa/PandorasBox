import { SettingsView } from "@/components/settings/settings-view";
import { getProfile } from "@/lib/auth";

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your profile, appearance, connected services, and library data.
        </p>
      </div>
      <SettingsView
        username={profile?.username ?? null}
        country={profile?.country ?? "IE"}
        avatarUrl={profile?.avatar_url ?? null}
        bannerUrl={profile?.banner_url ?? null}
        profileBackgroundUrl={profile?.profile_background_url ?? null}
        profileBackgroundPosition={profile?.profile_background_position ?? "center"}
      />
    </div>
  );
}
