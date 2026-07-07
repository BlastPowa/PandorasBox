"use client";

import { useState } from "react";
import { CheckCircle2, SkipForward, HelpCircle, Copy, Search } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { searchCandidates } from "@/lib/import/match";

export interface ImportSummaryData {
  imported: UnifiedSearchResult[];
  skipped: string[];
  unmatched: string[];
  duplicates: string[];
}

export function ImportSummary({
  data,
  onRetryMatch,
}: {
  data: ImportSummaryData;
  onRetryMatch: (query: string, result: UnifiedSearchResult) => void;
}) {
  const [retryQuery, setRetryQuery] = useState<Record<string, string>>({});
  const [retryResults, setRetryResults] = useState<Record<string, UnifiedSearchResult[]>>({});
  const [searching, setSearching] = useState<string | null>(null);

  async function retry(title: string) {
    const q = (retryQuery[title] ?? title).trim();
    if (!q) return;
    setSearching(title);
    try {
      const results = await searchCandidates(q);
      setRetryResults((prev) => ({ ...prev, [title]: results }));
    } finally {
      setSearching(null);
    }
  }

  const nothing = data.imported.length === 0 && data.skipped.length === 0 && data.unmatched.length === 0 && data.duplicates.length === 0;
  if (nothing) return null;

  return (
    <GlassCard macDots title="Import results">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatChip icon={<CheckCircle2 className="size-4 text-[var(--completed)]" />} label="Imported" value={data.imported.length} />
          <StatChip icon={<Copy className="size-4 text-[var(--text-muted)]" />} label="Duplicates" value={data.duplicates.length} />
          <StatChip icon={<SkipForward className="size-4 text-[var(--onhold)]" />} label="Skipped" value={data.skipped.length} />
          <StatChip icon={<HelpCircle className="size-4 text-[var(--dropped)]" />} label="Unmatched" value={data.unmatched.length} />
        </div>

        {(data.unmatched.length > 0 || data.skipped.length > 0) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Fix unmatched titles</p>
            {[...data.unmatched, ...data.skipped].map((title) => (
              <div key={title} className="glass space-y-2 rounded-[var(--radius-md)] p-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
                  <Input
                    placeholder="Search again…"
                    value={retryQuery[title] ?? title}
                    onChange={(e) => setRetryQuery((prev) => ({ ...prev, [title]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && void retry(title)}
                    className="h-8 max-w-[45%] text-xs"
                  />
                  <Button variant="glass" size="sm" onClick={() => void retry(title)} loading={searching === title}>
                    <Search className="size-3.5" />
                  </Button>
                </div>
                {retryResults[title] && retryResults[title].length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {retryResults[title].slice(0, 5).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onRetryMatch(title, r)}
                        className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                      >
                        {r.title} {r.year ? `(${r.year})` : ""}
                      </button>
                    ))}
                  </div>
                )}
                {retryResults[title] && retryResults[title].length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">No results — try a different spelling.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2">
      {icon}
      <div>
        <div className="font-mono text-lg font-bold leading-none">{value}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      </div>
    </div>
  );
}
