"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui-fx/input";

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

export function UsernameEditor({ initialUsername }: { initialUsername: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialUsername ?? "");
  const [saved, setSaved] = useState(initialUsername ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const next = value.trim();
    if (next === saved) {
      setEditing(false);
      return;
    }
    if (!USERNAME_RE.test(next)) {
      toast.error("Usernames must be 3–20 characters: letters, numbers, underscore or dot.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sign in required");
      const { error } = await supabase.from("profiles").update({ username: next }).eq("id", uid);
      if (error) {
        if (/duplicate key|unique constraint/i.test(error.message)) {
          throw new Error("That username is already taken.");
        }
        throw error;
      }
      setSaved(next);
      setEditing(false);
      toast.success("Username updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update username");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[var(--text-secondary)]">Username</span>
      <div className="flex items-center gap-2">
        <Input
          value={editing ? value : saved}
          onChange={(e) => setValue(e.target.value)}
          disabled={!editing || busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") {
              setValue(saved);
              setEditing(false);
            }
          }}
        />
        {editing ? (
          <button
            onClick={() => void save()}
            disabled={busy}
            className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
            aria-label="Save username"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </button>
        ) : (
          <button
            onClick={() => { setValue(saved); setEditing(true); }}
            className="glass grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text)]"
            aria-label="Edit username"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Friends find you by this — not your email. Letters, numbers, underscore or dot, 3–20 characters.
      </p>
    </label>
  );
}
