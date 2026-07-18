import type { Conversation, ConversationDetail, MessageMedia, MessageShareCard } from "./types";

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

export async function listConversations() {
  return json<{ conversations: Conversation[]; unreadCount: number }>(await fetch("/api/messages", { cache: "no-store" }));
}

export async function createConversation(input: { type: "direct"; friendId: string } | { type: "group"; name: string; friendIds: string[] }) {
  return json<{ id: string }>(await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
}

export async function getConversation(id: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return json<ConversationDetail>(await fetch(`/api/messages/${id}${query}`, { cache: "no-store" }));
}

export async function sendMessage(id: string, body: string, share?: MessageShareCard, media?: MessageMedia, replyToId?: string | null) {
  return json<{ id: string }>(await fetch(`/api/messages/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, share, media, replyToId }) }));
}

export async function conversationAction(id: string, action: string, payload: Record<string, unknown> = {}) {
  return json<{ ok: true }>(await fetch(`/api/messages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) }));
}

export async function messageAction(id: string, action: "edit" | "delete", body?: string) {
  return json<{ ok: true }>(await fetch(`/api/messages/item/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, body }) }));
}
