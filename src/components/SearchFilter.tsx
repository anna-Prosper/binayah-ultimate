"use client";

import { T } from "@/lib/themes";

interface SearchFilterProps {
  searchQ: string;
  setSearchQ: (q: string) => void;
  statusFilter: string | null;
  setStatusFilter: (f: string | null) => void;
  t: T;
}

export default function SearchFilter({ searchQ, setSearchQ, statusFilter, setStatusFilter, t }: SearchFilterProps) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 200px", position: "relative" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search stages..." style={{ width: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "7px 60px 7px 28px", fontSize: 10, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none" }} />
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: t.textDim }}>&#x1F50D;</span>
        {/* m-3: Cmd+K discoverability badge */}
        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "1px 5px", pointerEvents: "none", whiteSpace: "nowrap" }}>⌘K</span>
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {[{ l: "all", v: null }, { l: "live", v: "active" }, { l: "building", v: "in-progress" }, { l: "planned", v: "planned" }, { l: "concept", v: "concept" }, { l: "my claims", v: "claimed" }].map(f => (
          <button key={f.l} onClick={() => setStatusFilter(statusFilter === f.v ? null : f.v)} style={{ background: statusFilter === f.v ? t.accent + "20" : t.bgCard, border: `1px solid ${statusFilter === f.v ? t.accent + "55" : t.border}`, borderRadius: 8, padding: "3px 10px", fontSize: 8, color: statusFilter === f.v ? t.accent : t.textMuted, fontWeight: statusFilter === f.v ? 700 : 500, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>{f.l}</button>
        ))}
      </div>
    </div>
  );
}
