"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Award, CalendarDays, ChevronRight, Clock3, FolderHeart, Lock, MessageCircle, Settings as SettingsIcon, ShieldCheck, Sparkles, UserCheck, UserPlus, Users } from "lucide-react";
import { sendFriendRequest } from "@/lib/friends/friends";
import { createConversation } from "@/lib/messages/client";
import { Button } from "@/components/ui-fx/button";
import { EmptyState } from "@/components/ui-fx/feedback";
import { BackButton } from "@/components/shell/back-button";
import { profileActivityHref } from "@/lib/profile/activity-href";

interface ProfileRow { id: string; username: string | null; avatar_url: string | null; bio: string | null; banner_url: string | null; profile_background_url: string | null; profile_background_position: "top" | "center" | "bottom"; privacy: "public" | "friends" | "private"; created_at: string; }
interface CollectionRow { id: string; name: string; description: string | null; cover_url: string | null; visibility?: string; created_at: string; }
interface ActivityRow { id: string; verb: string; title: string | null; poster_url: string | null; media_type: string | null; media_key: string | null; meta?: Record<string, unknown> | null; created_at: string; }

const VERB_LABEL: Record<string, string> = { started: "started", finished: "completed", rated: "rated", added: "added", progressed: "checked in", created_collection: "created a collection" };
type ActivityFilter = "all" | "screen" | "anime" | "comics" | "games";

const ACTIVITY_FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "screen", label: "Movies & TV" },
  { id: "anime", label: "Anime & Manga" },
  { id: "comics", label: "Comics" },
  { id: "games", label: "Games" },
];

function activityBucket(mediaType: string | null): ActivityFilter | "other" {
  const type = (mediaType ?? "").toLowerCase();
  if (type.includes("anime") || type.includes("manga")) return "anime";
  if (type.includes("comic")) return "comics";
  if (type.includes("game")) return "games";
  if (["movie", "tv", "series", "show"].some((value) => type.includes(value))) return "screen";
  return "other";
}

function progressDetail(row: ActivityRow) {
  const meta = row.meta;
  if (!meta || row.verb !== "progressed") return null;
  if (meta.kind === "episode" && typeof meta.episode === "number") {
    return typeof meta.season === "number" ? `S${meta.season} E${meta.episode}` : `Episode ${meta.episode}`;
  }
  if (meta.kind === "issue") {
    if (typeof meta.issueNumber === "string" && meta.issueNumber.trim()) return `Issue #${meta.issueNumber}`;
    if (typeof meta.chapter === "number") return `Issue ${meta.chapter}`;
  }
  if (meta.kind === "chapter" && typeof meta.chapter === "number") return `Chapter ${meta.chapter}`;
  return null;
}

function activityHref(row: ActivityRow) {
  return profileActivityHref(row.media_type, row.media_key, row.title);
}

