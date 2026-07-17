import type { ShareBox, ShareEntity, ShareFilter, SocialShare } from "./types";

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

export async function sendSocialShare(entity: ShareEntity, recipientIds: string[], message: string) {
  return json<{ delivered: { recipientId: string; shareId: string }[]; failed: { recipientId: string; error: string }[] }>(
    await fetch("/api/social/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, recipientIds, message }),
    })
  );
}

export async function listSocialShares(box: ShareBox, filter: ShareFilter, cursor?: string) {
  const params = new URLSearchParams({ box, filter });
  if (cursor) params.set("cursor", cursor);
  return json<{ shares: SocialShare[]; nextCursor: string | null }>(
    await fetch(`/api/social/shares?${params.toString()}`, { cache: "no-store" })
  );
}

export async function updateSocialShare(id: string, action: "read" | "dismiss" | "revoke") {
  return json<{ ok: true }>(await fetch(`/api/social/shares/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  }));
}
