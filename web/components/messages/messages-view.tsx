"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Archive, Check, ChevronLeft, Edit3, Loader2, MessageCircle, MoreHorizontal, Plus, Search, Send, Trash2, UserMinus, Users, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui-fx/button";
import { EmptyState } from "@/components/ui-fx/feedback";
import { createClient } from "@/lib/supabase/client";
import { fetchProfilesByIds, listMyFriendships, type ProfileSummary } from "@/lib/friends/friends";
import { conversationAction, createConversation, getConversation, listConversations, messageAction, sendMessage } from "@/lib/messages/client";
import type { Conversation, ConversationDetail, Message } from "@/lib/messages/types";
import { cn } from "@/lib/utils";

export function MessagesView({ initialConversationId = null, embedded = false }: { initialConversationId?: string | null; embedded?: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const load = useCallback(async () => {
    try {
      const [{ data }, result] = await Promise.all([createClient().auth.getUser(), listConversations()]);
      setMyId(data.user?.id ?? null);
      setConversations(result.conversations);
      if (!selectedId && initialConversationId) setSelectedId(initialConversationId);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load messages"); }
    finally { setLoading(false); }
  }, [initialConversationId, selectedId]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("pbox:messages-change", refresh);
    return () => window.removeEventListener("pbox:messages-change", refresh);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? conversations.filter((conversation) => conversation.title.toLowerCase().includes(needle)) : conversations;
  }, [conversations, query]);

  return <div className={cn("overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl", embedded ? "min-h-[620px] rounded-[var(--radius-xl)]" : "h-[calc(100dvh-var(--app-header-height)-var(--app-bottom-nav-height)-2rem)] min-h-[520px] rounded-[var(--radius-xl)] md:min-h-[620px]")}>
    <div className="grid size-full md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      <aside className={cn("flex min-h-0 flex-col border-r border-[var(--border)]", selectedId && "hidden md:flex")}>
        <div className="space-y-3 border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">Messages</h2><Button size="icon" variant="glass" aria-label="New conversation" onClick={() => setCreateOpen(true)}><Plus className="size-5" /></Button></div>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3"><Search className="size-4 text-[var(--text-muted)]" /><span className="sr-only">Search conversations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-16 rounded-xl" />)}</div> : filtered.length === 0 ? <div className="p-6 text-center text-sm text-[var(--text-muted)]">No conversations yet.</div> : filtered.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} myId={myId} active={selectedId === conversation.id} onClick={() => setSelectedId(conversation.id)} />)}
        </div>
      </aside>
      <main className={cn("min-h-0", !selectedId && "hidden md:block")}>
        {selectedId ? <ChatPanel key={selectedId} id={selectedId} myId={myId} onBack={() => { setSelectedId(null); void load(); }} onChanged={() => void load()} /> : <EmptyState icon={<MessageCircle className="size-11" />} title="Choose a conversation" description="Message a friend or create a group to start talking." />}
      </main>
    </div>
    <NewConversationDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => { setSelectedId(id); setCreateOpen(false); void load(); }} />
  </div>;
}

