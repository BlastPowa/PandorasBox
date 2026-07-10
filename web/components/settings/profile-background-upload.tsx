"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type ProfileBackgroundPosition = "top" | "center" | "bottom";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function readDimensions(file: File) {
  const src = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(src);
  }
}

export function ProfileBackgroundUpload({ initialUrl, initialPosition }: { initialUrl: string | null; initialPosition: ProfileBackgroundPosition }) {
  const [url, setUrl] = useState(initialUrl);
  const [position, setPosition] = useState<ProfileBackgroundPosition>(initialPosition);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) { toast.error("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > MAX_BYTES) { toast.error("Profile backgrounds must be 8 MB or smaller."); return; }
    setBusy(true);
    try {
      const dimensions = await readDimensions(file);
      if (dimensions.width < 1280 || dimensions.height < 720) toast.info("This image will work, but 1280×720 or larger will look sharper.");
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in required");
      const path = `${uid}/background`;
      const { error: uploadError } = await supabase.storage.from("profile-backgrounds").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("profile-backgrounds").getPublicUrl(path).data.publicUrl;
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase.from("profiles").update({ profile_background_url: cacheBustedUrl, profile_background_position: position }).eq("id", uid);
      if (profileError) throw profileError;
      setUrl(cacheBustedUrl);
      toast.success("Profile background updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Background upload failed"); }
    finally { setBusy(false); }
  }

  async function changePosition(next: ProfileBackgroundPosition) {
    setPosition(next);
    if (!url) return;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Sign in required");
      const { error } = await supabase.from("profiles").update({ profile_background_position: next }).eq("id", data.user.id);
      if (error) throw error;
      toast.success("Background position saved");
    } catch (error) { setPosition(position); toast.error(error instanceof Error ? error.message : "Could not save position"); }
  }

  async function remove() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in required");
      const { error: profileError } = await supabase.from("profiles").update({ profile_background_url: null, profile_background_position: "center" }).eq("id", uid);
      if (profileError) throw profileError;
      const { error: storageError } = await supabase.storage.from("profile-backgrounds").remove([`${uid}/background`]);
      if (storageError) throw storageError;
      setUrl(null); setPosition("center"); toast.success("Profile background removed");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove background"); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-3 border-t border-[var(--border)] pt-4">
      <div><h3 className="text-sm font-semibold">Profile background</h3><p className="text-xs text-[var(--text-muted)]">Visible only on your profile page. JPG, PNG, or WebP up to 8 MB; 1280×720 or larger is recommended.</p></div>
      <div className="relative aspect-[16/6] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[radial-gradient(circle_at_70%_20%,rgb(var(--accent-2-rgb)/0.4),transparent_38%),linear-gradient(145deg,var(--bg-elevated),var(--bg-base))]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Profile background preview" className="size-full object-cover" style={{ objectPosition: `center ${position}` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="glass absolute bottom-3 left-3 inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold"><>{busy ? <Loader2 className="size-4 animate-spin" /> : url ? <Upload className="size-4" /> : <ImagePlus className="size-4" />}</>{url ? "Replace" : "Upload background"}</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-full border border-[var(--border)] bg-[var(--bg-base)] p-1">{(["top", "center", "bottom"] as const).map((item) => <button key={item} type="button" disabled={!url || busy} onClick={() => void changePosition(item)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition", position === item ? "bg-[var(--glass-strong)] text-[var(--accent)]" : "text-[var(--text-muted)]", (!url || busy) && "opacity-45")}>{item}</button>)}</div>{url && <button type="button" disabled={busy} onClick={() => void remove()} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--dropped)] hover:underline"><Trash2 className="size-3.5" /> Remove</button>}</div>
      <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">Your background is public profile decoration and can remain visible even when activity and collections are private.</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
    </section>
  );
}
