import type { ShareProfile } from "@/lib/social/types";

export type ConversationType = "direct" | "group";
export type MembershipStatus = "invited" | "active" | "left" | "removed";

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: "owner" | "member";
  status: MembershipStatus;
  invited_by: string | null;
  joined_at: string | null;
  muted_at: string | null;
  last_read_at: string | null;
  created_at: string;
  profile?: ShareProfile | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  shared_entity: MessageShareCard | null;
  media_attachment: MessageMedia | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface MessageMedia {
  kind: "image" | "gif" | "sticker";
  provider: "upload" | "giphy" | "builtin";
  storagePath?: string;
  url?: string;
  sticker?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface MessageShareCard {
  kind: "title" | "collection";
  title: string;
  href: string;
  posterUrl?: string | null;
  mediaType?: string | null;
  year?: number | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  owner_id: string | null;
  direct_user_a: string | null;
  direct_user_b: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  members: ConversationMember[];
  latestMessage: Message | null;
  unreadCount: number;
  deliveryStatus?: string | null;
  title: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
  nextCursor: string | null;
}

export interface TypingState {
  conversation_id: string;
  user_id: string;
  typed_at: string;
}
