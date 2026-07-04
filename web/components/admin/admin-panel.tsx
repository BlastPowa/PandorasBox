"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { Pill } from "@/components/ui-fx/badge";

type Section = "links" | "sites" | "announcements" | "issues";

export function AdminPanel() {
  const [section, setSection] = useState<Section>("links");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Pill active={section === "links"} onClick={() => setSection("links")}>Watch Links</Pill>
        <Pill active={section === "sites"} onClick={() => setSection("sites")}>Sites Directory</Pill>
        <Pill active={section === "announcements"} onClick={() => setSection("announcements")}>Announcements</Pill>
        <Pill active={section === "issues"} onClick={() => setSection("issues")}>User Issues</Pill>
        <RefreshButton />
      </div>
      {section === "links" && <WatchLinks />}
      {section === "sites" && <Sites />}
      {section === "announcements" && <Announcements />}
      {section === "issues" && <Issues />}
    </div>
  );
}

interface Issue { id: string; username: string; message: string; status: string; created_at: string }

function Issues() {
  const supabase = createClient();
  const [rows, setRows] = useState<Issue[]>([]);

  async function load() {
    const { data } = await supabase
      .from("user_issues")
      .select("id, username, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as Issue[] | null) ?? []);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function resolve(id: string) {
    await supabase.from("user_issues").update({ status: "resolved" }).eq("id", id);
    void load();
  }
  async function del(id: string) {
    await supabase.from("user_issues").delete().eq("id", id);
    void load();
  }

  return (
    <GlassCard macDots title="User Issues">
      <div className="space-y-2 p-4">
        {rows.length === 0 && <p className="text-sm text-[var(--text-muted)]">No issues submitted yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-[var(--accent)]">#{r.id.slice(0, 8).toUpperCase()}</span>
              <span className={`text-xs font-semibold ${r.status === "resolved" ? "text-[var(--completed)]" : "text-[var(--gold)]"}`}>
                {r.status}
              </span>
            </div>
            <p className="font-semibold">{r.username}</p>
            <p className="mt-1 whitespace-pre-wrap text-[var(--text-secondary)]">{r.message}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{new Date(r.created_at).toLocaleString()}</span>
              <div className="flex gap-2">
                {r.status !== "resolved" && (
                  <button onClick={() => resolve(r.id)} className="flex items-center gap-1 text-[var(--completed)]">
                    <Check className="size-3.5" /> Resolve
                  </button>
                )}
                <button onClick={() => del(r.id)} className="text-[var(--dropped)]"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function RefreshButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="gold"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/admin/refresh", { method: "POST" });
          const json = (await res.json()) as { updated?: number; error?: string };
          if (!res.ok) throw new Error(json.error ?? "Failed");
          toast.success(`Availability refreshed (${json.updated ?? 0} titles)`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Refresh failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw className="size-4" /> Refresh availability
    </Button>
  );
}

interface WatchLink { id: string; media_key: string; site_name: string; url: string; category: string; quality: string | null }

function WatchLinks() {
  const supabase = createClient();
  const [rows, setRows] = useState<WatchLink[]>([]);
  const [form, setForm] = useState({ media_key: "", media_type: "movie", site_name: "", url: "", category: "free", quality: "" });

  async function load() {
    const { data } = await supabase.from("watch_links").select("id, media_key, site_name, url, category, quality").order("created_at", { ascending: false }).limit(100);
    setRows((data as WatchLink[] | null) ?? []);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function addRow() {
    if (!form.media_key || !form.url || !form.site_name) { toast.error("media key, site name and URL are required"); return; }
    const { error } = await supabase.from("watch_links").insert({
      media_key: form.media_key.trim(), media_type: form.media_type, site_name: form.site_name.trim(),
      url: form.url.trim(), category: form.category, quality: form.quality || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Link added");
    setForm({ ...form, site_name: "", url: "", quality: "" });
    void load();
  }
  async function del(id: string) {
    await supabase.from("watch_links").delete().eq("id", id);
    void load();
  }

  return (
    <GlassCard macDots title="Watch / Read Links">
      <div className="space-y-4 p-4">
        <p className="text-xs text-[var(--text-muted)]">
          media_key ties a link to a title: <code className="font-mono">tmdb-603</code>, <code className="font-mono">anilist-16498</code>, <code className="font-mono">mangadex-&lt;uuid&gt;</code>, or <code className="font-mono">global</code> for site-wide.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="media_key (e.g. tmdb-603)" value={form.media_key} onChange={(e) => setForm({ ...form, media_key: e.target.value })} />
          <Input placeholder="Site name (e.g. Netflix)" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
          <Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="sm:col-span-2" />
          <select className="h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["subscription", "free", "rent", "buy", "reading"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input placeholder="Quality (HD, 4K, CAM...)" value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })} />
        </div>
        <Button onClick={addRow}><Plus className="size-4" /> Add link</Button>
        <div className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 truncate"><span className="font-mono text-xs text-[var(--accent)]">{r.media_key}</span> · {r.site_name} <span className="text-[var(--text-muted)]">({r.category}{r.quality ? `/${r.quality}` : ""})</span></span>
              <button onClick={() => del(r.id)} className="text-[var(--dropped)]"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

interface Site { id: string; name: string; url: string; category: string; is_free: boolean }

function Sites() {
  const supabase = createClient();
  const [rows, setRows] = useState<Site[]>([]);
  const [form, setForm] = useState({ name: "", url: "", category: "mixed", is_free: true });

  async function load() {
    const { data } = await supabase.from("site_directory").select("id, name, url, category, is_free").order("sort");
    setRows((data as Site[] | null) ?? []);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function addRow() {
    if (!form.name || !form.url) { toast.error("Name and URL required"); return; }
    const { error } = await supabase.from("site_directory").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Site added"); setForm({ ...form, name: "", url: "" }); void load();
  }
  async function del(id: string) { await supabase.from("site_directory").delete().eq("id", id); void load(); }

  return (
    <GlassCard macDots title="Sites Directory">
      <div className="space-y-4 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Site name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <select className="h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["movies", "anime", "manga", "manhwa", "mixed"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} /> Free site</label>
        </div>
        <Button onClick={addRow}><Plus className="size-4" /> Add site</Button>
        <div className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>{r.name} <span className="text-[var(--text-muted)]">({r.category})</span></span>
              <button onClick={() => del(r.id)} className="text-[var(--dropped)]"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

interface Ann { id: string; title: string; body: string | null; variant: string; active: boolean }

function Announcements() {
  const supabase = createClient();
  const [rows, setRows] = useState<Ann[]>([]);
  const [form, setForm] = useState({ title: "", body: "", variant: "info" });

  async function load() {
    const { data } = await supabase.from("announcements").select("id, title, body, variant, active").order("created_at", { ascending: false });
    setRows((data as Ann[] | null) ?? []);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function addRow() {
    if (!form.title) { toast.error("Title required"); return; }
    const { error } = await supabase.from("announcements").insert({ title: form.title, body: form.body || null, variant: form.variant, active: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement posted"); setForm({ title: "", body: "", variant: "info" }); void load();
  }
  async function del(id: string) { await supabase.from("announcements").delete().eq("id", id); void load(); }

  return (
    <GlassCard macDots title="Announcements">
      <div className="space-y-4 p-4">
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Body (optional)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <Button onClick={addRow}><Plus className="size-4" /> Post announcement</Button>
        <div className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>{r.title}</span>
              <button onClick={() => del(r.id)} className="text-[var(--dropped)]"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
