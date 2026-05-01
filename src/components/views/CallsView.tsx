"use client";

import { useState, useEffect } from "react";
import { type T } from "@/lib/themes";

type ZoomCall = { id: string | number; uuid: string; topic: string; startTime: string; duration: number };

interface Props { t: T }

export default function CallsView({ t }: Props) {
  const [calls, setCalls] = useState<ZoomCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ZoomCall | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const mono = "var(--font-dm-mono), monospace";

  useEffect(() => {
    fetch("/api/zoom/meetings")
      .then(r => r.json())
      .then(d => { if (d.ok) setCalls(d.meetings ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCall = async (call: ZoomCall) => {
    setSelected(call);
    setSummary(null);
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/zoom/meeting-summary?meetingId=${encodeURIComponent(String(call.id))}`);
      const d = await res.json();
      setSummary(d.ok ? d.summary : (d.error || "No summary found"));
    } catch { setSummary("Failed to load summary"); }
    finally { setSummaryLoading(false); }
  };

  if (loading) return (
    <div style={{ padding: "32px 20px", color: t.textMuted, fontFamily: mono, fontSize: 12 }}>loading calls…</div>
  );

  if (selected) return (
    <div style={{ padding: "0 20px 32px" }}>
      <button type="button" onClick={() => { setSelected(null); setSummary(null); }}
        style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: t.textMuted, fontFamily: mono, cursor: "pointer", marginBottom: 16 }}>
        ← all calls
      </button>
      <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginBottom: 4 }}>{selected.topic}</div>
      <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono, marginBottom: 20 }}>
        {new Date(selected.startTime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        {selected.duration ? ` · ${selected.duration}min` : ""}
      </div>
      {summaryLoading ? (
        <div style={{ color: t.textMuted, fontFamily: mono, fontSize: 12 }}>fetching summary…</div>
      ) : summary ? (
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.5, marginBottom: 12, textTransform: "uppercase" }}>AI Summary</div>
          <div style={{ fontSize: 13, color: t.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{summary}</div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div style={{ padding: "0 20px 32px" }}>
      <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 }}>
        binayah calls — AI summaries
      </div>
      {calls.length === 0 ? (
        <div style={{ color: t.textMuted, fontSize: 12, fontFamily: mono }}>No calls found. Sync from the home view to load.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {calls.map(call => (
            <button key={call.uuid} type="button" onClick={() => openCall(call)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", transition: "border-color 0.1s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.accent + "66"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{call.topic}</div>
                <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono, marginTop: 3 }}>
                  {new Date(call.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {call.duration ? ` · ${call.duration}min` : ""}
                </div>
              </div>
              <span style={{ color: t.textDim, fontSize: 16 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