function ConversationRow({ conversation, myId, active, onClick }: { conversation: Conversation; myId: string | null; active: boolean; onClick: () => void }) {
  const other = conversation.members.find((member) => member.user_id !== myId)?.profile;
  const mine = conversation.members.find((member) => member.user_id === myId);
  const avatar = conversation.type === "direct" ? other?.avatar_url : null;
  return <button type="button" onClick={onClick} className={cn("flex min-h-[76px] w-full items-center gap-3 border-b border-[var(--border)] px-4 text-left transition hover:bg-[var(--glass)]", active && "bg-[rgb(var(--accent-rgb)/0.1)]")}>
    <Avatar url={avatar ?? null} label={conversation.title} group={conversation.type === "group"} />
    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{conversation.title}</strong><span className="shrink-0 text-[10px] text-[var(--text-muted)]">{new Date(conversation.updated_at).toLocaleDateString()}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className="line-clamp-1 text-xs text-[var(--text-muted)]">{mine?.status === "invited" ? "Group invitation" : conversation.latestMessage?.deleted_at ? "Message removed" : conversation.latestMessage?.body ?? "Start the conversation"}</span>{conversation.unreadCount > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 font-mono text-[10px] font-bold text-black">{conversation.unreadCount}</span>}</span></span>
  </button>;
}

function ChatPanel({ id, myId, onBack, onChanged }: { id: string; myId: string | null; onBack: () => void; onChanged: () => void }) {
  const [openedAt] = useState(() => Date.now());
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const typingSentAt = useRef(0);
  const refresh = useCallback(async () => {
    const value = await getConversation(id);
    setDetail(value);
  }, [id]);
  const load = useCallback(async () => {
    try {
      await refresh();
      await conversationAction(id, "read").catch(() => undefined);
      window.dispatchEvent(new CustomEvent("pbox:notifications-change"));
      window.dispatchEvent(new CustomEvent("pbox:messages-change"));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not open conversation"); }
  }, [id, refresh]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => void load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${id}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_typing", filter: `conversation_id=eq.${id}` }, async () => {
        const cutoff = new Date(Date.now() - 6000).toISOString();
        const { data } = await supabase.from("conversation_typing").select("user_id").eq("conversation_id", id).neq("user_id", myId ?? "").gt("typed_at", cutoff);
        setTypingIds((data ?? []).map((row) => String(row.user_id)));
      }).subscribe();
    const typingTimer = window.setInterval(async () => {
      const cutoff = new Date(Date.now() - 6000).toISOString();
      const { data } = await supabase.from("conversation_typing").select("user_id").eq("conversation_id", id).neq("user_id", myId ?? "").gt("typed_at", cutoff);
      setTypingIds((data ?? []).map((row) => String(row.user_id)));
    }, 2500);
    return () => { window.clearInterval(typingTimer); void supabase.removeChannel(channel); };
  }, [id, load, myId, refresh]);

  async function type(value: string) {
    setDraft(value.slice(0, 2000));
    if (!myId || Date.now() - typingSentAt.current < 2000) return;
    typingSentAt.current = Date.now();
    await createClient().from("conversation_typing").upsert({ conversation_id: id, user_id: myId, typed_at: new Date().toISOString() }, { onConflict: "conversation_id,user_id" });
  }
  async function send() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(id, draft);
      setDraft("");
      if (myId) await createClient().from("conversation_typing").delete().eq("conversation_id", id).eq("user_id", myId);
      await load(); onChanged();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send message"); }
    finally { setSending(false); }
  }
  async function saveEdit(message: Message) {
    try { await messageAction(message.id, "edit", editText); setEditingId(null); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not edit message"); }
  }
  async function remove(message: Message) {
    try { await messageAction(message.id, "delete"); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove message"); }
  }

  if (!detail) return <div className="grid size-full place-items-center"><Loader2 className="size-7 animate-spin text-[var(--accent)]" /></div>;
  const mine = detail.members.find((member) => member.user_id === myId);
  const isOwner = detail.owner_id === myId;
  const activeMembers = detail.members.filter((member) => member.status === "active");
  const seenCount = detail.latestMessage?.sender_id === myId ? activeMembers.filter((member) => member.user_id !== myId && member.last_read_at && new Date(member.last_read_at) >= new Date(detail.latestMessage!.created_at)).length : 0;
  if (mine?.status === "invited") return <div className="grid size-full place-items-center p-6"><div className="glass max-w-md rounded-[var(--radius-xl)] p-6 text-center"><Users className="mx-auto size-10 text-[var(--accent)]" /><h2 className="mt-3 font-display text-2xl font-bold">Join {detail.title}?</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">New members can read messages sent after they join.</p><div className="mt-5 flex justify-center gap-3"><Button onClick={() => void conversationAction(id, "accept").then(load)}>Accept</Button><Button variant="outline" onClick={() => void conversationAction(id, "decline").then(onBack)}>Decline</Button></div></div></div>;

  return <div className="flex size-full min-h-0 flex-col">
    <header className="flex min-h-16 items-center gap-3 border-b border-[var(--border)] px-3 sm:px-4"><button type="button" onClick={onBack} className="grid size-11 place-items-center rounded-full hover:bg-[var(--glass)] md:hidden" aria-label="Back to conversations"><ChevronLeft /></button><Avatar url={detail.type === "direct" ? detail.members.find((member) => member.user_id !== myId)?.profile?.avatar_url ?? null : null} label={detail.title} group={detail.type === "group"} /><div className="min-w-0 flex-1"><h2 className="truncate font-display font-bold">{detail.title}</h2><p className="text-xs text-[var(--text-muted)]">{typingIds.length ? "Typing…" : detail.type === "group" ? `${activeMembers.length} members` : "Direct message"}</p></div><Button size="icon" variant="ghost" aria-label="Conversation settings" onClick={() => setManageOpen(true)}><MoreHorizontal /></Button></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
      {detail.nextCursor && <div className="mb-4 text-center"><Button size="sm" variant="ghost" onClick={async () => { const older = await getConversation(id, detail.nextCursor!); setDetail({ ...detail, messages: [...older.messages, ...detail.messages], nextCursor: older.nextCursor }); }}>Load older messages</Button></div>}
      <div className="space-y-2">{detail.messages.map((message) => {
        const own = message.sender_id === myId; const sender = detail.members.find((member) => member.user_id === message.sender_id)?.profile;
        return <div key={message.id} className={cn("group flex", own ? "justify-end" : "justify-start")}><div className={cn("max-w-[86%] rounded-2xl px-3.5 py-2.5 sm:max-w-[70%]", own ? "rounded-br-md bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-black" : "rounded-bl-md bg-[var(--bg-elevated)]")}>
          {!own && detail.type === "group" && <p className="mb-1 text-[10px] font-bold text-[var(--accent)]">{sender?.username ?? "Member"}</p>}
          {editingId === message.id ? <div className="flex gap-2"><input value={editText} onChange={(event) => setEditText(event.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/20 px-2 py-1 text-sm outline-none" autoFocus /><button onClick={() => void saveEdit(message)} aria-label="Save edit"><Check className="size-4" /></button></div> : message.deleted_at ? <p className="text-sm italic opacity-65">Message removed</p> : <MessageBody body={message.body ?? ""} own={own} />}
          <div className="mt-1 flex items-center justify-end gap-2 text-[9px] opacity-60"><span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{message.edited_at ? " · edited" : ""}</span>{own && !message.deleted_at && <>{openedAt - new Date(message.created_at).getTime() <= 15 * 60_000 && <button aria-label="Edit message" onClick={() => { setEditingId(message.id); setEditText(message.body ?? ""); }}><Edit3 className="size-3" /></button>}<button aria-label="Delete message" onClick={() => void remove(message)}><Trash2 className="size-3" /></button></>}</div>
        </div></div>;
      })}</div>
      {seenCount > 0 && <p className="mt-2 text-right text-[10px] text-[var(--text-muted)]">{detail.type === "direct" ? "Seen" : `Seen by ${seenCount}`}</p>}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-end gap-2 border-t border-[var(--border)] bg-[var(--bg-surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"><label className="min-h-11 min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3"><span className="sr-only">Message</span><textarea rows={1} value={draft} onChange={(event) => void type(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Write a message" className="block max-h-32 w-full resize-none bg-transparent text-sm outline-none" /></label><Button size="icon" type="submit" disabled={!draft.trim() || sending} aria-label="Send message">{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button></form>
    <ManageConversationDialog open={manageOpen} onOpenChange={setManageOpen} detail={detail} myId={myId} isOwner={isOwner} onChanged={async () => { await load(); onChanged(); }} onLeave={onBack} />
  </div>;
}

function MessageBody({ body, own }: { body: string; own: boolean }) {
  const parts = body.split(/(https?:\/\/[^\s]+)/g);
  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{parts.map((part, index) => /^https?:\/\//i.test(part) ? <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className={cn("underline underline-offset-2", own ? "text-black" : "text-[var(--accent)]")}>{part}</a> : part)}</p>;
}

function Avatar({ url, label, group = false }: { url: string | null; label: string; group?: boolean }) {
  return <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[rgb(var(--accent-rgb)/0.14)] font-bold text-[var(--accent)]">{url ? <Image src={url} alt="" fill sizes="44px" className="object-cover" /> : group ? <Users className="size-5" /> : label.charAt(0).toUpperCase()}</span>;
}

function NewConversationDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (value: boolean) => void; onCreated: (id: string) => void }) {
  const [friends, setFriends] = useState<ProfileSummary[]>([]); const [selected, setSelected] = useState<string[]>([]); const [group, setGroup] = useState(false); const [name, setName] = useState(""); const [query, setQuery] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) return; queueMicrotask(() => void (async () => { const [{ data }, rows] = await Promise.all([createClient().auth.getUser(), listMyFriendships()]); const uid = data.user?.id; if (!uid) return; const ids = rows.filter((row) => row.status === "accepted").map((row) => row.requester === uid ? row.addressee : row.requester); const map = await fetchProfilesByIds(ids); setFriends(ids.map((id) => map.get(id)).filter((profile): profile is ProfileSummary => Boolean(profile))); })()); }, [open]);
  const visible = friends.filter((friend) => (friend.username ?? "").toLowerCase().includes(query.toLowerCase()));
  async function create() { if (!selected.length || (group && !name.trim())) return; setBusy(true); try { const result = group ? await createConversation({ type: "group", name: name.trim(), friendIds: selected }) : await createConversation({ type: "direct", friendId: selected[0]! }); onCreated(result.id); setSelected([]); setName(""); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create conversation"); } finally { setBusy(false); } }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] max-h-[90dvh] overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(92vw,520px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)]"><div className="flex items-center justify-between"><Dialog.Title className="font-display text-xl font-bold">New conversation</Dialog.Title><Dialog.Close className="grid size-11 place-items-center rounded-full" aria-label="Close"><X /></Dialog.Close></div><Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">Choose one friend for a direct message or up to 19 for a group.</Dialog.Description><div className="mt-4 flex gap-2"><button onClick={() => { setGroup(false); setSelected((current) => current.slice(0, 1)); }} className={cn("min-h-11 flex-1 rounded-xl font-semibold", !group ? "bg-[var(--accent)] text-black" : "glass")}>Direct</button><button onClick={() => setGroup(true)} className={cn("min-h-11 flex-1 rounded-xl font-semibold", group ? "bg-[var(--accent)] text-black" : "glass")}>Group</button></div>{group && <input value={name} onChange={(event) => setName(event.target.value.slice(0, 60))} placeholder="Group name" className="mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 outline-none" />}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search friends" className="mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 outline-none" /><div className="mt-2 max-h-64 space-y-1 overflow-y-auto">{visible.map((friend) => { const active = selected.includes(friend.id); return <button key={friend.id} onClick={() => setSelected((current) => active ? current.filter((id) => id !== friend.id) : group ? current.length < 19 ? [...current, friend.id] : current : [friend.id])} className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left", active ? "bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)]" : "hover:bg-[var(--glass)]")}><Avatar url={friend.avatar_url} label={friend.username ?? "?"} /><span className="flex-1 font-semibold">{friend.username ?? "PBox member"}</span>{active && <Check className="size-4" />}</button>; })}</div><Button className="mt-4 w-full" loading={busy} disabled={!selected.length || (group && !name.trim())} onClick={() => void create()}>Create conversation</Button></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function ManageConversationDialog({ open, onOpenChange, detail, myId, isOwner, onChanged, onLeave }: { open: boolean; onOpenChange: (value: boolean) => void; detail: ConversationDetail; myId: string | null; isOwner: boolean; onChanged: () => Promise<void>; onLeave: () => void }) {
  const mine = detail.members.find((member) => member.user_id === myId);
  const [friends, setFriends] = useState<ProfileSummary[]>([]);
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  useEffect(() => { if (!open || !isOwner) return; queueMicrotask(() => void (async () => { const rows = await listMyFriendships(); const ids = rows.filter((row) => row.status === "accepted").map((row) => row.requester === myId ? row.addressee : row.requester).filter((id) => !detail.members.some((member) => member.user_id === id && member.status !== "left" && member.status !== "removed")); const map = await fetchProfilesByIds(ids); setFriends(ids.map((id) => map.get(id)).filter((profile): profile is ProfileSummary => Boolean(profile))); })()); }, [detail.members, isOwner, myId, open]);
  async function act(action: string, payload: Record<string, unknown> = {}) { try { await conversationAction(detail.id, action, payload); toast.success("Conversation updated"); await onChanged(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update conversation"); } }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] max-h-[88dvh] overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(92vw,520px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)]"><div className="flex items-center justify-between"><Dialog.Title className="font-display text-xl font-bold">Conversation settings</Dialog.Title><Dialog.Close className="grid size-11 place-items-center rounded-full"><X /></Dialog.Close></div><div className="mt-4 space-y-3"><Button variant="outline" className="w-full" onClick={() => void act("mute", { muted: !mine?.muted_at })}>{mine?.muted_at ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}{mine?.muted_at ? "Unmute" : "Mute"}</Button>{detail.type === "group" && <><h3 className="pt-2 text-sm font-bold">Members</h3>{detail.members.filter((member) => member.status === "active").map((member) => <div key={member.user_id} className="flex min-h-12 items-center gap-3 rounded-xl bg-[var(--glass)] px-3"><Avatar url={member.profile?.avatar_url ?? null} label={member.profile?.username ?? "?"} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{member.profile?.username ?? "Member"}{member.role === "owner" ? " · Owner" : ""}</span>{isOwner && member.user_id !== myId && <div className="flex"><button title="Transfer ownership" aria-label={`Transfer ownership to ${member.profile?.username ?? "member"}`} onClick={() => void act("transfer", { userId: member.user_id })} className="grid size-11 place-items-center text-[var(--gold)]"><Users className="size-4" /></button><button title="Remove member" aria-label={`Remove ${member.profile?.username ?? "member"}`} onClick={() => void act("remove", { userId: member.user_id })} className="grid size-11 place-items-center text-[var(--dropped)]"><UserMinus className="size-4" /></button></div>}</div>)}{isOwner && friends.length > 0 && <div className="rounded-xl border border-[var(--border)] p-3"><p className="mb-2 text-xs font-bold text-[var(--text-secondary)]">Invite friends</p><div className="max-h-40 space-y-1 overflow-y-auto">{friends.map((friend) => { const active = inviteIds.includes(friend.id); return <button key={friend.id} onClick={() => setInviteIds((current) => active ? current.filter((id) => id !== friend.id) : [...current, friend.id])} className={cn("flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm", active && "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]")}><span className="flex-1 truncate">{friend.username ?? "PBox member"}</span>{active && <Check className="size-4" />}</button>; })}</div><Button size="sm" className="mt-2 w-full" disabled={!inviteIds.length} onClick={() => void act("invite", { friendIds: inviteIds }).then(() => setInviteIds([]))}>Send invitations</Button></div>}{isOwner ? <Button variant="danger" className="w-full" onClick={() => void act("archive").then(onLeave)}><Archive className="size-4" /> Archive group</Button> : <Button variant="danger" className="w-full" onClick={() => void act("leave").then(onLeave)}><ChevronLeft className="size-4" /> Leave group</Button>}</>}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
