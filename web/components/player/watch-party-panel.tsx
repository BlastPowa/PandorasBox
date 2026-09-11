"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Copy, Crown, LogOut, Radio, UserPlus, UsersRound, X } from "lucide-react";
import { fetchProfilesByIds, listMyFriendships, type ProfileSummary } from "@/lib/friends/friends";
import { createClient } from "@/lib/supabase/client";
import {
  answerWatchPartyInvite,
  createWatchParty,
  getWatchPartyById,
  inviteFriendToWatchParty,
  joinWatchParty,
  leaveWatchParty,
  listPendingWatchPartyInvites,
  listWatchPartyMembers,
  updateWatchPartyMedia,
  type WatchPartyInvite,
  type WatchPartyMedia,
  type WatchPartyMember,
  type WatchPartyRoom,
} from "@/lib/watch-party/watch-party";

const SESSION_KEY = "pbox.watch-party.active";

type PlaybackPayload = {
  senderId: string;
  mediaKey: string;
  season: number | null;
  episode: number | null;
  currentTime: number;
  playing: boolean;
  playbackRate: number;
  sentAt: number;
};

type RemoteMedia = { season: number | null; episode: number | null };

function inviteUrl(room: WatchPartyRoom): string {
  const url = new URL(room.watch_path, window.location.origin);
  url.searchParams.set("party", room.code);
  return url.toString();
}

function samePlaybackMedia(payload: Pick<PlaybackPayload, "mediaKey" | "season" | "episode">, media: WatchPartyMedia): boolean {
  return payload.mediaKey === media.mediaKey && payload.season === media.season && payload.episode === media.episode;
}

function Avatar({ profile, online }: { profile?: ProfileSummary; online?: boolean }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-black text-white/70">
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : (profile?.username?.slice(0, 1).toUpperCase() ?? "P")}
      {online && <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#09090b] bg-emerald-400" />}
    </span>
  );
}

