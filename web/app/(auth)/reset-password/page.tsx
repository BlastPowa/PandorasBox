"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Lock } from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState("");

  const recoveryStarted = useRef(false);

  // The recovery link logs the user into a temporary session; confirm it's present.
  useEffect(() => {
    if (!isSupabaseConfigured || recoveryStarted.current) return;
    recoveryStarted.current = true;
    const supabase = createClient();
    async function verifyRecovery() {
      // The browser client also exchanges codes from older direct recovery links.
      const { data } = await supabase.auth.getSession();
      if (new URL(window.location.href).searchParams.has("code")) {
        window.history.replaceState({}, "", "/reset-password");
      }
      if (data.session) setReady(true);
      else setLinkError("This reset link is invalid or has expired. Request a new one.");
    }
    void verifyRecovery().catch(() => setLinkError("We couldn't verify this link. Please request a new one."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! Signing you in…");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard macDots title="Set new password" className="w-full max-w-md">
      <div className="space-y-5 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Make it at least 8 characters. You&apos;ll be signed in right after.
          </p>
        </div>

        {linkError && <div role="alert" className="text-sm text-red-300">{linkError} <Link className="underline" href="/forgot-password">Request a reset link</Link></div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              type="password"
              required
              minLength={8}
              aria-label="New password"
              placeholder="New password"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              type="password"
              required
              minLength={8}
              aria-label="Confirm new password"
              placeholder="Confirm new password"
              className="pl-10"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={!isSupabaseConfigured || !ready}>
            Update password
          </Button>
        </form>
      </div>
    </GlassCard>
  );
}
