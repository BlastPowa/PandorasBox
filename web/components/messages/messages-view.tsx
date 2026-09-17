"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Archive, Camera, Check, CheckCheck, ChevronLeft, Edit3, ImagePlus, Laugh, Loader2, MessageCircle, MoreHorizontal, Pin, Plus, Reply, Search, Send, Trash2, UserMinus, Users, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui-fx/button";
import { createClient } from "@/lib/supabase/client";
import { fetchProfilesByIds, listMyFriendships, type ProfileSummary } from "@/lib/friends/friends";
import { conversationAction, createConversation, getConversation, listConversations, messageAction, sendMessage } from "@/lib/messages/client";
import type { Conversation, ConversationDetail, Message, MessageMedia } from "@/lib/messages/types";
import { cn } from "@/lib/utils";

const CHAT_ATMOSPHERES = {
  midnight: { label: "Slate Mist", background: "radial-gradient(circle at 15% 10%, rgba(96,165,250,.24) 0%, transparent 42%), linear-gradient(145deg, var(--bg-surface), var(--bg-base))" },
  crimson: { label: "Rose Paper", background: "radial-gradient(circle at 85% 15%, rgba(251,113,133,.28) 0%, transparent 45%), linear-gradient(145deg, var(--bg-surface), var(--bg-base))" },
  aurora: { label: "Mint Glow", background: "radial-gradient(circle at 20% 10%, rgba(45,212,191,.24) 0%, transparent 42%), radial-gradient(circle at 85% 70%, rgba(167,139,250,.22) 0%, transparent 45%), var(--bg-base)" },
  ocean: { label: "Sky Wash", background: "radial-gradient(circle at 80% 10%, rgba(56,189,248,.28) 0%, transparent 45%), linear-gradient(145deg, var(--bg-surface), var(--bg-base))" },
  sunset: { label: "Peach Bloom", background: "radial-gradient(circle at 80% 15%, rgba(251,146,60,.26) 0%, transparent 42%), radial-gradient(circle at 15% 80%, rgba(244,114,182,.2) 0%, transparent 45%), var(--bg-base)" },
  royal: { label: "Lavender Haze", background: "radial-gradient(circle at 20% 10%, rgba(139,92,246,.26) 0%, transparent 42%), radial-gradient(circle at 85% 75%, rgba(250,204,21,.16) 0%, transparent 42%), var(--bg-base)" },
} as const;

type InboxFilter = "all" | "unread" | "pinned" | "direct" | "groups";

const INBOX_FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "pinned", label: "Pinned" },
  { id: "direct", label: "DMs" },
  { id: "groups", label: "Groups" },
];

function formatConversationTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDelta = Math.round((startOfToday - startOfMessageDay) / 86_400_000);
  if (dayDelta === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (dayDelta === 1) return "Yesterday";
  if (dayDelta > 1 && dayDelta < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function useMobileChatViewport(active: boolean, containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!active || !window.matchMedia("(max-width: 767px)").matches) return;
    const container = containerRef.current;
    const visualViewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!container) return;
        container.style.height = `${Math.round(visualViewport?.height ?? window.innerHeight)}px`;
        container.style.transform = `translateY(${Math.max(0, Math.round(visualViewport?.offsetTop ?? 0))}px)`;
      });
    };
    update();
    visualViewport?.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      if (container) {
        container.style.height = "";
        container.style.transform = "";
      }
    };
  }, [active, containerRef]);
}