export function WatchPartyPanel({
  open,
  onClose,
  videoRef,
  media,
  onRemoteMediaChange,
  onInviteCountChange,
}: {
  open: boolean;
  onClose: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  media: WatchPartyMedia;
  onRemoteMediaChange?: (media: RemoteMedia) => void;
  onInviteCountChange?: (count: number) => void;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [members, setMembers] = useState<WatchPartyMember[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileSummary>>(new Map());
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [invites, setInvites] = useState<WatchPartyInvite[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const applyingRemoteRef = useRef(false);
  const lastBroadcastRef = useRef(0);

  const isHost = Boolean(room && userId && room.host_id === userId);

  const refreshMembers = useCallback(async (roomId: string) => {
    const next = await listWatchPartyMembers(roomId);
    setMembers(next);
    const ids = Array.from(new Set(next.map((member) => member.user_id)));
    const nextProfiles = await fetchProfilesByIds(ids);
    setProfiles((current) => new Map([...current, ...nextProfiles]));
  }, []);

  const refreshInvites = useCallback(async () => {
    try {
      const next = await listPendingWatchPartyInvites();
      setInvites(next);
      onInviteCountChange?.(next.length);
    } catch {
      setInvites([]);
      onInviteCountChange?.(0);
    }
  }, [onInviteCountChange]);

  const loadFriends = useCallback(async (uid: string) => {
    const rows = await listMyFriendships();
    const ids = rows
      .filter((row) => row.status === "accepted")
      .map((row) => row.requester === uid ? row.addressee : row.requester);
    setFriendIds(ids);
    const nextProfiles = await fetchProfilesByIds(ids);
    setProfiles((current) => new Map([...current, ...nextProfiles]));
  }, []);

  const activateRoom = useCallback(async (nextRoom: WatchPartyRoom) => {
    if (nextRoom.media_key !== media.mediaKey || nextRoom.watch_path !== window.location.pathname) {
      window.location.assign(inviteUrl(nextRoom));
      return;
    }
    setRoom(nextRoom);
    setJoinCode(nextRoom.code);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: nextRoom.id, code: nextRoom.code }));
    const url = new URL(window.location.href);
    url.searchParams.set("party", nextRoom.code);
    window.history.replaceState({}, "", url);
    await refreshMembers(nextRoom.id);
  }, [media.mediaKey, refreshMembers]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      setUserId(data.user.id);
      await Promise.allSettled([loadFriends(data.user.id), refreshInvites()]);

      const partyCode = new URLSearchParams(window.location.search).get("party");
      try {
        if (partyCode) {
          const nextRoom = await joinWatchParty(partyCode);
          if (active) await activateRoom(nextRoom);
          return;
        }
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as { id?: string; code?: string };
        if (!parsed.id || !parsed.code) return;
        const existing = await getWatchPartyById(parsed.id);
        if (existing?.status === "active" && active) await activateRoom(await joinWatchParty(parsed.code));
        else sessionStorage.removeItem(SESSION_KEY);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    });
    return () => { active = false; };
  }, [activateRoom, loadFriends, refreshInvites]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const inviteChannel = supabase
      .channel(`watch-party-invites:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_party_invites", filter: `recipient_id=eq.${userId}` }, () => void refreshInvites())
      .subscribe();
    return () => { void supabase.removeChannel(inviteChannel); };
  }, [refreshInvites, userId]);

  const applyPlayback = useCallback((payload: PlaybackPayload) => {
    if (payload.senderId === userId) return;
    if (!samePlaybackMedia(payload, media)) {
      if (payload.mediaKey === media.mediaKey && payload.episode != null) {
        onRemoteMediaChange?.({ season: payload.season, episode: payload.episode });
      }
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    applyingRemoteRef.current = true;
    if (Math.abs(video.currentTime - payload.currentTime) > 1.15) video.currentTime = Math.max(0, payload.currentTime);
    if (Math.abs(video.playbackRate - payload.playbackRate) > 0.01) video.playbackRate = payload.playbackRate;
    if (payload.playing && video.paused) void video.play().catch(() => undefined);
    if (!payload.playing && !video.paused) video.pause();
    window.setTimeout(() => { applyingRemoteRef.current = false; }, 500);
  }, [media, onRemoteMediaChange, userId, videoRef]);

  const broadcastPlayback = useCallback((event: "playback" | "control-request") => {
    if (!room || !userId || !channelRef.current) return;
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.currentTime)) return;
    const payload: PlaybackPayload = {
      senderId: userId,
      mediaKey: media.mediaKey,
      season: media.season,
      episode: media.episode,
      currentTime: video.currentTime,
      playing: !video.paused,
      playbackRate: video.playbackRate,
      sentAt: Date.now(),
    };
    void channelRef.current.send({ type: "broadcast", event, payload });
  }, [media, room, userId, videoRef]);

  useEffect(() => {
    if (!room || !userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`watch-party:${room.id}`, { config: { presence: { key: userId } } })
      .on("broadcast", { event: "playback" }, ({ payload }) => applyPlayback(payload as PlaybackPayload))
      .on("broadcast", { event: "control-request" }, ({ payload }) => {
        if (room.host_id !== userId) return;
        applyPlayback(payload as PlaybackPayload);
        window.setTimeout(() => broadcastPlayback("playback"), 80);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userId?: string }>();
        setOnlineIds(new Set(Object.values(state).flat().map((entry) => entry.userId).filter((id): id is string => Boolean(id))));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_party_members", filter: `room_id=eq.${room.id}` }, () => void refreshMembers(room.id))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "watch_party_rooms", filter: `id=eq.${room.id}` }, ({ new: changed }) => {
        const next = changed as WatchPartyRoom;
        if (next.status === "ended") {
          setRoom(null);
          setMembers([]);
          sessionStorage.removeItem(SESSION_KEY);
          setNotice("The host ended this Watch Party.");
          return;
        }
        setRoom(next);
        if (next.media_key === media.mediaKey && (next.season !== media.season || next.episode !== media.episode)) {
          onRemoteMediaChange?.({ season: next.season, episode: next.episode });
        } else if (next.media_key !== media.mediaKey) {
          window.location.assign(inviteUrl(next));
        }
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        channelRef.current = channel;
        void channel.track({ userId, joinedAt: new Date().toISOString() });
        if (room.host_id === userId) window.setTimeout(() => broadcastPlayback("playback"), 100);
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [applyPlayback, broadcastPlayback, media.episode, media.mediaKey, media.season, onRemoteMediaChange, refreshMembers, room, userId]);

  useEffect(() => {
    if (!room || !userId || room.host_id !== userId) return;
    if (room.media_key === media.mediaKey && room.season === media.season && room.episode === media.episode && room.watch_path === media.watchPath) return;
    void updateWatchPartyMedia(room.id, media).then(() => {
      setRoom((current) => current ? {
        ...current,
        media_key: media.mediaKey,
        title: media.title,
        media_type: media.mediaType,
        season: media.season,
        episode: media.episode,
        watch_path: media.watchPath,
      } : current);
    }).catch(() => undefined);
  }, [media, room, userId]);

  useEffect(() => {
    if (!room || !userId) return;
    const video = videoRef.current;
    if (!video) return;
    const send = () => {
      if (applyingRemoteRef.current) return;
      broadcastPlayback(room.host_id === userId ? "playback" : "control-request");
    };
    const periodic = () => {
      if (room.host_id !== userId || applyingRemoteRef.current) return;
      const now = Date.now();
      if (now - lastBroadcastRef.current < 2500) return;
      lastBroadcastRef.current = now;
      broadcastPlayback("playback");
    };
    video.addEventListener("play", send);
    video.addEventListener("pause", send);
    video.addEventListener("seeked", send);
    video.addEventListener("ratechange", send);
    video.addEventListener("timeupdate", periodic);
    return () => {
      video.removeEventListener("play", send);
      video.removeEventListener("pause", send);
      video.removeEventListener("seeked", send);
      video.removeEventListener("ratechange", send);
      video.removeEventListener("timeupdate", periodic);
    };
  }, [broadcastPlayback, room, userId, videoRef]);

  const createRoom = async () => {
    setBusy(true); setError(null); setNotice(null);
    try { await activateRoom(await createWatchParty(media)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create Watch Party."); }
    finally { setBusy(false); }
  };

  const joinRoom = async (code = joinCode) => {
    if (!code.trim()) return;
    setBusy(true); setError(null); setNotice(null);
    try { await activateRoom(await joinWatchParty(code)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not join Watch Party."); }
    finally { setBusy(false); }
  };

  const exitRoom = async () => {
    if (!room) return;
    setBusy(true); setError(null);
    try {
      await leaveWatchParty(room);
      const url = new URL(window.location.href);
      url.searchParams.delete("party");
      window.history.replaceState({}, "", url);
      sessionStorage.removeItem(SESSION_KEY);
      setRoom(null); setMembers([]); setOnlineIds(new Set());
      setNotice(isHost ? "Watch Party ended." : "You left the Watch Party.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not leave Watch Party."); }
    finally { setBusy(false); }
  };

  const copyInvite = async () => {
    if (!room) return;
    await navigator.clipboard.writeText(inviteUrl(room));
    setNotice("Invite link copied.");
  };

  const inviteFriend = async (friendId: string) => {
    if (!room) return;
    setError(null);
    try {
      await inviteFriendToWatchParty(room.id, friendId);
      setNotice(`Invite sent to ${profiles.get(friendId)?.username ?? "friend"}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send invite."); }
  };

  const respondInvite = async (invite: WatchPartyInvite, accept: boolean) => {
    setBusy(true); setError(null);
    try {
      const nextRoom = await answerWatchPartyInvite(invite, accept);
      await refreshInvites();
      if (nextRoom) await activateRoom(nextRoom);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update invite."); }
    finally { setBusy(false); }
  };

  const memberIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members]);
  const availableFriends = friendIds.filter((id) => !memberIds.has(id));

  if (!open) return null;

  return (
    <aside className="absolute inset-y-0 right-0 z-[70] flex w-full flex-col border-l border-white/10 bg-[#08080b]/96 text-white shadow-[-24px_0_80px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:w-[390px]" role="dialog" aria-modal="true" aria-label="Watch Party">
      <div className="flex h-16 items-center gap-3 border-b border-white/8 px-4">
        <span className="grid size-9 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]"><UsersRound className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight">Watch Party</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Friends + live sync</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/6 text-white/60 transition hover:bg-white/12 hover:text-white" aria-label="Close Watch Party"><X className="size-4" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
        {!userId ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-5 text-center">
            <UsersRound className="mx-auto size-7 text-white/30" />
            <p className="mt-3 text-sm font-bold">Sign in to use Watch Party</p>
            <p className="mt-1 text-xs leading-relaxed text-white/40">Rooms and invites use your Pandora&apos;s Box friends list.</p>
          </div>
        ) : !room ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Currently watching</p>
              <p className="mt-1 truncate text-base font-extrabold">{media.title}</p>
              <p className="mt-1 text-xs text-white/40">{media.episode ? `${media.season ? `Season ${media.season} · ` : ""}Episode ${media.episode}` : media.mediaType === "movie" ? "Movie" : "Series"}</p>
            </div>

            <button type="button" onClick={() => void createRoom()} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-50">
              <Radio className="size-4" /> Create New Room
            </button>

            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <p className="text-xs font-bold text-white/70">Join Existing Room</p>
              <div className="mt-2 flex gap-2">
                <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") void joinRoom(); }} placeholder="ROOM CODE" maxLength={8} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white outline-none placeholder:text-white/25 focus:border-white/25" />
                <button type="button" onClick={() => void joinRoom()} disabled={busy || !joinCode.trim()} className="rounded-xl bg-[var(--accent)] px-4 text-xs font-black text-black disabled:opacity-40">Join</button>
              </div>
            </div>

            {invites.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Friend invites</p>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="rounded-xl border border-[rgb(var(--accent-rgb)/0.24)] bg-[rgb(var(--accent-rgb)/0.08)] p-3">
                      <p className="truncate text-sm font-bold">{invite.room?.title ?? "Watch Party"}</p>
                      <p className="mt-0.5 text-[10px] text-white/40">Room {invite.room?.code}</p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => void respondInvite(invite, true)} className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-black text-black">Join</button>
                        <button type="button" onClick={() => void respondInvite(invite, false)} className="rounded-lg bg-white/8 px-3 py-2 text-xs font-bold text-white/60">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--accent-rgb)/0.24)] bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.12),rgba(255,255,255,.025))] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300"><span className="size-1.5 animate-pulse rounded-full bg-emerald-300" /> Live</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black">{room.title}</p>
                  <p className="mt-1 text-xs text-white/45">{room.episode ? `${room.season ? `Season ${room.season} · ` : ""}Episode ${room.episode}` : room.media_type === "movie" ? "Movie" : "Series"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-black/25 p-2.5">
                <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Room code</p><p className="mt-0.5 font-mono text-sm font-black tracking-[0.18em]">{room.code}</p></div>
                <button type="button" onClick={() => void copyInvite()} className="grid size-9 place-items-center rounded-lg bg-white/8 text-white/65 hover:bg-white/12 hover:text-white" aria-label="Copy invite link"><Copy className="size-4" /></button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">In the room</p><span className="text-[10px] font-bold text-white/35">{onlineIds.size}/{members.length} online</span></div>
              <div className="space-y-1.5">
                {members.map((member) => {
                  const profile = profiles.get(member.user_id);
                  return (
                    <div key={member.user_id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.035] px-3 py-2.5">
                      <Avatar profile={profile} online={onlineIds.has(member.user_id)} />
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{profile?.username ?? "PBox member"}{member.user_id === userId ? " (You)" : ""}</p><p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/30">{member.role}</p></div>
                      {member.role === "host" && <Crown className="size-4 text-amber-300" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {isHost && availableFriends.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Invite friends</p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {availableFriends.map((friendId) => {
                    const profile = profiles.get(friendId);
                    return (
                      <div key={friendId} className="flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                        <Avatar profile={profile} />
                        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{profile?.username ?? "Friend"}</p>
                        <button type="button" onClick={() => void inviteFriend(friendId)} className="inline-flex items-center gap-1 rounded-lg bg-white/8 px-2.5 py-2 text-[10px] font-bold text-white/65 transition hover:bg-white/14 hover:text-white"><UserPlus className="size-3.5" /> Invite</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[10px] leading-relaxed text-white/35">
              Playback is synchronised to the host. Play, pause and seek requests from friends are relayed through the host, with periodic drift correction.
            </div>
          </div>
        )}

        {(error || notice) && <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${error ? "border-red-400/20 bg-red-400/8 text-red-200" : "border-emerald-400/15 bg-emerald-400/8 text-emerald-200"}`}>{error ?? notice}</div>}
      </div>

      {room && (
        <div className="border-t border-white/8 p-4">
          <button type="button" onClick={() => void exitRoom()} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
            {isHost ? <X className="size-4" /> : <LogOut className="size-4" />} {isHost ? "End Watch Party" : "Leave Watch Party"}
          </button>
        </div>
      )}
    </aside>
  );
}
