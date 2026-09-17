"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CircleAlert, ExternalLink, Globe2, Link2, Megaphone, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";

type Section = "links" | "sites" | "announcements" | "issues";

const SECTIONS = [
  { id: "links" as const, label: "Provider Links", description: "Title-specific watch and reading destinations", icon: Link2 },
  { id: "sites" as const, label: "Sites Directory", description: "Services shown in Watch, Read & Play", icon: Globe2 },
  { id: "announcements" as const, label: "Announcements", description: "Global messages shown inside PBox", icon: Megaphone },
  { id: "issues" as const, label: "User Issues", description: "Review and resolve submitted reports", icon: CircleAlert },
];

export function AdminPanel() {
  const [section, setSection] = useState<Section>("links");
  const activeSection = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];
  return (
    <div className="space-y-5">
      <section className="pb-uiverse-card pb-uiverse-card--feature pb-aura rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]"><ShieldCheck className="size-4" /> Admin workspace</div>
            <h2 className="mt-2 font-display text-xl font-bold tracking-tight">{activeSection.label}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{activeSection.description}</p>
          </div>
          <RefreshButton />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SECTIONS.map(({ id, label, description, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`rounded-[18px] border p-3 text-left transition ${active ? "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.12)]" : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[rgb(var(--accent-rgb)/0.2)]"}`}
              >
                <span className={`grid size-9 place-items-center rounded-xl ${active ? "bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"}`}><Icon className="size-4" /></span>
                <p className="mt-2 text-sm font-bold">{label}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{description}</p>
              </button>
            );
          })}
        </div>
      </section>
      {section === "links" && <WatchLinks />}
      {section === "sites" && <Sites />}
      {section === "announcements" && <Announcements />}
      {section === "issues" && <Issues />}
    </div>
  );
}

interface Issue { id: string; username: string; message: string; status: string; created_at: string }

function Issues() {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  async function load() {
    const { data } = await supabase
      .from("user_issues")
      .select("id, username, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as Issue[] | null) ?? []);
  }
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("user_issues")
      .select("id, username, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!cancelled) setRows((data as Issue[] | null) ?? []);
      });
    return () => { cancelled = true; };
  }, [supabase]);

  async function resolve(id: string) {
    await supabase.from("user_issues").update({ status: "resolved" }).eq("id", id);
    void load();
  }
  async function del(id: string) {
    await supabase.from("user_issues").delete().eq("id", id);
    void load();
  }

  const openCount = rows.filter((row) => row.status !== "resolved").length;
  const resolvedCount = rows.filter((row) => row.status === "resolved").length;
  const visibleRows = rows.filter((row) => filter === "all" || (filter === "resolved" ? row.status === "resolved" : row.status !== "resolved"));

  return (
    <GlassCard macDots title="User Issues" className="pb-aura">
      <div className="space-y-2 p-4">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {[["all", "All", rows.length], ["open", "Open", openCount], ["resolved", "Resolved", resolvedCount]].map(([id, label, count]) => (
            <button key={id} onClick={() => setFilter(id as typeof filter)} className={`rounded-xl border px-3 py-2 text-left ${filter === id ? "border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)]" : "border-[var(--border)] bg-[var(--bg-surface)]"}`}>
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</span>
              <span className="font-display text-lg font-bold">{count}</span>
            </button>
          ))}
        </div>
        {visibleRows.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-muted)]">No issues in this view.</p>}
        {visibleRows.map((r) => (
          <div key={r.id} className="pb-uiverse-row rounded-[var(--radius-md)] p-3 text-sm">
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
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<WatchLink[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ media_key: "", media_type: "movie", site_name: "", url: "", category: "free", quality: "" });

  async function load() {
    const { data } = await supabase.from("watch_links").select("id, media_key, site_name, url, category, quality").order("created_at", { ascending: false }).limit(100);
    setRows((data as WatchLink[] | null) ?? []);
  }
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("watch_links")
      .select("id, media_key, site_name, url, category, quality")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!cancelled) setRows((data as WatchLink[] | null) ?? []);
      });
    return () => { cancelled = true; };
  }, [supabase]);

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

  const visibleRows = rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    return !needle || row.media_key.toLowerCase().includes(needle) || row.site_name.toLowerCase().includes(needle) || row.category.toLowerCase().includes(needle);
  });
  const globalCount = rows.filter((row) => row.media_key === "global").length;
  const uniqueSites = new Set(rows.map((row) => row.site_name.toLowerCase())).size;

  return (
    <GlassCard macDots title="External Provider Links" className="pb-aura">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Links" value={rows.length} />
          <Metric label="Providers" value={uniqueSites} />
          <Metric label="Global" value={globalCount} />
        </div>
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input placeholder="Search provider links…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {visibleRows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 truncate"><span className="font-mono text-xs text-[var(--accent)]">{r.media_key}</span> · <strong>{r.site_name}</strong> <span className="text-[var(--text-muted)]">({r.category}{r.quality ? `/${r.quality}` : ""})</span></span>
              <button onClick={() => del(r.id)} className="text-[var(--dropped)]"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {visibleRows.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-muted)]">No provider links match that search.</p>}
        </div>
      </div>
    </GlassCard>
  );
}

