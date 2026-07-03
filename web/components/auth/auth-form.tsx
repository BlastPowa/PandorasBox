"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured;

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email if confirmation is required, then sign in.");
        router.push(`/login?next=${encodeURIComponent(next)}`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!configured) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  return (
    <GlassCard macDots title={mode === "login" ? "Sign in" : "Create account"} className="w-full max-w-md">
      <div className="space-y-5 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Join Pandora's Box"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {mode === "login"
              ? "Sign in to sync your library across devices."
              : "One box for everything you watch and read."}
          </p>
        </div>

        {!configured && (
          <div className="rounded-[var(--radius-md)] border border-[rgba(245,165,36,0.3)] bg-[rgba(245,165,36,0.1)] px-4 py-3 text-xs leading-relaxed text-[#fbbf24]">
            Supabase isn&apos;t configured yet. Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code className="font-mono">web/.env.local</code> to enable accounts.
          </div>
        )}

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                placeholder="Username"
                className="pl-10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          )}
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
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={!configured}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" /> or <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <Button variant="glass" className="w-full" onClick={handleGoogle} disabled={!configured} type="button">
          Continue with Google
        </Button>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-[var(--accent)]">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[var(--accent)]">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </GlassCard>
  );
}
