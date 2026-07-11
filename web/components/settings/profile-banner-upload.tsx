"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function readDimensions(file: File) {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function ProfileBannerUpload({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) { toast.error("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > MAX_BYTES) { toast.error("Profile banners must be 8 MB or smaller."); return; }
    setBusy(true);
    try {
      const dimensions = await readDimensions(file);
      if (dimensions.width < 1200 || dimensions.height < 400) toast.info("This image will work, but 1200×400 or larger will look sharper.");
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in required");
      const path = `${uid}/banner`;
      const { error: uploadError } = await supabase.storage.from("profile-banners").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("profile-banners").getPublicUrl(path).data.publicUrl;
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase.from("profiles").update({ banner_url: cacheBustedUrl }).eq("id", uid);
      if (profileError) throw profileError;
      setUrl(cacheBustedUrl);
      toast.success("Profile banner updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Banner upload failed"); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in required");
      const { error: profileError } = await supabase.from("profiles").update({ banner_url: null }).eq("id", uid);
      if (profileError) throw profileError;
      const { error: storageError } = await supabase.storage.from("profile-banners").remove([`${uid}/banner`]);
      if (storageError) throw storageError;
      setUrl(null);
      toast.success("Profile banner removed");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove banner"); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-3 border-t border-[var(--border)] pt-4">
      <div><h3 className="text-sm font-semibold">Profile banner</h3><p className="text-xs text-[var(--text-muted)]">Displayed inside your profile header. JPG, PNG, or WebP up to 8 MB; 1200×400 or larger is recommended.</p></div>
      <div className="relative aspect-[3/1] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[radial-gradient(circle_at_70%_20%,rgb(var(--accent-2-rgb)/0.5),transparent_38%),linear-gradient(145deg,var(--bg-elevated),var(--bg-base))]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Profile banner preview" className="size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="glass absolute bottom-3 left-3 inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold">
          {busy ? <Loader2 className="size-4 animate-spin" /> : url ? <Upload className="size-4" /> : <ImagePlus className="size-4" />}
          {url ? "Replace banner" : "Upload banner"}
        </button>
      </div>
      <div className="flex justify-end">{url && <button type="button" disabled={busy} onClick={() => void remove()} className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--dropped)] hover:underline"><Trash2 className="size-3.5" /> Remove banner</button>}</div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
    </section>
  );
}
