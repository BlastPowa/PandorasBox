"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, LogOut, QrCode } from "lucide-react";
import { encodeListToQR, decodeListFromQR, validateDecodedList } from "@core/sync/qrSync";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";

export function SettingsView({ username, country }: { username: string | null; country: string }) {
  const { items, signedIn, add } = useLibrary();
  const [qr, setQr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pandoras-box-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} titles`);
  }

  function showQr() {
    try {
      setQr(encodeListToQR(items));
    } catch {
      toast.error("Could not generate export code");
    }
  }

  async function importFrom(text: string, kind: "json" | "code") {
    try {
      const parsed = kind === "json" ? (JSON.parse(text) as unknown) : decodeListFromQR(text);
      if (!validateDecodedList(parsed)) {
        toast.error("That file isn't a valid Pandora's Box export.");
        return;
      }
      const existing = new Set(items.map((i) => i.id));
      let n = 0;
      for (const item of parsed) {
        if (existing.has(item.id)) continue;
        const { addedAt: _a, updatedAt: _u, ...rest } = item;
        await add(rest);
        n += 1;
      }
      toast.success(`Imported ${n} new titles`);
    } catch {
      toast.error("Import failed");
    }
  }

  return (
    <div className="space-y-5">
      <GlassCard macDots title="Profile">
        <div className="space-y-3 p-5">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)]">Username</span>
            <Input defaultValue={username ?? ""} disabled />
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            Country ({country}) affects where-to-watch results. Manage sign-in providers with your account.
          </p>
          <form action="/auth/signout" method="post">
            <Button variant="danger" type="submit" className="w-full sm:w-auto">
              <LogOut className="size-4" /> Sign out
            </Button>
          </form>
        </div>
      </GlassCard>

      <GlassCard macDots title="Your Data">
        <div className="space-y-4 p-5">
          {!signedIn && <p className="text-sm text-[var(--text-muted)]">Sign in to export or import your library.</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="glass" onClick={exportJson} disabled={!signedIn}><Download className="size-4" /> Export JSON</Button>
            <Button variant="glass" onClick={() => fileRef.current?.click()} disabled={!signedIn}><Upload className="size-4" /> Import JSON</Button>
            <Button variant="glass" onClick={showQr} disabled={!signedIn}><QrCode className="size-4" /> Export Code</Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await importFrom(await file.text(), "json");
                e.target.value = "";
              }}
            />
          </div>
          {qr && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                Copy this portable code to import your library on another device:
              </p>
              <textarea
                readOnly
                value={qr}
                onFocus={(e) => e.target.select()}
                className="h-24 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 font-mono text-[10px] text-[var(--text-secondary)]"
              />
              <Input
                placeholder="Paste a code here to import..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") void importFrom((e.target as HTMLInputElement).value, "code");
                }}
              />
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard macDots title="About">
        <div className="space-y-1 p-5 text-sm text-[var(--text-secondary)]">
          <p><span className="font-semibold text-[var(--text)]">Pandora&apos;s Box</span> — universal entertainment tracker.</p>
          <p className="text-xs text-[var(--text-muted)]">
            Data &amp; artwork from TMDB, AniList and MangaDex. This app links out to external sites; it does not host content.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