interface Site { id: string; name: string; url: string; category: string; is_free: boolean }

function Sites() {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Site[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({ name: "", url: "", category: "mixed", is_free: true });

  async function load() {
    const { data } = await supabase.from("site_directory").select("id, name, url, category, is_free").order("sort");
    setRows((data as Site[] | null) ?? []);
  }
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("site_directory")
      .select("id, name, url, category, is_free")
      .order("sort")
      .then(({ data }) => {
        if (!cancelled) setRows((data as Site[] | null) ?? []);
      });
    return () => { cancelled = true; };
  }, [supabase]);

  async function addRow() {
    if (!form.name || !form.url) { toast.error("Name and URL required"); return; }
    const { error } = await supabase.from("site_directory").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Site added"); setForm({ ...form, name: "", url: "" }); void load();
  }
  async function del(id: string) { await supabase.from("site_directory").delete().eq("id", id); void load(); }

  const categories = Array.from(new Set(rows.map((row) => row.category))).sort();
  const visibleRows = rows.filter((row) => {
    const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
    const needle = query.trim().toLowerCase();
    return matchesCategory && (!needle || row.name.toLowerCase().includes(needle) || row.url.toLowerCase().includes(needle));
  });

  return (
    <GlassCard macDots title="Sites Directory" className="pb-aura">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Services" value={rows.length} />
          <Metric label="Free" value={rows.filter((row) => row.is_free).length} />
          <Metric label="Categories" value={categories.length} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Site name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <select className="h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["movies", "anime", "manga", "manhwa", "comics", "games", "mixed"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} /> Free site</label>
        </div>
        <Button onClick={addRow}><Plus className="size-4" /> Add site</Button>
        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input placeholder="Search sites…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <select className="h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {visibleRows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0"><strong>{r.name}</strong> <span className="text-[var(--text-muted)]">({r.category} · {r.is_free ? "Free" : "Paid"})</span></span>
              <div className="flex items-center gap-2">
                <a href={r.url} target="_blank" rel="noreferrer" className="text-[var(--text-muted)] transition hover:text-[var(--accent)]" aria-label={`Open ${r.name}`}><ExternalLink className="size-4" /></a>
              <button onClick={() => del(r.id)} className="text-[var(--dropped)]"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
          {visibleRows.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-muted)]">No directory sites match these filters.</p>}
        </div>
      </div>
    </GlassCard>
  );
}

interface Ann { id: string; title: string; body: string | null; variant: string; active: boolean }

function Announcements() {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Ann[]>([]);
  const [form, setForm] = useState({ title: "", body: "", variant: "info" });

  async function load() {
    const { data } = await supabase.from("announcements").select("id, title, body, variant, active").order("created_at", { ascending: false });
    setRows((data as Ann[] | null) ?? []);
  }
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("announcements")
      .select("id, title, body, variant, active")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setRows((data as Ann[] | null) ?? []);
      });
    return () => { cancelled = true; };
  }, [supabase]);

  async function addRow() {
    if (!form.title) { toast.error("Title required"); return; }
    const { error } = await supabase.from("announcements").insert({ title: form.title, body: form.body || null, variant: form.variant, active: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement posted"); setForm({ title: "", body: "", variant: "info" }); void load();
  }
  async function del(id: string) { await supabase.from("announcements").delete().eq("id", id); void load(); }

  return (
    <GlassCard macDots title="Announcements" className="pb-aura">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Total" value={rows.length} />
          <Metric label="Active" value={rows.filter((row) => row.active).length} />
        </div>
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Body (optional)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <select className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })}>
          {['info', 'success', 'warning', 'important'].map((variant) => <option key={variant} value={variant}>{variant}</option>)}
        </select>
        <Button onClick={addRow}><Plus className="size-4" /> Post announcement</Button>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="pb-uiverse-row flex items-start justify-between gap-3 rounded-xl p-3 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><strong>{r.title}</strong><span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{r.variant}</span>{r.active && <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--completed)]">Active</span>}</div>
                {r.body && <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{r.body}</p>}
              </div>
              <button onClick={() => del(r.id)} className="shrink-0 text-[var(--dropped)]"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="pb-uiverse-row rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold">{value}</p>
    </div>
  );
}
