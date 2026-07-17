"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Award, CalendarDays, ChevronRight, Clock3, FolderHeart, Lock, Settings as SettingsIcon, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { sendFriendRequest } from "@/lib/friends/friends";
import { Button } from "@/components/ui-fx/button";
import { EmptyState } from "@/components/ui-fx/feedback";
import { BackButton } from "@/components/shell/back-button";
import { profileActivityHref } from "@/lib/profile/activity-href";

interface ProfileRow { id: string; username: string | null; avatar_url: string | null; bio: string | null; banner_url: string | null; profile_background_url: string | null; profile_background_position: "top" | "center" | "bottom"; privacy: "public" | "friends" | "private"; created_at: string; }
interface CollectionRow { id: string; name: string; description: string | null; cover_url: string | null; visibility?: string; created_at: string; }
interface ActivityRow { id: string; verb: string; title: string | null; poster_url: string | null; media_type: string | null; media_key: string | null; created_at: string; }

const VERB_LABEL: Record<string, string> = { started: "started", finished: "completed", rated: "rated", added: "added", created_collection: "created a collection" };

function activityHref(row: ActivityRow) {
  return profileActivityHref(row.media_type, row.media_key, row.title);
}

export function PublicProfile({ profile, isOwner, visible, collections, activity }: { profile: ProfileRow; isOwner: boolean; visible: boolean; collections: CollectionRow[]; activity: ActivityRow[]; }) {
  const [requested, setRequested] = useState(false);
  const joinedDate = new Date(profile.created_at);
  const joined = joinedDate.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  const accountYears = Math.max(0, Math.floor((Date.now() - joinedDate.getTime()) / 31_557_600_000));
  const level = Math.max(1, Math.min(99, 1 + accountYears * 5 + collections.length * 2 + Math.floor(activity.length / 3)));
  const uniqueTitles = useMemo(() => new Set(activity.map((row) => row.title).filter(Boolean)).size, [activity]);
  const completed = activity.filter((row) => row.verb === "finished").length;
  const featured = collections.slice(0, 3);
  const recentPosters = activity.filter((row) => row.poster_url).slice(0, 5);

  const badges = [
    { label: "Collector", description: `${collections.length} public collection${collections.length === 1 ? "" : "s"}`, icon: FolderHeart, earned: collections.length > 0 },
    { label: "Explorer", description: `${uniqueTitles} recent title${uniqueTitles === 1 ? "" : "s"}`, icon: Sparkles, earned: uniqueTitles >= 3 },
    { label: "Finisher", description: `${completed} recent completion${completed === 1 ? "" : "s"}`, icon: Award, earned: completed > 0 },
    { label: "PBox Member", description: `Joined ${joined}`, icon: ShieldCheck, earned: true },
  ].filter((badge) => badge.earned);

  async function addFriend() {
    try { await sendFriendRequest(profile.id); setRequested(true); toast.success("Friend request sent"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not send request"); }
  }

  const hasBackground = Boolean(profile.profile_background_url);

  return (
    <div className={`relative isolate min-h-[calc(100dvh-68px)] overflow-hidden ${hasBackground ? "profile-has-background" : ""}`}>
      {profile.profile_background_url && <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-[72vh] bg-cover bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(profile.profile_background_url)})`, backgroundPosition: `center ${profile.profile_background_position}` }} />
        <div className="absolute inset-x-[-4%] top-[38vh] h-[95vh] scale-105 bg-cover bg-no-repeat opacity-45 blur-2xl" style={{ backgroundImage: `url(${JSON.stringify(profile.profile_background_url)})`, backgroundPosition: `center ${profile.profile_background_position}` }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(7_7_12/0.2)_0%,rgb(7_7_12/0.72)_32%,var(--bg-base)_78%),linear-gradient(90deg,rgb(7_7_12/0.48),transparent_48%,rgb(7_7_12/0.45))]" />
      </div>}
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-4 md:px-8">
      <BackButton className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]" />

      <header className={`relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--media-border)] shadow-2xl ${hasBackground ? "bg-[rgb(12_12_18/0.84)] backdrop-blur-xl" : "bg-[var(--bg-surface)]"}`}>
        <div className="relative h-56 sm:h-72 lg:h-80">
          {profile.banner_url ? <Image src={profile.banner_url} alt={`${profile.username ?? "User"}'s profile banner`} fill priority sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" /> : <div className="size-full bg-[radial-gradient(circle_at_70%_20%,rgb(var(--accent-2-rgb)/0.5),transparent_38%),radial-gradient(circle_at_20%_80%,rgb(var(--accent-rgb)/0.55),transparent_42%),linear-gradient(145deg,#171724,#08080d)]" />}
          <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-surface)_0%,rgb(10_10_15/0.62)_42%,transparent_76%)]" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 sm:gap-6 sm:p-8">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-[var(--accent)] bg-[var(--bg-elevated)] shadow-[0_0_0_4px_rgb(10_10_15/0.88),0_0_30px_rgb(var(--accent-rgb)/0.45)] sm:size-32">
              {profile.avatar_url ? <Image src={profile.avatar_url} alt={`${profile.username ?? "User"}'s avatar`} fill priority sizes="128px" className="object-cover" /> : <div className="grid size-full place-items-center font-display text-4xl font-bold text-[var(--text-muted)]">{profile.username?.[0]?.toUpperCase() ?? "?"}</div>}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-3"><h1 className="truncate font-display text-2xl font-extrabold sm:text-4xl">{profile.username}</h1><span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.18)] px-3 py-1 text-xs font-bold text-[var(--accent)]"><span className="size-2 rounded-full bg-[var(--completed)] shadow-[0_0_10px_var(--completed)]" /> Collector</span></div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] sm:text-sm"><CalendarDays className="size-3.5" /> PBox member since {joined}</p>
            </div>
            <div className="hidden rounded-full bg-[rgb(10_10_15/0.7)] p-1.5 sm:block"><div className="grid size-16 place-items-center rounded-full border-2 border-[var(--accent)] bg-[var(--bg-surface)] text-center shadow-[0_0_28px_rgb(var(--accent-rgb)/0.25)]"><span><span className="block text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Level</span><strong className="font-mono text-xl text-[var(--accent)]">{level}</strong></span></div></div>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{profile.bio || "Tracking stories, worlds, and favourites across PBox."}</p>
          {isOwner ? <Button asChild variant="glass" size="sm"><Link href="/settings"><SettingsIcon className="size-4" /> Edit profile</Link></Button> : <Button size="sm" onClick={() => void addFriend()} disabled={requested}><UserPlus className="size-4" /> {requested ? "Request sent" : "Add friend"}</Button>}
        </div>
      </header>

      {!visible ? <div className="mt-6"><EmptyState icon={profile.privacy === "friends" ? <Users className="size-10" /> : <Lock className="size-10" />} title={profile.privacy === "friends" ? "Friends only" : "Private profile"} description={profile.privacy === "friends" ? "Add this person as a friend to see their collections and activity." : "This user has set their profile to private."} /></div> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-6">
            <section className="grid grid-cols-3 gap-3" aria-label="Profile statistics">
              {[{ label: "Collections", value: collections.length, icon: FolderHeart }, { label: "Recent titles", value: uniqueTitles, icon: Activity }, { label: "Completions", value: completed, icon: Award }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-4"><Icon className="mb-4 size-5 text-[var(--accent)]" /><strong className="block font-mono text-2xl">{value}</strong><span className="text-xs text-[var(--text-muted)]">{label}</span></div>)}
            </section>

            {featured.length > 0 && <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Featured collections</h2><span className="text-xs text-[var(--text-muted)]">Curated by {profile.username}</span></div><div className="grid gap-3 sm:grid-cols-3">{featured.map((collection, index) => <Link key={collection.id} href={`/collections/${collection.id}`} className="group relative min-h-48 overflow-hidden rounded-2xl border border-[var(--media-border)] bg-[var(--bg-surface)]"><>{collection.cover_url ? <Image src={collection.cover_url} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /> : recentPosters[index]?.poster_url ? <Image src={recentPosters[index].poster_url!} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover opacity-60 transition duration-500 group-hover:scale-105" /> : <div className="size-full bg-[linear-gradient(145deg,rgb(var(--accent-rgb)/0.35),rgb(var(--accent-2-rgb)/0.12))]" />}</><div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Featured</p><h3 className="mt-1 font-display text-lg font-bold">{collection.name}</h3>{collection.description && <p className="mt-1 line-clamp-2 text-xs text-white/65">{collection.description}</p>}</div></Link>)}</div></section>}

            <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Recent activity</h2><Clock3 className="size-4 text-[var(--text-muted)]" /></div>{activity.length === 0 ? <p className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-6 text-sm text-[var(--text-muted)]">No recent activity.</p> : <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--glass)]">{activity.map((row) => { const href = activityHref(row); const content = <><div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elevated)]">{row.poster_url ? <Image src={row.poster_url} alt="" fill sizes="44px" className="object-cover" /> : <div className="grid size-full place-items-center"><Activity className="size-4 text-[var(--text-muted)]" /></div>}</div><div className="min-w-0 flex-1"><p className="text-sm text-[var(--text-secondary)]"><strong className="text-[var(--text)]">{profile.username}</strong> {VERB_LABEL[row.verb] ?? row.verb}</p>{row.title && <p className="mt-0.5 truncate font-semibold">{row.title}</p>}<time className="mt-1 block text-[10px] text-[var(--text-muted)]">{new Date(row.created_at).toLocaleDateString()}</time></div>{href && <ChevronRight className="size-4 shrink-0 text-[var(--text-muted)]" />}</>; return href ? <Link key={row.id} href={href} className="flex items-center gap-3 border-b border-[var(--border)] p-3 transition last:border-0 hover:bg-[var(--glass-strong)]">{content}</Link> : <div key={row.id} className="flex items-center gap-3 border-b border-[var(--border)] p-3 last:border-0">{content}</div>; })}</div>}</section>
          </main>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display font-bold">Collector level</h2><strong className="font-mono text-xl text-[var(--accent)]">{level}</strong></div><div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" style={{ width: `${Math.max(8, level % 10 * 10)}%` }} /></div><p className="mt-2 text-[10px] text-[var(--text-muted)]">Build collections and activity to shape your profile.</p></section>
            <section><h2 className="mb-3 font-display font-bold">Badges</h2><div className="space-y-2">{badges.map(({ label, description, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--glass)] p-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]"><Icon className="size-5" /></div><div className="min-w-0"><h3 className="text-sm font-semibold">{label}</h3><p className="truncate text-[10px] text-[var(--text-muted)]">{description}</p></div></div>)}</div></section>
            {recentPosters.length > 0 && <section><h2 className="mb-3 font-display font-bold">Recent showcase</h2><div className="grid grid-cols-5 gap-1.5">{recentPosters.map((row) => <div key={row.id} className="relative aspect-[2/3] overflow-hidden rounded-lg border border-[var(--border)]"><Image src={row.poster_url!} alt={row.title ?? "Recent title"} fill sizes="60px" className="object-cover" /></div>)}</div></section>}
          </aside>
        </div>
      )}
      </div>
    </div>
  );
}
