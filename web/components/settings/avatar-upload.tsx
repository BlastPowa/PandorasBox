"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AvatarUpload({ initialUrl, username }: { initialUrl: string | null; username: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3 MB.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sign in required");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${uid}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", uid);
      if (updErr) throw updErr;
      setUrl(publicUrl);
      toast.success("Profile picture updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]"
        aria-label="Change profile picture"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] font-display text-2xl font-bold text-[#0a0a0f]">
            {(username ?? "U").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Loader2 className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
        </span>
      </button>
      <div>
        <p className="text-sm font-semibold">Profile picture</p>
        <p className="text-xs text-[var(--text-muted)]">JPG or PNG, up to 3 MB. Click the avatar to upload.</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