export function MessagesView({ initialConversationId = null, embedded = false }: { initialConversationId?: string | null; embedded?: boolean }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const shellRef = useRef<HTMLDivElement>(null);
  useMobileChatViewport(Boolean(selectedId && !embedded), shellRef);
  const load = useCallback(async () => {
    try {
      const [{ data }, result] = await Promise.all([createClient().auth.getUser(), listConversations()]);
      const userId = data.user?.id ?? null;
      setMyId(userId);
      setConversations(result.conversations);
      if (userId) {
        try {
          const saved = JSON.parse(window.localStorage.getItem(`pbox-message-pins:${userId}`) ?? "[]") as unknown;
          setPinnedIds(Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []);
        } catch {
          setPinnedIds([]);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load messages");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("pbox:messages-change", refresh);
    return () => window.removeEventListener("pbox:messages-change", refresh);
  }, [load]);

  const setPinned = useCallback((conversationId: string) => {
    if (!myId) return;
    setPinnedIds((current) => {
      const next = current.includes(conversationId) ? current.filter((id) => id !== conversationId) : [conversationId, ...current];
      window.localStorage.setItem(`pbox-message-pins:${myId}`, JSON.stringify(next));
      return next;
    });
  }, [myId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations
      .filter((conversation) => {
        if (needle) {
          const latest = conversation.latestMessage?.body ?? conversation.latestMessage?.shared_entity?.title ?? "";
          if (!`${conversation.title} ${latest}`.toLowerCase().includes(needle)) return false;
        }
        if (inboxFilter === "unread") return conversation.unreadCount > 0;
        if (inboxFilter === "pinned") return pinnedIds.includes(conversation.id);
        if (inboxFilter === "direct") return conversation.type === "direct";
        if (inboxFilter === "groups") return conversation.type === "group";
        return true;
      })
      .sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id);
        const bPinned = pinnedIds.includes(b.id);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [conversations, inboxFilter, pinnedIds, query]);
  const unreadThreads = useMemo(() => conversations.filter((conversation) => conversation.unreadCount > 0).length, [conversations]);
  const directThreads = useMemo(() => conversations.filter((conversation) => conversation.type === "direct").length, [conversations]);
  const groupThreads = conversations.length - directThreads;

  return (
    <div
      ref={shellRef}
      className={cn("overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl", embedded ? "min-h-[620px] rounded-[var(--radius-xl)]" : "h-[calc(100dvh-var(--app-header-height)-var(--app-bottom-nav-height)-2rem)] min-h-[520px] rounded-[var(--radius-xl)] md:min-h-[620px]", selectedId && !embedded && "max-md:fixed max-md:inset-0 max-md:z-[60] max-md:h-dvh max-md:min-h-0 max-md:rounded-none max-md:border-0 max-md:pt-[var(--safe-top)]")}
    >
      <div className="grid size-full md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
        <aside className={cn("flex min-h-0 flex-col border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_94%,transparent)]", selectedId && "hidden md:flex")}>
          <div className="space-y-4 border-b border-[var(--border)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--accent)]">Social inbox</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">Messages</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {loading ? "Loading conversations…" : unreadThreads > 0 ? `${unreadThreads} unread ${unreadThreads === 1 ? "thread" : "threads"}` : conversations.length > 0 ? "You’re caught up" : "Start a conversation with a friend"}
                </p>
              </div>
              <Button size="icon" variant="glass" className="size-11 shrink-0 rounded-full" aria-label="New conversation" onClick={() => setCreateOpen(true)}>
                <Plus className="size-5" />
              </Button>
            </div>
            <label className="flex h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-3 shadow-sm transition focus-within:border-[rgb(var(--accent-rgb)/0.55)] focus-within:ring-2 focus-within:ring-[rgb(var(--accent-rgb)/0.12)]">
              <Search className="size-4 text-[var(--text-muted)]" />
              <span className="sr-only">Search conversations</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {INBOX_FILTERS.map(({ id: filter, label }) => (
                <button key={filter} type="button" onClick={() => setInboxFilter(filter)} className={cn("min-h-9 shrink-0 rounded-full border px-3 text-xs font-bold transition", inboxFilter === filter ? "border-transparent bg-[var(--accent)] text-white shadow-sm" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:text-[var(--text)]")}>
                  {label}{filter === "unread" && unreadThreads > 0 ? ` ${unreadThreads}` : filter === "pinned" && pinnedIds.length > 0 ? ` ${pinnedIds.length}` : filter === "direct" && directThreads > 0 ? ` ${directThreads}` : filter === "groups" && groupThreads > 0 ? ` ${groupThreads}` : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="space-y-2 px-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mx-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--glass)] p-6 text-center">
                <MessageCircle className="mx-auto size-7 text-[var(--accent)]" />
                <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">{query.trim() ? "No matches" : inboxFilter === "unread" ? "Inbox cleared" : inboxFilter === "pinned" ? "Nothing pinned yet" : "No conversations yet"}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {query.trim() ? "Try a different name or message." : inboxFilter === "unread" ? "New messages will appear here as they arrive." : inboxFilter === "pinned" ? "Pin a conversation to keep it at the top." : "Start a direct message or create a group with friends."}
                </p>
                {!query.trim() && inboxFilter === "all" && <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New conversation</Button>}
              </div>
            ) : (
              filtered.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} myId={myId} active={selectedId === conversation.id} pinned={pinnedIds.includes(conversation.id)} onPin={() => setPinned(conversation.id)} onClick={() => setSelectedId(conversation.id)} />)
            )}
          </div>
        </aside>
        <main className={cn("min-h-0", !selectedId && "hidden md:block")}>
          {selectedId ? (
            <ChatPanel
              key={selectedId}
              id={selectedId}
              myId={myId}
              onBack={() => {
                setSelectedId(null);
                if (initialConversationId) router.replace("/messages", { scroll: false });
                void load();
              }}
              onChanged={() => void load()}
            />
          ) : (
            <div className="grid size-full place-items-center p-8">
              <div className="max-w-sm text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--glass)] text-[var(--accent)] shadow-sm"><MessageCircle className="size-7" /></span>
                <h3 className="mt-5 font-display text-2xl font-extrabold tracking-tight">Pick up a conversation</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">Choose a thread from your inbox or start a new direct message or group.</p>
                <Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New conversation</Button>
              </div>
            </div>
          )}
        </main>
      </div>
      <NewConversationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setSelectedId(id);
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function ConversationRow({ conversation, myId, active, pinned, onPin, onClick }: { conversation: Conversation; myId: string | null; active: boolean; pinned: boolean; onPin: () => void; onClick: () => void }) {
  const other = conversation.members.find((member) => member.user_id !== myId)?.profile;
  const mine = conversation.members.find((member) => member.user_id === myId);
  const avatar = conversation.type === "direct" ? other?.avatar_url : null;
  return (
    <div className={cn("group mx-2 my-1 flex min-h-[74px] items-center rounded-2xl border border-transparent transition hover:border-[var(--border)] hover:bg-[var(--glass)]", active && "border-[rgb(var(--accent-rgb)/0.22)] bg-[rgb(var(--accent-rgb)/0.1)] shadow-sm", pinned && !active && "bg-[rgb(var(--accent-rgb)/0.04)]")}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left sm:px-3.5">
        <Avatar url={conversation.type === "group" ? conversation.avatar_url : (avatar ?? null)} label={conversation.title} group={conversation.type === "group"} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5"><strong className="truncate text-sm">{conversation.title}</strong>{pinned && <Pin className="size-3 shrink-0 fill-current text-[var(--accent)]" />}</span>
            <span className={cn("shrink-0 text-[10px] font-medium", conversation.unreadCount > 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>{formatConversationTimestamp(conversation.updated_at)}</span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-2">
            <span className="line-clamp-1 text-xs text-[var(--text-muted)]">{mine?.status === "invited" ? "Group invitation" : conversation.latestMessage?.deleted_at ? "Message removed" : (conversation.latestMessage?.body ?? conversation.latestMessage?.shared_entity?.title ?? (conversation.latestMessage?.media_attachment?.kind === "sticker" ? "Sticker" : conversation.latestMessage?.media_attachment?.kind === "gif" ? "GIF" : conversation.latestMessage?.media_attachment ? "Image" : "Start the conversation"))}</span>
            {conversation.unreadCount > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 font-mono text-[10px] font-bold text-white">{conversation.unreadCount}</span>}
          </span>
          {conversation.deliveryStatus && (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)]">
              <CheckCheck className="size-3" /> {conversation.deliveryStatus}
            </span>
          )}
        </span>
      </button>
      <button type="button" onClick={onPin} className={cn("mr-2 grid size-9 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--accent)] md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100", pinned && "text-[var(--accent)] md:opacity-100")} aria-label={pinned ? `Unpin ${conversation.title}` : `Pin ${conversation.title}`} title={pinned ? "Unpin conversation" : "Pin conversation"}>
        <Pin className={cn("size-4", pinned && "fill-current")} />
      </button>
    </div>
  );
}

function ChatPanel({ id, myId, onBack, onChanged }: { id: string; myId: string | null; onBack: () => void; onChanged: () => void }) {
  const [openedAt] = useState(() => Date.now());
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const typingSentAt = useRef(0);
  const messageListRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const swipeStart = useRef<{ messageId: string; x: number; y: number } | null>(null);
  const realtimeRefreshTimer = useRef<number | null>(null);
  const initialScrollComplete = useRef(false);
  const refresh = useCallback(async () => {
    const value = await getConversation(id);
    setDetail((current) => current && current.chatBackgroundPath === value.chatBackgroundPath && current.chatBackgroundUrl
      ? { ...value, chatBackgroundUrl: current.chatBackgroundUrl }
      : value);
  }, [id]);
  const scrollMessagesToBottom = useCallback(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, []);
  const load = useCallback(async () => {
    try {
      await refresh();
      await conversationAction(id, "read").catch(() => undefined);
      window.dispatchEvent(new CustomEvent("pbox:notifications-change"));
      window.dispatchEvent(new CustomEvent("pbox:messages-change"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open conversation");
    }
  }, [id, refresh]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  useEffect(() => {
    const supabase = createClient();
    const refreshSoon = (delay = 180) => {
      if (realtimeRefreshTimer.current) window.clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = window.setTimeout(() => void refresh(), delay);
    };
    const channel = supabase
      .channel(`conversation:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new as Message;
            if (incoming.sender_id !== myId) {
              const list = messageListRef.current;
              const wasNearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 120;
              setDetail((current) => {
                if (!current || current.messages.some((message) => message.id === incoming.id)) return current;
                const message = { ...incoming, reply: null };
                return { ...current, updated_at: incoming.created_at, latestMessage: message, messages: [...current.messages, message] };
              });
              if (wasNearBottom) window.requestAnimationFrame(() => scrollMessagesToBottom());
            }
          }
          refreshSoon(payload.eventType === "INSERT" ? 350 : 120);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${id}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_typing",
          filter: `conversation_id=eq.${id}`,
        },
        async () => {
          const cutoff = new Date(Date.now() - 6000).toISOString();
          const { data } = await supabase
            .from("conversation_typing")
            .select("user_id")
            .eq("conversation_id", id)
            .neq("user_id", myId ?? "")
            .gt("typed_at", cutoff);
          setTypingIds((data ?? []).map((row) => String(row.user_id)));
        },
      )
      .subscribe();
    const typingTimer = window.setInterval(async () => {
      const cutoff = new Date(Date.now() - 6000).toISOString();
      const { data } = await supabase
        .from("conversation_typing")
        .select("user_id")
        .eq("conversation_id", id)
        .neq("user_id", myId ?? "")
        .gt("typed_at", cutoff);
      setTypingIds((data ?? []).map((row) => String(row.user_id)));
    }, 2500);
    return () => {
      window.clearInterval(typingTimer);
      if (realtimeRefreshTimer.current) window.clearTimeout(realtimeRefreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [id, myId, refresh, scrollMessagesToBottom]);
  useEffect(() => {
    if (!detail || initialScrollComplete.current) return;
    initialScrollComplete.current = true;
    window.requestAnimationFrame(scrollMessagesToBottom);
  }, [detail, scrollMessagesToBottom]);
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight, 128)}px`;
  }, [draft]);

  async function type(value: string) {
    setDraft(value.slice(0, 2000));
    if (!myId || Date.now() - typingSentAt.current < 2000) return;
    typingSentAt.current = Date.now();
    await createClient().from("conversation_typing").upsert(
      {
        conversation_id: id,
        user_id: myId,
        typed_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" },
    );
  }
  function startReply(message: Message) {
    if (message.deleted_at || message.id.startsWith("optimistic-")) return;
    setReplyingTo(message);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }
  async function send() {
    if (!draft.trim() || sending) return;
    const body = draft.trim();
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const replyTarget = replyingTo;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: id,
      sender_id: myId ?? "",
      body,
      shared_entity: null,
      media_attachment: null,
      reply_to_id: replyTarget?.id ?? null,
      reply: replyTarget ? toReplyPreview(replyTarget) : null,
      edited_at: null,
      deleted_at: null,
      created_at: createdAt,
    };
    setDraft("");
    setReplyingTo(null);
    setDetail((current) =>
      current
        ? {
            ...current,
            updated_at: createdAt,
            latestMessage: optimisticMessage,
            messages: [...current.messages, optimisticMessage],
          }
        : current,
    );
    window.requestAnimationFrame(scrollMessagesToBottom);
    setSending(true);
    try {
      const sent = await sendMessage(id, body, undefined, undefined, replyTarget?.id);
      setDetail((current) =>
        current
          ? {
              ...current,
              latestMessage: current.latestMessage?.id === optimisticId ? { ...optimisticMessage, id: sent.id } : current.latestMessage,
              messages: current.messages.map((message) => (message.id === optimisticId ? { ...message, id: sent.id } : message)),
            }
          : current,
      );
      if (myId) void createClient().from("conversation_typing").delete().eq("conversation_id", id).eq("user_id", myId);
      onChanged();
    } catch (error) {
      setDetail((current) =>
        current
          ? {
              ...current,
              latestMessage: current.latestMessage?.id === optimisticId ? (current.messages.at(-2) ?? null) : current.latestMessage,
              messages: current.messages.filter((message) => message.id !== optimisticId),
            }
          : current,
      );
      setDraft((current) => current || body);
      setReplyingTo((current) => current ?? replyTarget);
      toast.error(error instanceof Error ? error.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  async function sendMedia(media: MessageMedia) {
    const replyTarget = replyingTo;
    setMediaBusy(true);
    try {
      await sendMessage(id, "", undefined, media, replyTarget?.id);
      setReplyingTo(null);
      setMediaOpen(false);
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send attachment");
      if (media.provider === "upload" && media.storagePath) void createClient().storage.from("message-media").remove([media.storagePath]);
    } finally {
      setMediaBusy(false);
    }
  }

  async function uploadMedia(file: File, kind: "image" | "sticker" = "image") {
    if (!myId) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      toast.error("Use a JPG, PNG, WebP, or GIF up to 10 MB");
      return;
    }
    setMediaBusy(true);
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] ?? "image";
    const storagePath = `${id}/${myId}/${crypto.randomUUID()}.${extension}`;
    try {
      const { error } = await createClient().storage.from("message-media").upload(storagePath, file, { contentType: file.type, cacheControl: "3600" });
      if (error) throw error;
      await sendMedia({ kind: kind === "sticker" ? "sticker" : file.type === "image/gif" ? "gif" : "image", provider: "upload", storagePath, alt: file.name.slice(0, 200) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image");
      void createClient().storage.from("message-media").remove([storagePath]);
      setMediaBusy(false);
    }
  }
  async function saveEdit(message: Message) {
    try {
      await messageAction(message.id, "edit", editText);
      setEditingId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not edit message");
    }
  }
  async function remove(message: Message) {
    try {
      await messageAction(message.id, "delete");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove message");
    }
  }

  if (!detail)
    return (
      <div className="grid size-full place-items-center">
        <Loader2 className="size-7 animate-spin text-[var(--accent)]" />
      </div>
    );
  const mine = detail.members.find((member) => member.user_id === myId);
  const activeMembers = detail.members.filter((member) => member.status === "active");
  const directMember = detail.type === "direct" ? detail.members.find((member) => member.user_id !== myId) : null;
  const typingNames = typingIds.map((userId) => detail.members.find((member) => member.user_id === userId)?.profile?.username ?? "Someone");
  const typingLabel = typingNames.length === 0
    ? null
    : typingNames.length === 1
      ? `${typingNames[0]} is typing…`
      : typingNames.length === 2
        ? `${typingNames[0]} and ${typingNames[1]} are typing…`
        : `${typingNames[0]}, ${typingNames[1]}, and ${typingNames.length - 2} others are typing…`;
  const seenCount = detail.latestMessage?.sender_id === myId ? activeMembers.filter((member) => member.user_id !== myId && member.last_read_at && new Date(member.last_read_at) >= new Date(detail.latestMessage!.created_at)).length : 0;
  if (mine?.status === "invited")
    return (
      <div className="grid size-full place-items-center p-6">
        <div className="glass max-w-md rounded-[var(--radius-xl)] p-6 text-center">
          <Users className="mx-auto size-10 text-[var(--accent)]" />
          <h2 className="mt-3 font-display text-2xl font-bold">Join {detail.title}?</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">New members can read messages sent after they join.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => void conversationAction(id, "accept").then(load)}>Accept</Button>
            <Button variant="outline" onClick={() => void conversationAction(id, "decline").then(onBack)}>
              Decline
            </Button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="relative flex size-full min-h-0 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ background: CHAT_ATMOSPHERES[detail.chatAtmosphere].background }} aria-hidden="true" />
      {detail.chatBackgroundUrl && <><div className="pointer-events-none absolute inset-0 bg-cover opacity-70" style={{ backgroundImage: `url(${detail.chatBackgroundUrl})`, backgroundPosition: detail.chatBackgroundPosition }} aria-hidden="true" /><div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--bg-base) 18%, transparent), color-mix(in srgb, var(--bg-base) 46%, transparent) 48%, color-mix(in srgb, var(--bg-base) 72%, transparent))" }} aria-hidden="true" /></>}
      <header className="relative z-[1] flex min-h-[calc(4rem+var(--safe-top))] items-center gap-3 border-b border-[var(--border)] px-3 pt-[var(--safe-top)] backdrop-blur-xl sm:min-h-16 sm:px-4 sm:pt-0" style={{ background: "color-mix(in srgb, var(--bg-surface) 82%, transparent)" }}>
        <button type="button" onClick={onBack} className="grid size-11 place-items-center rounded-full hover:bg-[var(--glass)] md:hidden" aria-label="Back to conversations">
          <ChevronLeft />
        </button>
        <Avatar url={detail.type === "direct" ? (directMember?.profile?.avatar_url ?? null) : detail.avatar_url} label={detail.title} group={detail.type === "group"} />
        {detail.type === "direct" && directMember?.profile?.username ? (
          <Link href={`/profile/${encodeURIComponent(directMember.profile.username)}`} className="min-w-0 flex-1 rounded-lg outline-none transition hover:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]">
            <h2 className="truncate font-display font-bold">{detail.title}</h2>
            <p className="truncate text-xs text-[var(--text-muted)]">{typingLabel ?? "Direct message · View profile"}</p>
          </Link>
        ) : (
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display font-bold">{detail.title}</h2>
            <p className="truncate text-xs text-[var(--text-muted)]">{typingLabel ?? `${activeMembers.length} members`}</p>
          </div>
        )}
        <Link href={`/messages/${id}/settings`} className="grid size-11 place-items-center rounded-full hover:bg-[var(--glass)]" aria-label="Conversation settings"><MoreHorizontal /></Link>
      </header>
      <div ref={messageListRef} className="relative z-[1] min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-4 sm:px-5">
        {detail.nextCursor && (
          <div className="mb-4 text-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const older = await getConversation(id, detail.nextCursor!);
                setDetail({
                  ...detail,
                  messages: [...older.messages, ...detail.messages],
                  nextCursor: older.nextCursor,
                });
              }}
            >
              Load older messages
            </Button>
          </div>
        )}
        <div className="space-y-1.5">
          {detail.messages.map((message) => {
            const own = message.sender_id === myId;
            const sender = detail.members.find((member) => member.user_id === message.sender_id)?.profile;
            return (
              <div
                id={`message-${message.id}`}
                key={message.id}
                className={cn("group relative flex min-w-0 touch-pan-y scroll-mt-4 items-end gap-2", own ? "justify-end" : "justify-start")}
                onTouchStart={(event) => { const touch = event.touches[0]; if (touch) swipeStart.current = { messageId: message.id, x: touch.clientX, y: touch.clientY }; }}
                onTouchEnd={(event) => {
                  const start = swipeStart.current;
                  const touch = event.changedTouches[0];
                  swipeStart.current = null;
                  if (!start || start.messageId !== message.id || !touch || !window.matchMedia("(max-width: 767px)").matches) return;
                  const deltaX = touch.clientX - start.x;
                  const deltaY = touch.clientY - start.y;
                  if (Math.abs(deltaX) >= 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) startReply(message);
                }}
              >
                {!message.deleted_at && !message.id.startsWith("optimistic-") && <button type="button" aria-label="Reply to message" onClick={() => startReply(message)} className={cn("absolute -top-5 z-[2] hidden size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] opacity-0 shadow-lg transition md:grid md:group-hover:opacity-100 md:focus-visible:opacity-100", own ? "right-12" : "left-12")}><Reply className="size-4" /></button>}
                {!own && (sender?.username ? <Link href={`/profile/${encodeURIComponent(sender.username)}`} aria-label={`View ${sender.username}'s profile`}><Avatar small url={sender.avatar_url ?? null} label={sender.username} /></Link> : <Avatar small url={sender?.avatar_url ?? null} label="Member" />)}
                <div
                  className={cn("min-w-0 max-w-[calc(100%-2.75rem)] rounded-2xl border px-3 py-2 shadow-sm sm:max-w-[68%]", own ? "rounded-br-md border-[var(--accent)] bg-[var(--accent)] text-white" : "rounded-bl-md border-[var(--border)] text-[var(--text-primary)] shadow-md backdrop-blur-xl")}
                  style={!own ? { background: "color-mix(in srgb, var(--bg-surface) 78%, transparent)" } : undefined}
                >
                  {!own && detail.type === "group" && <p className="mb-1 text-[10px] font-bold text-[var(--accent)]">{sender?.username ?? "Member"}</p>}
                  {message.reply_to_id && (
                    <ReplyPreview
                      message={message.reply}
                      members={detail.members}
                      own={own}
                      onOpen={() => document.getElementById(`message-${message.reply_to_id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    />
                  )}
                  {editingId === message.id ? (
                    <div className="flex gap-2">
                      <input value={editText} onChange={(event) => setEditText(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/45 bg-white/20 px-2 py-1 text-sm text-white outline-none placeholder:text-white/70" autoFocus />
                      <button onClick={() => void saveEdit(message)} aria-label="Save edit">
                        <Check className="size-4" />
                      </button>
                    </div>
                  ) : message.deleted_at ? (
                    <p className="text-sm italic opacity-65">Message removed</p>
                  ) : (
                    <>
                      {message.body && <MessageBody body={message.body} own={own} />}
                      {message.shared_entity && <SharedMessageCard card={message.shared_entity} own={own} />}
                      {message.media_attachment && <MessageMediaView media={message.media_attachment} />}
                    </>
                  )}
                  <div className="mt-1 flex items-center justify-end gap-2 text-[9px] opacity-60">
                    <span>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {message.edited_at ? " · edited" : ""}
                    </span>
                    {own && !message.deleted_at && (
                      <>
                        {message.body && openedAt - new Date(message.created_at).getTime() <= 15 * 60_000 && (
                          <button
                            aria-label="Edit message"
                            onClick={() => {
                              setEditingId(message.id);
                              setEditText(message.body ?? "");
                            }}
                          >
                            <Edit3 className="size-3" />
                          </button>
                        )}
                        <button aria-label="Delete message" onClick={() => void remove(message)}>
                          <Trash2 className="size-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {own && (sender?.username ? <Link href={`/profile/${encodeURIComponent(sender.username)}`} aria-label={`View ${sender.username}'s profile`}><Avatar small url={sender.avatar_url ?? null} label={sender.username} /></Link> : <Avatar small url={sender?.avatar_url ?? null} label="You" />)}
              </div>
            );
          })}
        </div>
        {detail.latestMessage?.sender_id === myId && (
          <p className="mt-2 flex items-center justify-end gap-1 text-right text-[10px] text-[var(--text-muted)]">
            <CheckCheck className="size-3" />
            {detail.latestMessage.id.startsWith("optimistic-") ? "Sending…" : seenCount > 0 ? (detail.type === "direct" ? "Seen" : `Seen by ${seenCount}`) : "Delivered"}
          </p>
        )}
      </div>
      {mediaOpen && <div className="relative z-[2]"><MediaPicker busy={mediaBusy} onClose={() => setMediaOpen(false)} onUpload={uploadMedia} onSend={sendMedia} /></div>}
      {typingLabel && <p className="relative z-[2] shrink-0 border-t border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--accent)] backdrop-blur-xl" style={{ background: "color-mix(in srgb, var(--bg-surface) 84%, transparent)" }}>{typingLabel}</p>}
      {replyingTo && (
        <div className="relative z-[2] flex items-center gap-3 border-t border-[var(--border)] px-3 py-2 backdrop-blur-xl sm:px-4" style={{ background: "color-mix(in srgb, var(--bg-elevated) 86%, transparent)" }}>
          <Reply className="size-4 shrink-0 text-[var(--accent)]" />
          <div className="min-w-0 flex-1 border-l-2 border-[var(--accent)] pl-3">
            <p className="truncate text-xs font-bold text-[var(--accent)]">Replying to {detail.members.find((member) => member.user_id === replyingTo.sender_id)?.profile?.username ?? "message"}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{messagePreview(replyingTo)}</p>
          </div>
          <button type="button" onClick={() => setReplyingTo(null)} className="grid size-11 shrink-0 place-items-center rounded-full" aria-label="Cancel reply"><X className="size-4" /></button>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="relative z-[2] flex w-full min-w-0 items-end gap-2 overflow-hidden border-t border-[var(--border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-4"
        style={{ background: "color-mix(in srgb, var(--bg-surface) 86%, transparent)" }}
      >
        <Button size="icon" type="button" variant="ghost" className="h-12 w-12 shrink-0 rounded-full" onClick={() => setMediaOpen((current) => !current)} aria-label="Add image, GIF, or sticker"><ImagePlus className="size-5" /></Button>
        <label className="min-h-11 min-w-0 flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 shadow-sm backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--bg-base) 72%, transparent)" }}>
          <span className="sr-only">Message</span>
          <textarea
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={(event) => void type(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            onPaste={(event) => {
              const image = Array.from(event.clipboardData.items).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
              if (!image) return;
              event.preventDefault();
              void uploadMedia(image);
            }}
            onFocus={() => {
              const list = messageListRef.current;
              if (list && list.scrollHeight - list.scrollTop - list.clientHeight < 160) {
                window.setTimeout(scrollMessagesToBottom, 80);
              }
            }}
            placeholder="Write a message"
            className="block min-h-6 max-h-32 w-full resize-none overflow-y-auto bg-transparent text-base leading-6 outline-none md:text-sm"
          />
        </label>
        <Button size="icon" type="submit" className="h-12 w-12 shrink-0 rounded-full" disabled={!draft.trim() || sending || mediaBusy} aria-label="Send message">
          {sending || mediaBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}

function MessageBody({ body, own }: { body: string; own: boolean }) {
  const parts = body.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
      {parts.map((part, index) =>
        /^https?:\/\//i.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className={cn("underline underline-offset-2", own ? "text-white" : "text-[var(--accent)]")}>
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function toReplyPreview(message: Message): NonNullable<Message["reply"]> {
  return {
    id: message.id,
    sender_id: message.sender_id,
    body: message.body,
    shared_entity: message.shared_entity,
    media_attachment: message.media_attachment,
    deleted_at: message.deleted_at,
  };
}

function messagePreview(message: Message | NonNullable<Message["reply"]>): string {
  if (message.deleted_at) return "Message removed";
  if (message.body) return message.body;
  if (message.shared_entity) return message.shared_entity.title;
  if (message.media_attachment?.kind === "sticker") return "Sticker";
  if (message.media_attachment?.kind === "gif") return "GIF";
  if (message.media_attachment?.kind === "image") return "Image";
  return "Message";
}

function ReplyPreview({ message, members, own, onOpen }: { message: Message["reply"]; members: ConversationDetail["members"]; own: boolean; onOpen: () => void }) {
  if (!message) return <div className={cn("mb-2 rounded-lg border-l-2 px-2.5 py-2 text-xs", own ? "border-white/70 bg-white/16" : "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.08)]")}><span className="opacity-70">Original message unavailable</span></div>;
  const sender = members.find((member) => member.user_id === message.sender_id)?.profile?.username ?? "PBox member";
  return (
    <button type="button" onClick={onOpen} className={cn("mb-2 block w-full rounded-lg border-l-2 px-2.5 py-2 text-left", own ? "border-white/70 bg-white/16" : "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.08)]")}>
      <span className={cn("block truncate text-[10px] font-bold", own ? "text-white/85" : "text-[var(--accent)]")}>{sender}</span>
      <span className="mt-0.5 block truncate text-xs opacity-75">{messagePreview(message)}</span>
    </button>
  );
}

function SharedMessageCard({ card, own }: { card: NonNullable<Message["shared_entity"]>; own: boolean }) {
  return (
    <Link href={card.href} className={cn("mt-2 block overflow-hidden rounded-xl border text-left", own ? "border-white/35 bg-white/14" : "border-[var(--border)] bg-[var(--bg-base)]")}>
      {card.posterUrl && (
        <span className="relative block aspect-[16/6] max-h-24 overflow-hidden">
          <Image src={card.posterUrl} alt="" fill sizes="(max-width: 640px) 65vw, 320px" className="object-cover" />
        </span>
      )}
      <span className="block p-3">
        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-65">{card.kind === "collection" ? "Collection" : (card.mediaType ?? "Title")}</span>
        <strong className="mt-1 block line-clamp-2 text-sm">{card.title}</strong>
        {card.year && <span className="mt-1 block text-xs opacity-65">{card.year}</span>}
      </span>
    </Link>
  );
}

function MessageMediaView({ media }: { media: MessageMedia }) {
  if (media.provider === "builtin") return <div className="py-1 text-center text-6xl leading-none" role="img" aria-label={media.alt ?? "Sticker"}>{media.sticker}</div>;
  if (!media.url) return <div className="rounded-xl border border-[var(--border)] bg-[var(--glass)] px-3 py-6 text-center text-xs opacity-70">Attachment unavailable</div>;
  return <a href={media.url} target="_blank" rel="noopener noreferrer" className="mt-1 block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]" aria-label={`Open ${media.kind}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={media.url} alt={media.alt ?? "Shared media"} className={cn("w-full object-contain", media.kind === "sticker" ? "max-h-40 max-w-[180px]" : "max-h-64 max-w-[260px]")} loading="lazy" />
  </a>;
}

const BUILTIN_STICKERS = ["😂", "❤️", "🔥", "👍", "🎉", "😮", "😭", "👏", "💀", "✨", "🤝", "🍿"];

function MediaPicker({ busy, onClose, onUpload, onSend }: { busy: boolean; onClose: () => void; onUpload: (file: File, kind?: "image" | "sticker") => Promise<void>; onSend: (media: MessageMedia) => Promise<void> }) {
  const [tab, setTab] = useState<"sticker" | "gif" | "image">("sticker");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; preview: string; url: string; title: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const giphyKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  async function searchGiphy(event: React.FormEvent) {
    event.preventDefault();
    if (!giphyKey || !query.trim()) return;
    setSearching(true);
    try {
      const endpoint = tab === "sticker" ? "stickers" : "gifs";
      const cacheKey = `pbox:giphy:${endpoint}:${query.trim().toLowerCase()}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setResults(JSON.parse(cached) as typeof results);
          return;
        } catch {
          sessionStorage.removeItem(cacheKey);
        }
      }
      const response = await fetch(`https://api.giphy.com/v1/${endpoint}/search?api_key=${encodeURIComponent(giphyKey)}&q=${encodeURIComponent(query.trim().slice(0, 50))}&limit=18&rating=pg&lang=en`);
      if (!response.ok) throw new Error("GIF search is unavailable");
      const payload = await response.json() as { data?: { id: string; title?: string; images?: { fixed_width?: { url?: string }; original?: { url?: string; width?: string; height?: string } } }[] };
      const nextResults = (payload.data ?? []).flatMap((item) => {
        const preview = item.images?.fixed_width?.url; const url = item.images?.original?.url;
        return preview && url ? [{ id: item.id, preview, url, title: item.title ?? (tab === "sticker" ? "Sticker" : "GIF") }] : [];
      });
      setResults(nextResults);
      sessionStorage.setItem(cacheKey, JSON.stringify(nextResults));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not search GIFs"); }
    finally { setSearching(false); }
  }

  return <section className="max-h-[42dvh] shrink-0 overflow-y-auto border-t border-[var(--border)] bg-[var(--bg-elevated)] p-3" aria-label="Add media">
    <div className="flex items-center justify-between gap-2"><div className="flex gap-1">{(["sticker", "gif", "image"] as const).map((value) => <button key={value} type="button" onClick={() => { setTab(value); setResults([]); }} className={cn("min-h-11 rounded-full px-4 text-sm font-bold capitalize", tab === value ? "bg-[var(--accent)] text-white" : "bg-[var(--glass)]")}>{value === "image" ? "Photos" : `${value}s`}</button>)}</div><button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full" aria-label="Close media picker"><X className="size-5" /></button></div>
    {tab === "sticker" && <><div className="mt-3 grid grid-cols-6 gap-2">{BUILTIN_STICKERS.map((sticker) => <button key={sticker} type="button" disabled={busy} onClick={() => void onSend({ kind: "sticker", provider: "builtin", sticker, alt: "Sticker" })} className="grid aspect-square min-h-11 place-items-center rounded-xl bg-[var(--glass)] text-3xl transition hover:bg-[var(--glass-strong)]">{sticker}</button>)}</div><label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--glass)] px-3 text-sm font-bold"><ImagePlus className="size-4 text-[var(--accent)]" /> Upload custom sticker<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(file, "sticker"); event.currentTarget.value = ""; }} /></label></>}
    {tab === "image" && <label className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--glass)] text-center"><ImagePlus className="mb-2 size-6 text-[var(--accent)]" /><strong className="text-sm">Choose or paste an image or GIF</strong><span className="mt-1 text-xs text-[var(--text-muted)]">JPG, PNG, WebP, or GIF up to 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(file); event.currentTarget.value = ""; }} /></label>}
    {tab === "gif" && <>{giphyKey ? <><form onSubmit={(event) => void searchGiphy(event)} className="mt-3 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GIFs" className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 text-base outline-none" /><Button type="submit" size="icon" disabled={!query.trim() || searching} aria-label="Search GIFs">{searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}</Button></form><div className="mt-3 columns-2 gap-2 sm:columns-3">{results.map((gif) => <button key={gif.id} type="button" disabled={busy} onClick={() => void onSend({ kind: "gif", provider: "giphy", url: gif.url, alt: gif.title.slice(0, 200) })} className="mb-2 block w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm"><Image src={gif.preview} alt={gif.title} width={240} height={180} unoptimized className="h-auto w-full" /></button>)}</div><p className="mt-2 text-center text-[10px] font-bold tracking-wide text-[var(--text-muted)]">Powered by GIPHY</p></> : <div className="mt-3 rounded-xl bg-[var(--glass)] p-4 text-center"><Laugh className="mx-auto size-6 text-[var(--accent)]" /><p className="mt-2 text-sm font-bold">GIF search needs a GIPHY API key</p><p className="mt-1 text-xs text-[var(--text-muted)]">You can still upload a GIF from the Photos tab.</p></div>}</>}
  </section>;
}

function Avatar({ url, label, group = false, small = false }: { url: string | null; label: string; group?: boolean; small?: boolean }) {
  return <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[rgb(var(--accent-rgb)/0.14)] font-bold text-[var(--accent)]", small ? "size-9 text-xs" : "size-11")}>{url ? <Image src={url} alt="" fill sizes={small ? "36px" : "44px"} className="object-cover" /> : group ? <Users className="size-5" /> : label.charAt(0).toUpperCase()}</span>;
}

function NewConversationDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (value: boolean) => void; onCreated: (id: string) => void }) {
  const [friends, setFriends] = useState<ProfileSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [group, setGroup] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    queueMicrotask(
      () =>
        void (async () => {
          const [{ data }, rows] = await Promise.all([createClient().auth.getUser(), listMyFriendships()]);
          const uid = data.user?.id;
          if (!uid) return;
          const ids = rows.filter((row) => row.status === "accepted").map((row) => (row.requester === uid ? row.addressee : row.requester));
          const map = await fetchProfilesByIds(ids);
          setFriends(ids.map((id) => map.get(id)).filter((profile): profile is ProfileSummary => Boolean(profile)));
        })(),
    );
  }, [open]);
  const visible = friends.filter((friend) => (friend.username ?? "").toLowerCase().includes(query.toLowerCase()));
  async function create() {
    if (!selected.length || (group && !name.trim())) return;
    setBusy(true);
    try {
      const result = group
        ? await createConversation({
            type: "group",
            name: name.trim(),
            friendIds: selected,
          })
        : await createConversation({ type: "direct", friendId: selected[0]! });
      onCreated(result.id);
      setSelected([]);
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create conversation");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-900/20 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] max-h-[90dvh] overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--text-primary)] shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(92vw,520px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-bold">New conversation</Dialog.Title>
            <Dialog.Close className="grid size-11 place-items-center rounded-full" aria-label="Close">
              <X />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">Choose one friend for a direct message or up to 19 for a group.</Dialog.Description>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setGroup(false);
                setSelected((current) => current.slice(0, 1));
              }}
              className={cn("min-h-11 flex-1 rounded-xl font-semibold", !group ? "bg-[var(--accent)] text-white" : "glass")}
            >
              Direct
            </button>
            <button onClick={() => setGroup(true)} className={cn("min-h-11 flex-1 rounded-xl font-semibold", group ? "bg-[var(--accent)] text-white" : "glass")}>
              Group
            </button>
          </div>
          {group && <input value={name} onChange={(event) => setName(event.target.value.slice(0, 60))} placeholder="Group name" className="mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 outline-none" />}
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search friends" className="mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 outline-none" />
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {visible.map((friend) => {
              const active = selected.includes(friend.id);
              return (
                <button key={friend.id} onClick={() => setSelected((current) => (active ? current.filter((id) => id !== friend.id) : group ? (current.length < 19 ? [...current, friend.id] : current) : [friend.id]))} className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left", active ? "bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)]" : "hover:bg-[var(--glass)]")}>
                  <Avatar url={friend.avatar_url} label={friend.username ?? "?"} />
                  <span className="flex-1 font-semibold">{friend.username ?? "PBox member"}</span>
                  {active && <Check className="size-4" />}
                </button>
              );
            })}
          </div>
          <Button className="mt-4 w-full" loading={busy} disabled={!selected.length || (group && !name.trim())} onClick={() => void create()}>
            Create conversation
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConversationSettingsView({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [{ data }, conversation] = await Promise.all([createClient().auth.getUser(), getConversation(id)]);
      setMyId(data.user?.id ?? null);
      setDetail(conversation);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load conversation settings");
      router.replace("/messages");
    }
  }, [id, router]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  if (!detail) return <div className="grid min-h-[50dvh] place-items-center"><Loader2 className="size-7 animate-spin text-[var(--accent)]" /></div>;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/messages/${id}`} className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass)]" aria-label="Back to conversation"><ChevronLeft /></Link>
        <Avatar url={detail.type === "direct" ? (detail.members.find((member) => member.user_id !== myId)?.profile?.avatar_url ?? null) : detail.avatar_url} label={detail.title} group={detail.type === "group"} />
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Conversation settings</p><h1 className="truncate font-display text-2xl font-bold">{detail.title}</h1></div>
      </div>
      <ConversationSettingsPanel detail={detail} myId={myId} isOwner={detail.owner_id === myId} onChanged={load} onLeave={() => router.replace("/messages")} />
    </div>
  );
}

function ConversationSettingsPanel({ detail, myId, isOwner, onChanged, onLeave }: { detail: ConversationDetail; myId: string | null; isOwner: boolean; onChanged: () => Promise<void>; onLeave: () => void }) {
  const mine = detail.members.find((member) => member.user_id === myId);
  const atmosphere = detail.chatAtmosphere;
  const currentBackgroundPath = detail.chatBackgroundPath;
  const currentBackgroundPosition = detail.chatBackgroundPosition;
  const canEditAppearance = detail.type === "direct" || isOwner;
  const [friends, setFriends] = useState<ProfileSummary[]>([]);
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  useEffect(() => {
    if (!isOwner) return;
    queueMicrotask(
      () =>
        void (async () => {
          const rows = await listMyFriendships();
          const ids = rows
            .filter((row) => row.status === "accepted")
            .map((row) => (row.requester === myId ? row.addressee : row.requester))
            .filter((id) => !detail.members.some((member) => member.user_id === id && member.status !== "left" && member.status !== "removed"));
          const map = await fetchProfilesByIds(ids);
          setFriends(ids.map((id) => map.get(id)).filter((profile): profile is ProfileSummary => Boolean(profile)));
        })(),
    );
  }, [detail.members, isOwner, myId]);
  async function act(action: string, payload: Record<string, unknown> = {}) {
    try {
      await conversationAction(detail.id, action, payload);
      toast.success("Conversation updated");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update conversation");
    }
  }
  async function updateAvatar(file: File | null) {
    if (!myId || !isOwner) return;
    if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error("Use a JPG, PNG, or WebP image up to 5 MB");
      return;
    }
    setAvatarBusy(true);
    try {
      const storage = createClient().storage.from("group-avatars");
      const path = `${myId}/${detail.id}/avatar`;
      if (!file) {
        await storage.remove([path]);
        await conversationAction(detail.id, "avatar", { avatarUrl: "" });
      } else {
        const { error } = await storage.upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
        if (error) throw error;
        const { data } = storage.getPublicUrl(path);
        await conversationAction(detail.id, "avatar", {
          avatarUrl: `${data.publicUrl}?v=${Date.now()}`,
        });
      }
      toast.success(file ? "Group picture updated" : "Group picture removed");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update group picture");
    } finally {
      setAvatarBusy(false);
    }
  }
  async function updateBackground(file: File | null, position = currentBackgroundPosition) {
    if (!myId) return;
    if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024)) {
      toast.error("Use a JPG, PNG, or WebP image up to 8 MB");
      return;
    }
    setBackgroundBusy(true);
    const storage = createClient().storage.from("chat-backgrounds");
    const extension = file ? (file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] ?? "image") : "";
    const path = file ? `${myId}/${detail.id}/${crypto.randomUUID()}.${extension}` : "";
    try {
      if (file) {
        const { error } = await storage.upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
        if (error) throw error;
      } else if (!currentBackgroundPath) {
        await conversationAction(detail.id, detail.type === "group" ? "groupAppearance" : "background", { storagePath: "", position, atmosphere });
        await onChanged();
        return;
      }
      await conversationAction(detail.id, detail.type === "group" ? "groupAppearance" : "background", { storagePath: path, position, atmosphere });
      if (currentBackgroundPath && currentBackgroundPath !== path) await storage.remove([currentBackgroundPath]);
      toast.success(file ? "Chat background updated" : "Chat background removed");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update chat background");
    } finally {
      setBackgroundBusy(false);
    }
  }
  async function updateBackgroundPosition(position: "top" | "center" | "bottom") {
    if (!currentBackgroundPath) return;
    setBackgroundBusy(true);
    try {
      await conversationAction(detail.id, detail.type === "group" ? "groupAppearance" : "background", { storagePath: currentBackgroundPath, position, atmosphere });
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reposition chat background");
    } finally {
      setBackgroundBusy(false);
    }
  }
  async function updateAtmosphere(nextAtmosphere: keyof typeof CHAT_ATMOSPHERES) {
    setBackgroundBusy(true);
    try {
      await conversationAction(detail.id, detail.type === "group" ? "groupAppearance" : "atmosphere", {
        storagePath: currentBackgroundPath ?? "",
        position: currentBackgroundPosition,
        atmosphere: nextAtmosphere,
      });
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update chat atmosphere");
    } finally {
      setBackgroundBusy(false);
    }
  }
  return (
    <section className="mx-auto w-full max-w-4xl pb-[max(2rem,var(--safe-bottom))]">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => void act("mute", { muted: !mine?.muted_at })}>
              {mine?.muted_at ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              {mine?.muted_at ? "Unmute" : "Mute"}
            </Button>
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="relative aspect-[16/6] overflow-hidden rounded-lg bg-[var(--bg-base)]" style={{ background: CHAT_ATMOSPHERES[atmosphere].background }}>
                {detail.chatBackgroundUrl && <div className="absolute inset-0 bg-cover opacity-70" style={{ backgroundImage: `url(${detail.chatBackgroundUrl})`, backgroundPosition: currentBackgroundPosition }} />}
                {detail.chatBackgroundUrl && <div className="absolute inset-0" style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--bg-base) 72%, transparent), transparent)" }} />}
                <p className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-1 text-xs font-bold text-white backdrop-blur">{CHAT_ATMOSPHERES[atmosphere].label} atmosphere</p>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{detail.type === "group" ? "This decoration is shared with every group member." : "Only you see this decoration in this conversation."}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Chat atmosphere">
                {(Object.entries(CHAT_ATMOSPHERES) as [keyof typeof CHAT_ATMOSPHERES, (typeof CHAT_ATMOSPHERES)[keyof typeof CHAT_ATMOSPHERES]][]).map(([key, preset]) => <button type="button" key={key} disabled={backgroundBusy || !canEditAppearance} onClick={() => void updateAtmosphere(key)} className={cn("relative min-h-14 overflow-hidden rounded-xl border p-2 text-left text-xs font-bold text-[var(--text-primary)] shadow-sm disabled:cursor-not-allowed disabled:opacity-60", atmosphere === key ? "border-[var(--accent)] ring-2 ring-[rgb(var(--accent-rgb)/0.25)]" : "border-[var(--border)]")} style={{ background: preset.background }}><span className="relative z-[1] rounded-full bg-[var(--glass)] px-2 py-1 backdrop-blur">{preset.label}</span></button>)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 text-sm font-bold text-white", canEditAppearance ? "cursor-pointer" : "cursor-not-allowed opacity-60")}><ImagePlus className="size-4" />{backgroundBusy ? "Updating…" : detail.chatBackgroundUrl ? "Replace" : "Upload"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={backgroundBusy || !canEditAppearance} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void updateBackground(file); event.currentTarget.value = ""; }} /></label>
                <Button variant="outline" disabled={!detail.chatBackgroundUrl || backgroundBusy || !canEditAppearance} onClick={() => void updateBackground(null)}>Remove</Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2" aria-label="Chat background position">
                {(["top", "center", "bottom"] as const).map((position) => <button type="button" key={position} disabled={!detail.chatBackgroundUrl || backgroundBusy || !canEditAppearance} onClick={() => void updateBackgroundPosition(position)} className={cn("min-h-11 rounded-lg text-xs font-bold capitalize", currentBackgroundPosition === position ? "bg-[rgb(var(--accent-rgb)/0.18)] text-[var(--accent)]" : "bg-[var(--glass)] text-[var(--text-secondary)] disabled:opacity-40")}>{position}</button>)}
              </div>
            </div>
            {detail.type === "group" && isOwner && (
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex items-center gap-3">
                  <Avatar url={detail.avatar_url} label={detail.title} group />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Group picture</p>
                    <p className="text-xs text-[var(--text-muted)]">JPG, PNG, or WebP up to 5 MB.</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 text-sm font-bold text-white">
                    <Camera className="size-4" />
                    {avatarBusy ? "Updating…" : detail.avatar_url ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={avatarBusy}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void updateAvatar(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <Button variant="outline" disabled={!detail.avatar_url || avatarBusy} onClick={() => void updateAvatar(null)}>
                    Remove
                  </Button>
                </div>
              </div>
            )}
        </div>
        <div className="space-y-4">
            {detail.type === "group" && (
              <>
                <h3 className="pt-2 text-sm font-bold">Members</h3>
                {detail.members
                  .filter((member) => member.status === "active")
                  .map((member) => (
                    <div key={member.user_id} className="flex min-h-12 items-center gap-3 rounded-xl bg-[var(--glass)] px-3">
                      <Avatar url={member.profile?.avatar_url ?? null} label={member.profile?.username ?? "?"} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {member.profile?.username ?? "Member"}
                        {member.role === "owner" ? " · Owner" : ""}
                      </span>
                      {isOwner && member.user_id !== myId && (
                        <div className="flex">
                          <button title="Transfer ownership" aria-label={`Transfer ownership to ${member.profile?.username ?? "member"}`} onClick={() => void act("transfer", { userId: member.user_id })} className="grid size-11 place-items-center text-[var(--gold)]">
                            <Users className="size-4" />
                          </button>
                          <button title="Remove member" aria-label={`Remove ${member.profile?.username ?? "member"}`} onClick={() => void act("remove", { userId: member.user_id })} className="grid size-11 place-items-center text-[var(--dropped)]">
                            <UserMinus className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                {isOwner && friends.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="mb-2 text-xs font-bold text-[var(--text-secondary)]">Invite friends</p>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {friends.map((friend) => {
                        const active = inviteIds.includes(friend.id);
                        return (
                          <button key={friend.id} onClick={() => setInviteIds((current) => (active ? current.filter((id) => id !== friend.id) : [...current, friend.id]))} className={cn("flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm", active && "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]")}>
                            <span className="flex-1 truncate">{friend.username ?? "PBox member"}</span>
                            {active && <Check className="size-4" />}
                          </button>
                        );
                      })}
                    </div>
                    <Button size="sm" className="mt-2 w-full" disabled={!inviteIds.length} onClick={() => void act("invite", { friendIds: inviteIds }).then(() => setInviteIds([]))}>
                      Send invitations
                    </Button>
                  </div>
                )}
                {isOwner ? (
                  <Button variant="danger" className="w-full" onClick={() => void act("archive").then(onLeave)}>
                    <Archive className="size-4" /> Archive group
                  </Button>
                ) : (
                  <Button variant="danger" className="w-full" onClick={() => void act("leave").then(onLeave)}>
                    <ChevronLeft className="size-4" /> Leave group
                  </Button>
                )}
              </>
            )}
        </div>
      </div>
    </section>
  );
}
