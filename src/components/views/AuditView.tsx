"use client";

import { useMemo, useState } from "react";
import { ADMIN_IDS } from "@/lib/data";
import { useModel } from "@/lib/contexts/ModelContext";

type AuditFilter = "all" | "activity" | "requests" | "bugs";

export default function AuditView() {
  const { t, currentUser, users, activityLog, execProposals, bugs } = useModel();
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [query, setQuery] = useState("");
  const mono = "var(--font-dm-mono), monospace";

  const rows = useMemo(() => {
    const activityRows = activityLog.map(e => ({
      id: `activity-${e.time}-${e.type}-${e.target}`,
      kind: "activity" as const,
      title: e.type.replace(/_/g, " "),
      body: e.target,
      user: e.user,
      time: e.time,
      status: e.detail || e.workspaceId || "",
    }));
    const requestRows = execProposals.map(p => ({
      id: `request-${p.id}`,
      kind: "requests" as const,
      title: p.title,
      body: p.body,
      user: p.by,
      time: p.createdAt,
      status: `${p.kind} · ${p.status}${p.reviewedBy ? ` · reviewed by ${p.reviewedBy}` : ""}`,
    }));
    const bugRows = bugs.map(b => ({
      id: `bug-${b.id}`,
      kind: "bugs" as const,
      title: b.title,
      body: `${b.body} ${b.steps || ""}`.trim(),
      user: b.createdBy,
      time: b.updatedAt || b.createdAt,
      status: `${b.type} · ${b.severity} · ${b.status}`,
    }));
    const q = query.trim().toLowerCase();
    return [...activityRows, ...requestRows, ...bugRows]
      .filter(r => filter === "all" || r.kind === filter)
      .filter(r => !q || `${r.title} ${r.body} ${r.user} ${r.status}`.toLowerCase().includes(q))
      .sort((a, b) => b.time - a.time)
      .slice(0, 300);
  }, [activityLog, bugs, execProposals, filter, query]);

  if (!currentUser || !ADMIN_IDS.includes(currentUser)) {
    return (
      <div style={{ padding: 24, color: t.textDim, fontFamily: mono }}>
        // audit is only available to Anna.
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 0 28px", maxWidth: 1040 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>admin audit</div>
          <div style={{ marginTop: 3, fontSize: 24, color: t.text, fontWeight: 950 }}>system trail</div>
          <div style={{ marginTop: 4, color: t.textDim, fontSize: 12, fontFamily: mono, lineHeight: 1.5 }}>
            {rows.length} recent events · for Anna to debug who changed what, request history, and QA issues. It is not a daily user view.
          </div>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search audit..." style={{ width: 280, maxWidth: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 11px", color: t.text, outline: "none", fontFamily: mono, fontSize: 12 }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {(["all", "activity", "requests", "bugs"] as const).map(v => (
          <button key={v} type="button" onClick={() => setFilter(v)} style={{ background: filter === v ? t.accent + "18" : t.bgCard, border: `1px solid ${filter === v ? t.accent + "66" : t.border}`, color: filter === v ? t.accent : t.textMuted, borderRadius: 9, padding: "6px 10px", cursor: "pointer", fontFamily: mono, fontSize: 11, fontWeight: 800 }}>{v}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map(row => {
          const by = users.find(u => u.id === row.user);
          return (
            <article key={row.id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: t.text, fontSize: 13, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</div>
                <div style={{ marginTop: 3, color: t.textMuted, fontSize: 12, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.body}</div>
                <div style={{ marginTop: 5, color: by?.color || t.accent, fontSize: 10, fontFamily: mono, fontWeight: 800 }}>{by?.name || row.user} · {row.status}</div>
              </div>
              <div style={{ color: t.textDim, fontSize: 10, fontFamily: mono, whiteSpace: "nowrap" }}>{new Date(row.time).toLocaleString()}</div>
            </article>
          );
        })}
        {rows.length === 0 && <div style={{ color: t.textDim, fontFamily: mono, border: `1px dashed ${t.border}`, borderRadius: 12, padding: 24 }}>// no audit rows match</div>}
      </div>
    </div>
  );
}
