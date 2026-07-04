import { SettingsView } from "@/components/settings/settings-view";
import { getProfile } from "@/lib/auth";

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
      <h1 className="mb-5 font-display text-2xl font-bold">Settings</h1>
      <SettingsView
        username={profile?.username ?? null}
        country={profile?.country ?? "IE"}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  );
}