export function PublicProfile({ profile, isOwner, signedIn, relationship, visible, collections, activity }: { profile: ProfileRow; isOwner: boolean; signedIn: boolean; relationship: "none" | "friends" | "outgoing" | "incoming" | "blocked"; visible: boolean; collections: CollectionRow[]; activity: ActivityRow[]; }) {
  const router = useRouter();
  const [requested, setRequested] = useState(false);
  const [relationshipState, setRelationshipState] = useState(relationship);
  const [messageBusy, setMessageBusy] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const joinedDate = new Date(profile.created_at);
  const joined = joinedDate.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  const uniqueTitles = useMemo(() => new Set(activity.map((row) => row.title).filter(Boolean)).size, [activity]);
  const completed = activity.filter((row) => row.verb === "finished").length;
  const featured = collections.slice(0, 3);
  const recentPosters = activity.filter((row) => row.poster_url).slice(0, 8);
  const filteredActivity = useMemo(
    () => activityFilter === "all" ? activity : activity.filter((row) => activityBucket(row.media_type) === activityFilter),
    [activity, activityFilter],
  );
  const activityCounts = useMemo(() => Object.fromEntries(ACTIVITY_FILTERS.map(({ id }) => [id, id === "all" ? activity.length : activity.filter((row) => activityBucket(row.media_type) === id).length])) as Record<ActivityFilter, number>, [activity]);

  const badges = [
    { label: "Collector", description: `${collections.length} public collection${collections.length === 1 ? "" : "s"}`, icon: FolderHeart, earned: collections.length > 0 },
    { label: "Explorer", description: `${uniqueTitles} recent title${uniqueTitles === 1 ? "" : "s"}`, icon: Sparkles, earned: uniqueTitles >= 3 },
    { label: "Finisher", description: `${completed} recent completion${completed === 1 ? "" : "s"}`, icon: Award, earned: completed > 0 },
    { label: "PBox Member", description: `Joined ${joined}`, icon: ShieldCheck, earned: true },
  ].filter((badge) => badge.earned);

  async function addFriend() {
    try { await sendFriendRequest(profile.id); setRequested(true); setRelationshipState("outgoing"); toast.success("Friend request sent"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not send request"); }
  }

  async function openMessage() {
    setMessageBusy(true);
    try {
      const conversation = await createConversation({ type: "direct", friendId: profile.id });
      router.push(`/messages/${conversation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open conversation");
      setMessageBusy(false);
    }
  }

  const hasBackground = Boolean(profile.profile_background_url);

  return (
    <div className={`relative isolate min-h-[calc(100dvh-68px)] overflow-hidden ${hasBackground ? "profile-has-background" : ""}`}>
      {profile.profile_background_url && <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 min-h-[110vh] bg-cover bg-no-repeat opacity-90" style={{ backgroundImage: `url(${JSON.stringify(profile.profile_background_url)})`, backgroundPosition: `center ${profile.profile_background_position}` }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(7_7_12/0.2)_0%,rgb(7_7_12/0.72)_32%,var(--bg-base)_78%),linear-gradient(90deg,rgb(7_7_12/0.48),transparent_48%,rgb(7_7_12/0.45))]" />
      </div>}
      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-4 md:px-8">
      <BackButton className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]" />

      <header className={`relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--media-border)] shadow-2xl ${hasBackground ? "bg-[rgb(12_12_18/0.84)] backdrop-blur-xl" : "bg-[var(--bg-surface)]"}`}>
        <div className="relative h-48 sm:h-56 lg:h-64">
          {profile.banner_url ? <Image src={profile.banner_url} alt={`${profile.username ?? "User"}'s profile banner`} fill priority sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" /> : <div className="size-full bg-[radial-gradient(circle_at_70%_20%,rgb(var(--accent-2-rgb)/0.5),transparent_38%),radial-gradient(circle_at_20%_80%,rgb(var(--accent-rgb)/0.55),transparent_42%),linear-gradient(145deg,#171724,#08080d)]" />}
          <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-surface)_0%,rgb(10_10_15/0.62)_42%,transparent_76%)]" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 sm:gap-5 sm:p-7">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-[var(--accent)] bg-[var(--bg-elevated)] shadow-[0_0_0_4px_rgb(10_10_15/0.88),0_0_24px_rgb(var(--accent-rgb)/0.36)] sm:size-24">
              {profile.avatar_url ? <Image src={profile.avatar_url} alt={`${profile.username ?? "User"}'s avatar`} fill priority sizes="96px" className="object-cover" /> : <div className="grid size-full place-items-center font-display text-3xl font-bold text-[var(--text-muted)]">{profile.username?.[0]?.toUpperCase() ?? "?"}</div>}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2.5"><h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">{profile.username}</h1><span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.16)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]"><ShieldCheck className="size-3" /> {profile.privacy === "public" ? "Public" : profile.privacy === "friends" ? "Friends" : "Private"}</span></div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] sm:text-sm"><CalendarDays className="size-3.5" /> PBox member since {joined}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{profile.bio || "Tracking stories, worlds, and favourites across PBox."}</p>
            <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <Button asChild variant="glass" size="sm"><Link href="/settings"><SettingsIcon className="size-4" /> Edit profile</Link></Button>
            ) : relationshipState === "friends" ? (
              <>
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[rgb(var(--accent-rgb)/0.22)] bg-[rgb(var(--accent-rgb)/0.1)] px-3 text-xs font-bold text-[var(--accent)]"><UserCheck className="size-4" /> Friends</span>
                <Button size="sm" onClick={() => void openMessage()} loading={messageBusy}><MessageCircle className="size-4" /> Message</Button>
              </>
            ) : relationshipState === "incoming" ? (
              <Button asChild size="sm"><Link href="/friends"><UserPlus className="size-4" /> Respond to request</Link></Button>
            ) : relationshipState === "outgoing" || requested ? (
              <Button size="sm" variant="glass" disabled><UserCheck className="size-4" /> Request sent</Button>
            ) : relationshipState === "blocked" ? null : signedIn ? (
              <Button size="sm" onClick={() => void addFriend()}><UserPlus className="size-4" /> Add friend</Button>
            ) : (
              <Button asChild size="sm"><Link href={`/login?next=/profile/${encodeURIComponent(profile.username ?? "")}`}><UserPlus className="size-4" /> Sign in to connect</Link></Button>
            )}
            </div>
          </div>
          {visible && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Profile statistics">
              {[
                { label: "Collections", value: collections.length, icon: FolderHeart },
                { label: "Recent titles", value: uniqueTitles, icon: Activity },
                { label: "Completions", value: completed, icon: Award },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex min-w-[132px] shrink-0 items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--glass)] px-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)]"><Icon className="size-4" /></span>
                  <span><strong className="block font-mono text-sm leading-none">{value}</strong><span className="mt-1 block text-[10px] text-[var(--text-muted)]">{label}</span></span>
                </div>
              ))}
            </div>
          )}
          </div>
      </header>

      {!visible ? <div className="mt-6"><EmptyState icon={profile.privacy === "friends" ? <Users className="size-10" /> : <Lock className="size-10" />} title={profile.privacy === "friends" ? "Friends only" : "Private profile"} description={profile.privacy === "friends" ? "Add this person as a friend to see their collections and activity." : "This user has set their profile to private."} /></div> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-6">
            {featured.length > 0 && <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Featured collections</h2><span className="text-xs text-[var(--text-muted)]">Curated by {profile.username}</span></div><div className="grid gap-3 sm:grid-cols-3">{featured.map((collection, index) => <Link key={collection.id} href={`/collections/${collection.id}`} className="group relative min-h-48 overflow-hidden rounded-2xl border border-[var(--media-border)] bg-[var(--bg-surface)]"><>{collection.cover_url ? <Image src={collection.cover_url} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /> : recentPosters[index]?.poster_url ? <Image src={recentPosters[index].poster_url!} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover opacity-60 transition duration-500 group-hover:scale-105" /> : <div className="size-full bg-[linear-gradient(145deg,rgb(var(--accent-rgb)/0.35),rgb(var(--accent-2-rgb)/0.12))]" />}</><div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Featured</p><h3 className="mt-1 font-display text-lg font-bold">{collection.name}</h3>{collection.description && <p className="mt-1 line-clamp-2 text-xs text-white/65">{collection.description}</p>}</div></Link>)}</div></section>}

            <section>
              <div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Timeline</p><h2 className="font-display text-xl font-bold">Recent activity</h2></div><Clock3 className="size-4 text-[var(--text-muted)]" /></div>
              {activity.length > 0 && <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ACTIVITY_FILTERS.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => setActivityFilter(id)} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-bold transition ${activityFilter === id ? "border-transparent bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:text-[var(--text)]"}`}>
                    {label} <span className="ml-1 opacity-65">{activityCounts[id]}</span>
                  </button>
                ))}
              </div>}
              {filteredActivity.length === 0 ? <p className="pb-uiverse-card rounded-2xl p-6 text-sm text-[var(--text-muted)]">{activity.length === 0 ? "No recent activity." : "No recent activity in this section."}</p> : (
                <div className="relative space-y-3 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-px before:bg-[linear-gradient(var(--accent),transparent)]">
                  {filteredActivity.map((row, index) => {
                    const href = activityHref(row);
                    const detail = progressDetail(row);
                    const content = <><div className="relative z-10 shrink-0"><div className="relative h-[74px] w-[52px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-sm">{row.poster_url ? <Image src={row.poster_url} alt="" fill sizes="52px" className="object-cover" /> : <div className="grid size-full place-items-center"><Activity className="size-4 text-[var(--text-muted)]" /></div>}</div><span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-[var(--bg-base)] bg-[var(--accent)] text-[9px] font-black text-white">{index + 1}</span></div><div className="min-w-0 flex-1 py-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[rgb(var(--accent-rgb)/0.16)] bg-[rgb(var(--accent-rgb)/0.08)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">{VERB_LABEL[row.verb] ?? row.verb}</span>{row.media_type && <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{row.media_type.replace(/_/g, " ")}</span>}{detail && <span className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-2 py-0.5 text-[9px] font-bold text-[var(--text-secondary)]">{detail}</span>}</div>{row.title && <p className="mt-1.5 line-clamp-1 font-display text-base font-bold">{row.title}</p>}<p className="mt-1 text-xs text-[var(--text-secondary)]">{profile.username} {detail ? `reached ${detail}` : `${VERB_LABEL[row.verb] ?? row.verb} this title`}</p><time className="mt-1.5 block text-[10px] text-[var(--text-muted)]">{new Date(row.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time></div>{href && <ChevronRight className="mt-7 size-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />}</>;
                    const className = "group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--glass)_90%,transparent)] p-3 shadow-[0_12px_32px_rgba(15,23,42,.05)] backdrop-blur-md transition hover:border-[rgb(var(--accent-rgb)/0.22)] hover:bg-[var(--glass-strong)]";
                    return href ? <Link key={row.id} href={href} className={className}>{content}</Link> : <div key={row.id} className={className}>{content}</div>;
                  })}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-5">
            <section><h2 className="mb-3 font-display font-bold">Badges</h2><div className="space-y-2">{badges.map(({ label, description, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--glass)] p-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]"><Icon className="size-5" /></div><div className="min-w-0"><h3 className="text-sm font-semibold">{label}</h3><p className="truncate text-[10px] text-[var(--text-muted)]">{description}</p></div></div>)}</div></section>
            {recentPosters.length > 0 && <section><div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">On the shelf</p><h2 className="font-display font-bold">Recent showcase</h2></div><div className="-mr-4 flex snap-x gap-2.5 overflow-x-auto pb-2 pr-4 scrollbar-none lg:mr-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pr-0">{recentPosters.map((row) => { const href = activityHref(row); const card = <><Image src={row.poster_url!} alt={row.title ?? "Recent title"} fill sizes="(max-width: 1024px) 130px, 150px" className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-2.5 text-white"><p className="line-clamp-2 text-xs font-bold leading-tight">{row.title ?? "Recent title"}</p><span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-white/60">{VERB_LABEL[row.verb] ?? row.verb}</span></div></>; const className = "group relative aspect-[2/3] w-[118px] shrink-0 snap-start overflow-hidden rounded-xl border border-[var(--border)] shadow-[0_12px_28px_rgba(0,0,0,.12)] lg:w-auto"; return href ? <Link key={row.id} href={href} className={className}>{card}</Link> : <div key={row.id} className={className}>{card}</div>; })}</div></section>}
          </aside>
        </div>
      )}
      </div>
    </div>
  );
}
