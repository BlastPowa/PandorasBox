"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Trash2, Pencil, Send } from "lucide-react";
import { useLibrary } from "@/lib/library/use-library";
import { RatingStars } from "@/components/ui-fx/rating-stars";
import { Button } from "@/components/ui-fx/button";
import { Spinner } from "@/components/ui-fx/feedback";
import { listReviews, upsertReview, deleteReview, getCurrentUserId, type Review } from "@/lib/reviews/reviews";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ReviewsPanel({ mediaKey, scrollable = false }: { mediaKey: string; scrollable?: boolean }) {
  const { signedIn } = useLibrary();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [list, uid] = await Promise.all([listReviews(mediaKey), getCurrentUserId()]);
      setReviews(list);
      setUserId(uid);
      const mine = list.find((r) => r.user_id === uid);
      if (mine) {
        setDraft(mine.body);
        setDraftRating(mine.rating);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey]);

  const myReview = reviews.find((r) => r.user_id === userId);
  const others = reviews.filter((r) => r.user_id !== userId);

  async function submit() {
    if (draft.trim().length < 1) {
      toast.error("Write something before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await upsertReview(mediaKey, draft.trim(), draftRating);
      toast.success(myReview ? "Review updated" : "Review posted");
      setEditing(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post review");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteReview(id);
      toast.success("Review removed");
      setDraft("");
      setDraftRating(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove review");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-[var(--accent)]" />
        <h3 className="font-display text-base font-bold">Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
      </div>

      {signedIn ? (
        myReview && !editing ? (
          <div className="glass rounded-[var(--radius-md)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Your review</span>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--glass-strong)]">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => void remove(myReview.id)} className="rounded-md p-1.5 text-[var(--dropped)] hover:bg-[var(--glass-strong)]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            {myReview.rating !== null && <RatingStars value={myReview.rating} readOnly size={14} className="mt-1.5" />}
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{myReview.body}</p>
          </div>
        ) : (
          <div className="glass space-y-2.5 rounded-[var(--radius-md)] p-3">
            <RatingStars value={draftRating} onChange={setDraftRating} size={16} />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share how you felt about this…"
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] p-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <div className="flex justify-end gap-2">
              {editing && (
                <Button size="sm" variant="glass" onClick={() => setEditing(false)}>Cancel</Button>
              )}
              <Button size="sm" onClick={submit} loading={submitting}>
                <Send className="size-3.5" /> {myReview ? "Update" : "Post review"}
              </Button>
            </div>
          </div>
        )
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Sign in to leave your own review.</p>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Spinner size={20} /></div>
      ) : others.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No reviews yet — be the first to share your thoughts.</p>
      ) : (
        <div className={cn("space-y-3", scrollable && "max-h-72 overflow-y-auto pr-1")}>
          {others.map((r) => (
            <div key={r.id} className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2">
                {r.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar_url} alt="" className="size-6 rounded-full object-cover" />
                ) : (
                  <span className="grid size-6 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[10px] font-bold text-[#0a0a0f]">
                    {r.username.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-semibold">{r.username}</span>
                <span className="text-xs text-[var(--text-muted)]">· {timeAgo(r.created_at)}</span>
              </div>
              {r.rating !== null && <RatingStars value={r.rating} readOnly size={13} className="mt-1" />}
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
