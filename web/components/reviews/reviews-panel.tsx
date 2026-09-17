"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, MessageSquare, Pencil, Send, ShieldAlert, Star, ThumbsUp, Trash2, Users } from "lucide-react";
import { useLibrary } from "@/lib/library/use-library";
import { RatingStars } from "@/components/ui-fx/rating-stars";
import { Button } from "@/components/ui-fx/button";
import { Spinner } from "@/components/ui-fx/feedback";
import { listReviews, upsertReview, deleteReview, getCurrentUserId, setReviewHelpful, type Review } from "@/lib/reviews/reviews";
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
  const [draftSpoiler, setDraftSpoiler] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortMode, setSortMode] = useState<"recent" | "top">("recent");
  const [audience, setAudience] = useState<"all" | "friends">("all");
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [helpfulPending, setHelpfulPending] = useState<Set<string>>(new Set());

  async function load() {
    await Promise.resolve();
    setLoading(true);
    try {
      const [list, uid] = await Promise.all([listReviews(mediaKey), getCurrentUserId()]);
      setReviews(list);
      setUserId(uid);
      const mine = list.find((r) => r.user_id === uid);
      if (mine) {
        setDraft(mine.body);
        setDraftRating(mine.rating);
        setDraftSpoiler(mine.is_spoiler);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey]);

  const myReview = reviews.find((r) => r.user_id === userId);
  const others = reviews.filter((r) => r.user_id !== userId);
  const ratedReviews = reviews.filter((review) => review.rating !== null);
  const averageRating = ratedReviews.length > 0
    ? ratedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / ratedReviews.length
    : null;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratedReviews.filter((review) => Math.round(review.rating ?? 0) === rating).length,
  }));
  const visibleOthers = audience === "friends" ? others.filter((review) => review.is_friend) : others;
  const sortedOthers = [...visibleOthers].sort((a, b) => {
    if (sortMode === "top") {
      const helpfulDelta = b.helpful_count - a.helpful_count;
      if (helpfulDelta !== 0) return helpfulDelta;
      const ratingDelta = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDelta !== 0) return ratingDelta;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  function beginEditing() {
    if (!myReview) return;
    setDraft(myReview.body);
    setDraftRating(myReview.rating);
    setDraftSpoiler(myReview.is_spoiler);
    setEditing(true);
  }

  function cancelEditing() {
    if (myReview) {
      setDraft(myReview.body);
      setDraftRating(myReview.rating);
      setDraftSpoiler(myReview.is_spoiler);
    }
    setEditing(false);
  }

  async function submit() {
    if (draft.trim().length < 1) {
      toast.error("Write something before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await upsertReview(mediaKey, draft.trim(), draftRating, draftSpoiler);
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
      setDraftSpoiler(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove review");
    }
  }

  async function toggleHelpful(review: Review) {
    if (!signedIn || helpfulPending.has(review.id)) return;
    setHelpfulPending((current) => new Set(current).add(review.id));
    try {
      await setReviewHelpful(review.id, !review.helpful_by_me);
      setReviews((current) => current.map((item) => item.id === review.id ? {
        ...item,
        helpful_by_me: !review.helpful_by_me,
        helpful_count: Math.max(0, item.helpful_count + (review.helpful_by_me ? -1 : 1)),
      } : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update helpful vote");
    } finally {
      setHelpfulPending((current) => {
        const next = new Set(current);
        next.delete(review.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-[var(--accent)]" />
            <h3 className="font-display text-lg font-bold">Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Community ratings and reactions</p>
        </div>
        {others.length > 1 && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {signedIn && (
              <div className="flex rounded-full border border-[var(--border)] bg-[var(--glass)] p-1">
                {(["all", "friends"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAudience(mode)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition",
                      audience === mode ? "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    )}
                  >
                    {mode === "friends" && <Users className="size-3" />}{mode}
                  </button>
                ))}
              </div>
            )}
            <div className="flex rounded-full border border-[var(--border)] bg-[var(--glass)] p-1">
            {(["recent", "top"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition",
                  sortMode === mode ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
              >
                {mode}
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      {averageRating !== null && (
        <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--glass)] p-4 sm:grid-cols-[120px_1fr] sm:items-center">
          <div className="text-center sm:border-r sm:border-[var(--border)] sm:pr-4">
            <div className="flex items-center justify-center gap-1 font-display text-3xl font-black text-[var(--text)]">
              <Star className="size-5 fill-current text-[var(--gold)]" /> {averageRating.toFixed(1)}
            </div>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{ratedReviews.length} rated</p>
          </div>
          <div className="space-y-1.5">
            {distribution.map(({ rating, count }) => {
              const percentage = ratedReviews.length > 0 ? (count / ratedReviews.length) * 100 : 0;
              return (
                <div key={rating} className="grid grid-cols-[14px_1fr_24px] items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="font-mono font-bold">{rating}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-strong)]">
                    <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-right font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {signedIn ? (
        myReview && !editing ? (
          <div className="glass rounded-[var(--radius-md)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Your review</span>
              <div className="flex gap-1">
                <button onClick={beginEditing} aria-label="Edit your review" className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--glass-strong)]">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => void remove(myReview.id)} aria-label="Delete your review" className="rounded-md p-1.5 text-[var(--dropped)] hover:bg-[var(--glass-strong)]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            {myReview.rating !== null && <RatingStars value={myReview.rating} readOnly size={14} className="mt-1.5" />}
            {myReview.is_spoiler && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[rgb(var(--gold-rgb)/0.10)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--gold)]"><ShieldAlert className="size-3" /> Spoilers</span>}
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
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <input type="checkbox" checked={draftSpoiler} onChange={(event) => setDraftSpoiler(event.target.checked)} className="size-4 accent-[var(--accent)]" />
              <ShieldAlert className="size-3.5 text-[var(--gold)]" /> Contains spoilers
            </label>
            <div className="flex justify-end gap-2">
              {editing && (
                <Button size="sm" variant="glass" onClick={cancelEditing}>Cancel</Button>
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
      ) : sortedOthers.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-5 text-center">
          <Users className="mx-auto size-5 text-[var(--text-muted)]" />
          <p className="mt-2 text-sm font-semibold">No friend reviews yet</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Switch back to All to see the wider community.</p>
        </div>
      ) : (
        <div className={cn("space-y-3", scrollable && "max-h-72 overflow-y-auto pr-1")}>
          {sortedOthers.map((r) => (
            <article key={r.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                {r.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[11px] font-bold text-[#0a0a0f]">
                    {r.username.charAt(0).toUpperCase()}
                  </span>
                )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.username}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {timeAgo(r.updated_at)}{r.updated_at !== r.created_at ? " · edited" : ""}
                    </div>
                  </div>
                </div>
                {r.rating !== null && <RatingStars value={r.rating} readOnly size={13} />}
              </div>
              {r.is_spoiler && !revealedSpoilers.has(r.id) ? (
                <button
                  type="button"
                  onClick={() => setRevealedSpoilers((current) => new Set(current).add(r.id))}
                  className="mt-3 flex w-full items-center justify-between gap-3 rounded-[14px] border border-[rgb(var(--gold-rgb)/0.18)] bg-[rgb(var(--gold-rgb)/0.06)] px-3 py-3 text-left"
                >
                  <span><span className="flex items-center gap-1.5 text-xs font-bold text-[var(--gold)]"><ShieldAlert className="size-3.5" /> Spoiler review</span><span className="mt-1 block text-[11px] text-[var(--text-muted)]">Hidden until you choose to reveal it.</span></span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)]"><Eye className="size-3.5" /> Reveal</span>
                </button>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{r.body}</p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2.5">
                {r.is_friend ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]"><Users className="size-3" /> Friend</span> : <span />}
                <button
                  type="button"
                  disabled={!signedIn || helpfulPending.has(r.id)}
                  onClick={() => void toggleHelpful(r)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45",
                    r.helpful_by_me ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--glass-strong)] hover:text-[var(--text)]"
                  )}
                >
                  <ThumbsUp className={cn("size-3.5", r.helpful_by_me && "fill-current")} /> Helpful{r.helpful_count > 0 ? ` ${r.helpful_count}` : ""}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
