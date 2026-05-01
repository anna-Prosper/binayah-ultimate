"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type T } from "@/lib/themes";
import { Phone, X, Sparkles, ChevronDown, Loader, Check, Plus } from "lucide-react";

type Pipeline = { id: string; name: string; icon: string; stages: string[] };

type SuggestedTask = {
  title: string;
  pipelineId: string;
  pipelineName: string;
  stageName: string | null;
};

type ZoomMeeting = {
  id: string | number;
  uuid?: string;
  topic: string;
  startTime: string;
  duration: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  t: T;
  pipelines: Pipeline[];
  onAddTask: (pipelineId: string, stageName: string) => void;
}

type Phase = "input" | "extracting" | "results";

export default function CallSummaryModal({ open, onClose, t, pipelines, onAddTask }: Props) {
  const [phase, setPhase] = useState<Phase>("input");
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState<SuggestedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  // Zoom fetch state
  const [zoomMeetings, setZoomMeetings] = useState<ZoomMeeting[]>([]);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [zoomDropOpen, setZoomDropOpen] = useState(false);
  const [fetchingMeetingId, setFetchingMeetingId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPhase("input");
      setSummary("");
      setTasks([]);
      setSelected(new Set());
      setError(null);
      setAdding(false);
      setAddedCount(0);
      setZoomDropOpen(false);
      setZoomError(null);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!zoomDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setZoomDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [zoomDropOpen]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const fetchZoomMeetings = useCallback(async () => {
    setZoomLoading(true);
    setZoomError(null);
    try {
      const res = await fetch("/api/zoom/meetings");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setZoomError(data.error || "Failed to load Zoom meetings");
        setZoomMeetings([]);
      } else {
        setZoomMeetings(data.meetings ?? []);
        if ((data.meetings ?? []).length === 0) {
          setZoomError("No past meetings found in this Zoom account.");
        }
      }
    } catch {
      setZoomError("Network error loading Zoom recordings");
    } finally {
      setZoomLoading(false);
    }
  }, []);

  const handleZoomToggle = () => {
    if (!zoomDropOpen && zoomMeetings.length === 0 && !zoomLoading) {
      fetchZoomMeetings();
    }
    setZoomDropOpen(v => !v);
  };

  const handlePickMeeting = async (meeting: ZoomMeeting) => {
    setZoomDropOpen(false);
    setFetchingMeetingId(String(meeting.id));
    setZoomError(null);
    try {
      const res = await fetch(`/api/zoom/meeting-summary?meetingId=${encodeURIComponent(String(meeting.id))}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setZoomError(data.error || "No AI summary found for this meeting");
      } else {
        setSummary(data.summary ?? "");
      }
    } catch {
      setZoomError("Failed to fetch meeting summary");
    } finally {
      setFetchingMeetingId(null);
    }
  };

  const handleExtract = async () => {
    if (!summary.trim()) return;
    setPhase("extracting");
    setError(null);
    try {
      const res = await fetch("/api/call-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim(),
          pipelines: pipelines.map(p => ({ id: p.id, name: p.name, stages: p.stages })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.tasks) {
        setError(data.error || "Failed to extract tasks");
        setPhase("input");
        return;
      }
      setTasks(data.tasks);
      setSelected(new Set(data.tasks.map((_: SuggestedTask, i: number) => i)));
      setPhase("results");
    } catch {
      setError("Network error");
      setPhase("input");
    }
  };

  const handleAdd = () => {
    if (adding) return;
    setAdding(true);
    let count = 0;
    tasks.forEach((task, i) => {
      if (!selected.has(i)) return;
      const stageName = task.stageName || task.title;
      onAddTask(task.pipelineId, stageName);
      count++;
    });
    setAddedCount(count);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  if (!open) return null;

  const mono = "var(--font-dm-mono), monospace";
  const sans = "var(--font-dm-sans), sans-serif";

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
    backdropFilter: "blur(3px)",
  };

  const cardStyle: React.CSSProperties = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 18,
    width: "100%",
    maxWidth: 560,
    boxShadow: t.shadowLg,
    overflow: "hidden",
    animation: "fadeIn 0.15s ease",
    display: "flex",
    flexDirection: "column",
    maxHeight: "90vh",
  };

  const btnBase: React.CSSProperties = {
    border: "none",
    borderRadius: 10,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: mono,
    fontWeight: 700,
    transition: "opacity 0.15s",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${t.accent}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Phone size={14} color={t.accent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: mono, letterSpacing: -0.3 }}>
              call summary → tasks
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, fontFamily: sans, marginTop: 1 }}>
              paste a summary or pull from Zoom — AI extracts action items
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: t.textMuted, padding: 4 }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>

          {phase === "input" && (
            <>
              {/* Zoom fetch row */}
              <div style={{ marginBottom: 10, position: "relative" }} ref={dropRef}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={handleZoomToggle}
                    disabled={!!fetchingMeetingId}
                    style={{ ...btnBase, background: `${t.accent}18`, color: t.accent, border: `1px solid ${t.accent}33`, opacity: fetchingMeetingId ? 0.6 : 1 }}
                  >
                    {fetchingMeetingId ? <Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> : <ChevronDown size={12} />}
                    {fetchingMeetingId ? "fetching summary…" : "pull from Zoom"}
                  </button>
                  {zoomLoading && <span style={{ fontSize: 11, color: t.textMuted, fontFamily: sans }}>loading recordings…</span>}
                </div>

                {/* Zoom dropdown */}
                {zoomDropOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    borderRadius: 12,
                    boxShadow: t.shadowLg,
                    zIndex: 100,
                    minWidth: 320,
                    maxWidth: 480,
                    maxHeight: 240,
                    overflowY: "auto",
                  }}>
                    {zoomLoading && (
                      <div style={{ padding: "12px 16px", fontSize: 12, color: t.textMuted, fontFamily: sans }}>loading…</div>
                    )}
                    {!zoomLoading && zoomMeetings.length === 0 && (
                      <div style={{ padding: "12px 16px", fontSize: 12, color: t.textMuted, fontFamily: sans }}>
                        {zoomError || "No cloud recordings found"}
                      </div>
                    )}
                    {zoomMeetings.map(m => (
                      <button
                        key={m.uuid}
                        onClick={() => handlePickMeeting(m)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          borderBottom: `1px solid ${t.border}`,
                          padding: "10px 14px",
                          cursor: "pointer",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.bgHover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: sans }}>{m.topic}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: sans, marginTop: 2 }}>
                          {new Date(m.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{m.duration}min
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {zoomError && !zoomDropOpen && (
                  <div style={{ marginTop: 6, fontSize: 11, color: t.red, fontFamily: sans }}>{zoomError}</div>
                )}
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: t.border }} />
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: mono }}>or paste</span>
                <div style={{ flex: 1, height: 1, background: t.border }} />
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Paste call summary, meeting notes, or transcript here…"
                style={{
                  width: "100%",
                  minHeight: 160,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 13,
                  color: t.text,
                  fontFamily: sans,
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = t.accent; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
              />

              {error && <div style={{ marginTop: 8, fontSize: 12, color: t.red, fontFamily: sans }}>{error}</div>}
            </>
          )}

          {phase === "extracting" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
              <Loader size={22} color={t.accent} style={{ animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, color: t.textSec, fontFamily: sans }}>extracting action items…</div>
            </div>
          )}

          {phase === "results" && (
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono, marginBottom: 12, letterSpacing: 0.5 }}>
                {tasks.length} task{tasks.length !== 1 ? "s" : ""} found — select to add
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tasks.map((task, i) => {
                  const isSelected = selected.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelected(prev => {
                        const next = new Set(prev);
                        next.has(i) ? next.delete(i) : next.add(i);
                        return next;
                      })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${isSelected ? t.accent + "44" : t.border}`,
                        background: isSelected ? `${t.accent}0d` : t.surface,
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `1.5px solid ${isSelected ? t.accent : t.border}`,
                        background: isSelected ? t.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                        transition: "all 0.12s",
                      }}>
                        {isSelected && <Check size={10} color="#fff" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: sans, lineHeight: 1.4 }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: sans, marginTop: 3 }}>
                          {task.pipelineName}
                          {task.stageName ? ` → ${task.stageName}` : " → new stage"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {addedCount > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: t.green, fontFamily: sans }}>
                  ✓ {addedCount} task{addedCount !== 1 ? "s" : ""} added
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {phase === "results" && (
            <>
              <button
                onClick={() => { setPhase("input"); setTasks([]); setSelected(new Set()); }}
                style={{ ...btnBase, background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted }}
              >
                back
              </button>
              <button
                onClick={handleAdd}
                disabled={selected.size === 0 || adding}
                style={{ ...btnBase, background: selected.size === 0 ? t.surface : t.accent, color: selected.size === 0 ? t.textDim : "#fff", opacity: adding ? 0.7 : 1 }}
              >
                <Plus size={12} />
                add {selected.size} task{selected.size !== 1 ? "s" : ""}
              </button>
            </>
          )}
          {phase === "input" && (
            <>
              <button onClick={onClose} style={{ ...btnBase, background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted }}>
                cancel
              </button>
              <button
                onClick={handleExtract}
                disabled={!summary.trim()}
                style={{ ...btnBase, background: summary.trim() ? t.accent : t.surface, color: summary.trim() ? "#fff" : t.textDim }}
              >
                <Sparkles size={12} />
                extract tasks
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
