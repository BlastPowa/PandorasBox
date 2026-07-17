export type ShareMediaType = "movie" | "series" | "anime" | "manga" | "manhwa" | "comic" | "game";
export type ShareBox = "received" | "sent";
export type ShareFilter = "all" | "unread" | "collections" | "titles";
export type NotificationFilter = "all" | "unread" | "shares" | "friends" | "messages";

export type ShareEntity =
  | {
      kind: "collection";
      collectionId: string;
      title: string;
      description?: string | null;
      posterUrl?: string | null;
      visibility: "public" | "friends" | "private" | "unlisted";
      shareSlug?: string | null;
    }
  | {
      kind: "title";
      mediaKey: string;
      mediaType: ShareMediaType;
      source: string;
      sourceId: string;
      title: string;
      year?: number | null;
      posterUrl?: string | null;
    };

export interface ShareProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface SocialShare {
  id: string;
  sender_id: string;
  recipient_id: string;
  entity_type: "collection" | "title";
  collection_id: string | null;
  media_key: string | null;
  media_type: ShareMediaType | null;
  source: string | null;
  title: string;
  year: number | null;
  poster_url: string | null;
  href: string;
  message: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  sender?: ShareProfile | null;
  recipient?: ShareProfile | null;
}

export interface SocialNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "friend_request" | "friend_accepted" | "share_received" | "group_invitation" | "message_received";
  friendship_id: string | null;
  share_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  actor?: ShareProfile | null;
  share?: SocialShare | null;
  conversation?: { id: string; type: "direct" | "group"; name: string | null } | null;
  message?: { id: string; body: string | null; deleted_at: string | null } | null;
}

export function shareHref(entity: ShareEntity): string {
  if (entity.kind === "collection") {
    return entity.shareSlug ? `/c/${entity.shareSlug}` : `/collections/${entity.collectionId}`;
  }
  if (entity.mediaType === "comic") return `/comic/${encodeURIComponent(entity.sourceId)}`;
  if (entity.mediaType === "game") return `/game/${encodeURIComponent(entity.sourceId)}`;
  return `/title/${entity.mediaType}/${entity.source}/${encodeURIComponent(entity.sourceId)}`;
}
