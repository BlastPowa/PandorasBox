"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, MailCheck } from "lucide-react";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { useLibrary } from "@/lib/library/use-library";

export function ContactForm() {
  const { signedIn } = useLibrary();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim().length < 2 || message.trim().length < 10) {
      toast.error("Add your username and a message of at least 10 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), message: message.trim() }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not send your message.");
      setSentId(json.id ?? null);
      setMessage("");
      toast.success("Sent! An admin will follow up.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setLoading(false);
    }
  }

  if (sentId) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] px-4 py-6 text-center">
        <MailCheck className="size-6 text-[#4ade80]" />
        <p className="text-sm font-semibold text-[#4ade80]">Your issue was sent — reference #{sentId}</p>
        <p className="text-xs text-[var(--text-muted)]">An admin will look into it soon.</p>
        <Button variant="glass" size="sm" onClick={() => setSentId(null)}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={60}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe the issue or question you have…"
        rows={5}
        maxLength={2000}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm outline-none focus:border-[var(--accent)]"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          {signedIn ? "Signed in — feel free to add detail." : "You don't need to sign in to send this."}
        </p>
        <Button type="submit" loading={loading}>
          <Send className="size-4" /> Send to admin
        </Button>
      </div>
    </form>
  );
}
