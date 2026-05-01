"use client";

import { useState, useEffect } from "react";
import { type T } from "@/lib/themes";

type ZoomSummary = { uuid: string; topic: string; startTime: string; summary: string };

interface Props { t: T }

function SummaryBody({ text, t }: { text: string; t: T }) {
  const mono = "var(--font-dm-mono), monospace";
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontSize: 15, fontWeight: 800, color: t.text, marginTop: 16, marginBottom: 6 }}>{line.slice(3)}</div>);
    } else if (line.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontSize: 13, fontWeight: 700, color: t.accent, fontFamily: mono, marginTop: 12, marginBottom: 4 }}>{line.slice(4)}</div>);
    } else if (line.startsWith("- ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
          <span style={{ color: t.accent, flexShrink: 0, marginTop: 1 }}>·</span>
          <span style={{ fontSize: 13, color: t.text, lineHeight: 1.6 }}>{line.slice(2)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(<p key={i} style={{ fontSize: 13, color: t.text, lineHeight: 1.7, margin: "0 0 8px" }}>{line}</p>);
    }
  });

  return <div>{elements}</div>;
}

export default function CallsView({ t }: Props) {
  const [summaries, setSummaries] = useState<ZoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ZoomSummary | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const mono = "var(--font-dm-mono), monospace";

  useEffect(() => {
    fetch("/api/zoom/summaries")
      .then(r => r.json())
      .then(d => { if (d.ok) { setSummaries(d.summaries ?? []); setUpdatedAt(d.updatedAt ?? null); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "32px 20px", color: t.textMuted, fontFamily: mono, fontSize: 12 }}>loading calls…</div>;

  if (selected) return (
    <div style={{ padding: "0 20px 40px", maxWidth: 760 }}>
      <button type="button" onClick={() => setSelected(null)}
        style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: t.textMuted, fontFamily: mono, cursor: "pointer", marginBottom: 20 }}>
        ← all calls
      </button>
      <div style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 4 }}>{selected.topic}</div>
      <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono, marginBottom: 24 }}>
        {new Date(selected.startTime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </div>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "20px 24px" }}>
        <SummaryBody text={selected.summary} t={t} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>binayah calls — AI summaries</div>
        {updatedAt && <span style={{ fontSize: 10, color: t.textDim, fontFamily: mono }}>· synced {new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
      </div>
      {summaries.length === 0 ? (
        <div style={{ color: t.textMuted, fontSize: 12, fontFamily: mono }}>No summaries yet. Hit ↺ resync on the home view to load your Zoom calls.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {summaries.map(s => (
            <button key={s.uuid} type="button" onClick={() => setSelected(s)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", textAlign: "left", transition: "border-color 0.1s", width: "100%" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.accent + "66"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.topic}</div>
                <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono, marginTop: 4 }}>
                  {new Date(s.startTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: mono }}>{s.summary.split("\n").filter(l => l.startsWith("- ")).length} items</span>
                <span style={{ color: t.textDim, fontSize: 18 }}>›</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
