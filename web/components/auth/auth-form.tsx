"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/ui/app-link";
import { toast } from "sonner";
import { Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const destination = params.get("next") ?? "/";
  const next = destination.startsWith("/") && !destination.startsWith("//") && !destination.includes("\\") ? destination : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(params.get("error") ? "Your sign-in link has expired or could not be verified. Try again or request a new password reset." : "");

  const configured = isSupabaseConfigured;

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!configured || loading) return;
    setErrorMessage("");
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim() || email.trim().split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email if confirmation is required, then sign in.");
        router.push(`/login?next=${encodeURIComponent(next)}`);
      } else {
        // Login accepts either an email or a username; resolve username -> email server-side first.
        let loginEmail = email.trim();
        if (!loginEmail.includes("@")) {
          const res = await fetch("/api/auth/resolve-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: loginEmail }),
          });
          if (!res.ok) throw new Error(res.status === 429 ? "Too many attempts. Wait a minute and try again." : "Username sign-in is temporarily unavailable. Try your email address instead.");
          const json = (await res.json()) as { email: string | null };
          if (!json.email) throw new Error("We couldn't sign you in. Check your email or username and password, or reset your password.");
          loginEmail = json.email;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        toast.success("Welcome back!");
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setErrorMessage((code === "invalid_credentials" || (err instanceof Error && /invalid login credentials/i.test(err.message)))
        ? "We couldn't sign you in. Check your email or username and password. If you joined with Google, use Forgot password to set a password for the same email."
        : code === "email_not_confirmed" ? "Confirm your email using the link in your inbox before signing in. Check your spam folder too."
        : err instanceof Error ? err.message : "Sign-in failed. Please try again.");
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
            {mode === "login" ? "Welcome back" : "Join PBox"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {mode === "login"
              ? "Sign in to sync your library across devices."
              : "One box for everything you watch and read."}
          </p>
        </div>

        {!configured && (
          <div className="rounded-[var(--radius-md)] border border-[rgb(var(--gold-rgb)/0.3)] bg-[rgb(var(--gold-rgb)/0.1)] px-4 py-3 text-xs leading-relaxed text-[var(--gold)]">
            Accounts are temporarily unavailable. Please try again later.
          </div>
        )}

        {errorMessage && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm leading-relaxed text-red-300">{errorMessage}</p>}
        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                aria-label="Username"
                autoCapitalize="none"
                spellCheck={false}
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
              aria-label={mode === "login" ? "Email or username" : "Email"}
              autoCapitalize="none"
              spellCheck={false}
              type={mode === "login" ? "text" : "email"}
              required
              placeholder={mode === "login" ? "Email or username" : "Email"}
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete={mode === "login" ? "username" : "email"}
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              aria-label="Password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              placeholder="Password"
              className="pl-10 pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 flex size-11 items-center justify-center text-[var(--text-muted)]">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {mode === "login" && (
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs font-semibold text-[var(--accent)]">
                Forgot password?
              </Link>
            </div>
          )}
          <Button type="submit" className="w-full" loading={loading} disabled={!configured}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" /> or <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <Button variant="glass" className="w-full" onClick={handleGoogle} disabled={!configured || loading} type="button">
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
