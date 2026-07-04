import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { CommandPaletteLoader } from "@/components/shell/command-palette-loader";
import { OnboardingHint } from "@/components/onboarding/onboarding-hint";
import { getProfile, getCurrentUser } from "@/lib/auth";
import { LibraryProvider } from "@/lib/library/use-library";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, user] = await Promise.all([getProfile(), getCurrentUser()]);
  const isAdmin = profile?.role === "admin";

  return (
    <LibraryProvider userId={user?.id ?? null}>
      <div className="flex min-h-dvh">
        <Sidebar isAdmin={isAdmin} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar profile={profile} />
          <main className="flex-1 pb-24 md:pb-10">{children}</main>
          <BottomNav isAdmin={isAdmin} />
        </div>
        <CommandPaletteLoader />
        <OnboardingHint />
      </div>
    </LibraryProvider>
  );
}
