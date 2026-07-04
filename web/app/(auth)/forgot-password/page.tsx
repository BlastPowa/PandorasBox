"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard macDots title="Reset password" className="w-full max-w-md">
      <div className="space-y-5 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Enter your email and we&apos;ll send you a link to set a new one.
          </p>
        </div>

        {sent ? (
          <div className="rounded-[var(--radius-md)] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] px-4 py-3 text-sm leading-relaxed text-[#4ade80]">
            If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
            Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                type="email"
                required
                placeholder="Email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading} disabled={!isSupabaseConfigured}>
              Send reset link
            </Button>
          </form>
        )}

        <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    </GlassCard>
  );
}
