"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Columns3, Flag, Layers, Link2, ListChecks, Map, Pencil, Plus, Sparkles, Trash2, UserCircle, X } from "lucide-react";
import { AvatarC } from "@/components/ui/Avatar";
import { useModel } from "@/lib/contexts/ModelContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ADMIN_IDS, DEFAULT_WORKSPACE_ID, type TimelineEvent, type TimelineEventStatus, type TimelineEventTier } from "@/lib/data";

type TimelineViewMode = "schedule" | "line" | "board" | "done";

const emptyForm = {
  title: "",
  group: "General",
  status: "planned" as TimelineEventStatus,
  tier: "core" as TimelineEventTier,
  date: "",
  label: "",
  notes: "",
  responsibleId: "",
  url: "",
};

const secondaryGroups = new Set(["growth", "media"]);

function formatDate(date?: string) {
  if (!date) return "No date";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function sortEvents(a: TimelineEvent, b: TimelineEvent) {
  if (a.status === "done" && b.status !== "done") return 1;
  if (a.status !== "done" && b.status === "done") return -1;
  const ad = a.date || "9999-12-31";
  const bd = b.date || "9999-12-31";
  if (ad !== bd) return ad.localeCompare(bd);
  const tierSort = tierOf(a) === "core" && tierOf(b) !== "core" ? -1 : tierOf(a) !== "core" && tierOf(b) === "core" ? 1 : 0;
  if (tierSort) return tierSort;
  return a.title.localeCompare(b.title);
}

function tierOf(item: TimelineEvent): TimelineEventTier {
  if (item.tier) return item.tier;
  return secondaryGroups.has(item.group.toLowerCase()) ? "secondary" : "core";
}

function groupByDate(items: TimelineEvent[]) {
  return items.reduce<Record<string, TimelineEvent[]>>((acc, item) => {
    const key = item.date || "no-date";
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});
}

function eventHref(url?: string) {
  const trimmed = url?.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function hostLabel(url?: string) {
  const href = eventHref(url);
  if (!href) return "";
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}

export default function TimelineView() {
  const { t, users, currentUser, workspaces, currentWorkspaceId, timelineEvents, addTimelineEvent, updateTimelineEvent, deleteTimelineEvent } = useModel();
  const isMobile = useIsMobile(760);
  const mono = "var(--font-dm-mono), monospace";
  const [mode, setMode] = useState<TimelineViewMode>("schedule");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canSeeAll = !!currentUser && (ADMIN_IDS.includes(currentUser) || workspaces.some(workspace => workspace.captains.includes(currentUser)));
  const visibleTimelineEvents = useMemo(() => (
    timelineEvents.filter(event => {
      if (!(canSeeAll || event.responsibleId === currentUser)) return false;
      // Roadmap is per-workspace: in a specific workspace show only its events
      // (untagged legacy events fall back to Binayah AI); "All" shows everything.
      if (!currentWorkspaceId) return true;
      return event.workspaceId ? event.workspaceId === currentWorkspaceId : currentWorkspaceId === DEFAULT_WORKSPACE_ID;
    })
  ), [canSeeAll, currentUser, timelineEvents, currentWorkspaceId]);
  const events = useMemo(() => [...visibleTimelineEvents].sort(sortEvents), [visibleTimelineEvents]);
  const done = events.filter(item => item.status === "done");
  const active = events.filter(item => item.status !== "done");
  const coreActive = active.filter(item => tierOf(item) === "core");
  const secondaryActive = active.filter(item => tierOf(item) === "secondary");
  const next = active[0];
  const groupedActive = groupByDate(active);

  const beginCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const beginEdit = (event: TimelineEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      group: event.group,
      status: event.status,
      tier: tierOf(event),
      date: event.date || "",
      label: event.label || "",
      notes: event.notes || "",
      responsibleId: event.responsibleId || "",
      url: event.url || "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveForm = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      updateTimelineEvent(editingId, form);
    } else {
      addTimelineEvent(form);
    }
    closeForm();
  };

  return (
    <main style={{ width: "100%", maxWidth: 1240, margin: "0 auto", padding: isMobile ? "10px 4px 24px" : "22px 28px 34px", color: t.text }}>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(360px, 1fr) minmax(420px, 0.8fr)",
          gap: 12,
          alignItems: "stretch",
          marginBottom: 16,
        }}
      >
        <div style={{ border: `1px solid ${t.border}`, borderTop: `3px solid ${t.accent}`, background: `linear-gradient(135deg, ${t.bgCard}, ${t.accent}08)`, borderRadius: 14, padding: isMobile ? 14 : 16, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.accent, fontFamily: mono, fontSize: 11, fontWeight: 950, letterSpacing: 1, textTransform: "uppercase" }}>
            <CalendarDays size={14} />
            delivery timeline
            <span style={{ border: `1px solid ${t.accent}44`, background: t.accent + "12", borderRadius: 999, padding: "1px 7px", letterSpacing: 0 }}>{active.length} active</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 27 : 32, lineHeight: 1, letterSpacing: 0, color: t.text }}>
                Binayah roadmap
              </h1>
              <p style={{ margin: "7px 0 0", color: t.textMuted, fontSize: 13, lineHeight: 1.4, maxWidth: 680 }}>
                {canSeeAll ? "Track delivery dates, ownership, links, and status in one place." : "Your assigned milestones from the delivery roadmap."}
              </p>
            </div>
            {next && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${t.amber}44`, background: t.amber + "12", color: t.amber, borderRadius: 999, padding: "6px 10px", fontFamily: mono, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }}>
                <Flag size={13} />
                next: {formatDate(next.date)}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: 8, minWidth: 0 }}>
          <Metric label="core" value={coreActive.length} hint="critical" color={t.accent} mono={mono} />
          <Metric label="secondary" value={secondaryActive.length} hint="support" color={t.cyan || t.amber} mono={mono} />
          <Metric label="done" value={done.length} hint="complete" color={t.green} mono={mono} />
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ModeButton active={mode === "schedule"} icon={<Sparkles size={14} />} label="schedule" onClick={() => setMode("schedule")} />
          <ModeButton active={mode === "line"} icon={<Map size={14} />} label="timeline" onClick={() => setMode("line")} />
          <ModeButton active={mode === "board"} icon={<Columns3 size={14} />} label="board" onClick={() => setMode("board")} />
          <ModeButton active={mode === "done"} icon={<ListChecks size={14} />} label="completed" onClick={() => setMode("done")} />
        </div>
        <button
          type="button"
          onClick={beginCreate}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${t.accent}55`, background: t.accent, color: "#fff", borderRadius: 10, padding: "9px 13px", cursor: "pointer", fontFamily: mono, fontSize: 12, fontWeight: 900 }}
        >
          <Plus size={15} />
          add event
        </button>
      </div>

      {formOpen && (
        <section style={{ border: `1px dashed ${t.accent}66`, background: t.accent + "08", borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(240px, 1.3fr) 150px 150px 140px 150px", gap: 8 }}>
            <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="event title" style={fieldStyle(t)} />
            <input value={form.group} onChange={e => setForm(prev => ({ ...prev, group: e.target.value }))} placeholder="group" style={fieldStyle(t)} />
            <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as TimelineEventStatus }))} style={fieldStyle(t)}>
              <option value="planned">planned</option>
              <option value="in-progress">in progress</option>
              <option value="blocked">blocked</option>
              <option value="done">done</option>
            </select>
            <select value={form.tier} onChange={e => setForm(prev => ({ ...prev, tier: e.target.value as TimelineEventTier }))} style={fieldStyle(t)}>
              <option value="core">core</option>
              <option value="secondary">secondary</option>
            </select>
            <input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} style={fieldStyle(t)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "190px 190px minmax(0, 1fr) auto", gap: 8, marginTop: 8, alignItems: "stretch" }}>
            <input value={form.label} onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="label, optional" style={fieldStyle(t)} />
            <select value={form.responsibleId} onChange={e => setForm(prev => ({ ...prev, responsibleId: e.target.value }))} style={fieldStyle(t)}>
              <option value="">responsible</option>
              {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <input value={form.url} onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))} placeholder="url, optional" style={fieldStyle(t)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto", gap: 8, marginTop: 8, alignItems: "stretch" }}>
            <input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="notes, optional" style={fieldStyle(t)} />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={closeForm} style={{ ...buttonStyle(t), color: t.textMuted, background: "transparent" }}><X size={14} /> cancel</button>
              <button type="button" onClick={saveForm} style={{ ...buttonStyle(t), color: "#fff", background: t.accent, borderColor: t.accent }}>{editingId ? "save" : "add"}</button>
            </div>
          </div>
        </section>
      )}

      {mode === "schedule" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section style={{ border: `1px solid ${t.accent}33`, background: t.bgCard, borderRadius: 16, padding: isMobile ? 10 : 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <PanelTitle icon={<Sparkles size={15} />} title="delivery schedule" count={active.length} color={t.accent} mono={mono} />
              <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 12, lineHeight: 1.35 }}>
                Core and secondary items stay together by date. Use the card badge and color rail to tell the delivery tier apart.
              </p>
            </div>
            {Object.entries(groupedActive).map(([date, items], idx) => (
              <DateBand key={date} date={date} items={items} color={idx === 0 ? t.amber : t.accent} isMobile={isMobile} onEdit={beginEdit} onDelete={deleteTimelineEvent} />
            ))}
          </section>
          {active.length === 0 && <EmptyState text="// no active timeline events" />}
        </section>
      )}

      {mode === "line" && (
        <TimelineLine items={active} isMobile={isMobile} onEdit={beginEdit} onDelete={deleteTimelineEvent} />
      )}

      {mode === "board" && (
        <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {(["planned", "in-progress", "blocked", "done"] as TimelineEventStatus[]).map(status => {
            const items = events.filter(item => item.status === status);
            return (
              <div key={status} style={{ border: `1px solid ${statusColor(status, t)}44`, background: statusColor(status, t) + "07", borderRadius: 14, padding: 10, minHeight: 160 }}>
                <PanelTitle icon={<Flag size={15} />} title={status.replace("-", " ")} count={items.length} color={statusColor(status, t)} mono={mono} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 9 }}>
                  {items.map(item => <TimelineCard key={item.id} item={item} color={statusColor(item.status, t)} onEdit={beginEdit} onDelete={deleteTimelineEvent} />)}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {mode === "done" && (
        <section>
          <PanelTitle icon={<CheckCircle2 size={15} />} title="completed" count={done.length} color={t.green} mono={mono} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10, marginTop: 9 }}>
            {done.map(item => <TimelineCard key={item.id} item={item} compact color={t.green} onEdit={beginEdit} onDelete={deleteTimelineEvent} />)}
          </div>
          {done.length === 0 && <EmptyState text="// no completed timeline events yet" />}
        </section>
      )}
    </main>
  );
}

function fieldStyle(t: ReturnType<typeof useModel>["t"]): React.CSSProperties {
  return {
    width: "100%",
    border: `1px solid ${t.border}`,
    background: t.bgCard,
    color: t.text,
    borderRadius: 9,
    padding: "9px 10px",
    outline: "none",
    fontFamily: "var(--font-dm-mono), monospace",
    fontSize: 12,
  };
}

function buttonStyle(t: ReturnType<typeof useModel>["t"]): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: `1px solid ${t.border}`,
    borderRadius: 9,
    padding: "0 11px",
    cursor: "pointer",
    fontFamily: "var(--font-dm-mono), monospace",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 38,
    whiteSpace: "nowrap",
  };
}

function statusColor(status: TimelineEventStatus, t: ReturnType<typeof useModel>["t"]) {
  if (status === "done") return t.green;
  if (status === "in-progress") return t.amber;
  if (status === "blocked") return t.red;
  return t.accent;
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  const { t } = useModel();
  const mono = "var(--font-dm-mono), monospace";
  return (
    <button type="button" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${active ? t.accent + "55" : t.border}`, background: active ? t.accent + "18" : t.bgCard, color: active ? t.accent : t.textMuted, borderRadius: 10, padding: "8px 11px", cursor: "pointer", fontFamily: mono, fontSize: 12, fontWeight: 900 }}>
      {icon}
      {label}
    </button>
  );
}

function Metric({ label, value, hint, color, mono }: { label: string; value: number | string; hint?: string; color: string; mono: string }) {
  const { t } = useModel();
  return (
    <div style={{ border: `1px solid ${color}44`, borderTop: `3px solid ${color}`, background: color + "10", borderRadius: 12, padding: "10px 11px", minWidth: 0, minHeight: 92, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ color, fontFamily: mono, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.7 }}>{label}</div>
      <div style={{ color: t.text, fontSize: typeof value === "number" ? 23 : 17, fontWeight: 950, lineHeight: 1.08, overflowWrap: "anywhere" }}>{value}</div>
      {hint && <div style={{ color: t.textDim, fontFamily: mono, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{hint}</div>}
    </div>
  );
}

function PanelTitle({ icon, title, count, color, mono }: { icon: React.ReactNode; title: string; count: number; color: string; mono: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, color, fontFamily: mono, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>
      {icon}
      {title}
      <span style={{ border: `1px solid ${color}55`, background: color + "16", borderRadius: 999, padding: "1px 7px", letterSpacing: 0 }}>{count}</span>
    </div>
  );
}

function TimelineLine({ items, isMobile, onEdit, onDelete }: { items: TimelineEvent[]; isMobile: boolean; onEdit: (event: TimelineEvent) => void; onDelete: (id: number) => void }) {
  const { t } = useModel();
  const mono = "var(--font-dm-mono), monospace";
  return (
    <section style={{ border: `1px solid ${t.accent}33`, background: t.bgCard, borderRadius: 16, padding: isMobile ? 10 : 16 }}>
      <PanelTitle icon={<Map size={15} />} title="visual roadmap" count={items.length} color={t.accent} mono={mono} />
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((item, index) => {
          const tier = tierOf(item);
          const lineColor = tier === "core" ? t.accent : (t.cyan || t.amber);
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "28px minmax(0, 1fr)" : "132px 34px minmax(0, 1fr)", gap: isMobile ? 8 : 12, minHeight: 112 }}>
              {!isMobile && (
                <div style={{ color: lineColor, fontFamily: mono, fontSize: 12, fontWeight: 950, textTransform: "uppercase", paddingTop: 8 }}>
                  {formatDate(item.date)}
                </div>
              )}
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                {index < items.length - 1 && <div style={{ position: "absolute", top: 24, bottom: -12, width: 2, background: lineColor + "33" }} />}
                <div style={{ zIndex: 1, width: 24, height: 24, borderRadius: "50%", border: `2px solid ${lineColor}`, background: t.bgCard, boxShadow: `0 0 0 5px ${lineColor}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Flag size={12} color={lineColor} />
                </div>
              </div>
              <div>
                {isMobile && <div style={{ color: lineColor, fontFamily: mono, fontSize: 11, fontWeight: 950, textTransform: "uppercase", marginBottom: 6 }}>{formatDate(item.date)}</div>}
                <TimelineCard item={item} color={statusColor(item.status, t)} compact={isMobile} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
          );
        })}
      </div>
      {items.length === 0 && <EmptyState text="// no active timeline events" />}
    </section>
  );
}

function DateBand({ date, items, color, isMobile, onEdit, onDelete }: { date: string; items: TimelineEvent[]; color: string; isMobile: boolean; onEdit: (event: TimelineEvent) => void; onDelete: (id: number) => void }) {
  const { t } = useModel();
  const mono = "var(--font-dm-mono), monospace";
  return (
    <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "150px minmax(0, 1fr)", gap: isMobile ? 8 : 12, border: `1px solid ${color}33`, background: color + "07", borderRadius: 14, padding: isMobile ? 10 : 12 }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-start", justifyContent: isMobile ? "space-between" : "flex-start", gap: 7, minWidth: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color, fontFamily: mono, fontSize: 12, fontWeight: 950, textTransform: "uppercase" }}>
          <Flag size={14} />
          {date === "no-date" ? "No date" : formatDate(date)}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 24, padding: "0 8px", borderRadius: 999, border: `1px solid ${color}44`, background: t.bgCard, color, fontFamily: mono, fontSize: 12, fontWeight: 900 }}>
          {items.length}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: 10 }}>
        {items.map(item => (
          <TimelineCard key={item.id} item={item} color={statusColor(item.status, t)} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function TimelineCard({ item, color, compact = false, onEdit, onDelete }: { item: TimelineEvent; color: string; compact?: boolean; onEdit: (event: TimelineEvent) => void; onDelete: (id: number) => void }) {
  const { t, users } = useModel();
  const mono = "var(--font-dm-mono), monospace";
  const done = item.status === "done";
  const tier = tierOf(item);
  const responsible = item.responsibleId ? users.find(user => user.id === item.responsibleId) : undefined;
  const href = eventHref(item.url);
  const urlLabel = hostLabel(item.url);
  return (
    <article style={{ minHeight: compact ? 92 : 130, display: "flex", flexDirection: "column", gap: 8, border: `1px solid ${color}44`, borderLeft: `4px solid ${tier === "core" ? t.accent : (t.cyan || t.amber)}`, background: t.bgCard, borderRadius: 10, padding: "12px 12px 12px 10px", boxShadow: "0 1px 0 rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ margin: 0, color: t.text, fontSize: compact ? 14 : 15, lineHeight: 1.25, letterSpacing: 0, fontWeight: 900, overflowWrap: "anywhere" }}>{item.title}</h3>
        <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, color, background: color + "14", border: `1px solid ${color}44`, borderRadius: 999, padding: "3px 7px", fontFamily: mono, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
          {done ? <CheckCircle2 size={12} /> : <Flag size={12} />}
          {done ? "done" : (item.label || item.status)}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", color: t.textMuted, fontFamily: mono, fontSize: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", color: tier === "core" ? t.accent : (t.cyan || t.amber), background: (tier === "core" ? t.accent : (t.cyan || t.amber)) + "12", border: `1px solid ${(tier === "core" ? t.accent : (t.cyan || t.amber))}33`, borderRadius: 999, padding: "1px 6px", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
          {tier}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Layers size={12} />
          {item.group}
        </span>
        {item.date && <span>· {formatDate(item.date)}</span>}
        {responsible && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${responsible.color}33`, background: responsible.color + "10", color: responsible.color, borderRadius: 999, padding: "1px 7px", fontWeight: 900 }}>
            <AvatarC user={responsible} size={16} />
            {responsible.name}
          </span>
        )}
        {!responsible && item.responsibleId && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <UserCircle size={12} />
            {item.responsibleId}
          </span>
        )}
      </div>
      {item.notes && <p style={{ margin: 0, color: t.textMuted, fontSize: 12, lineHeight: 1.4 }}>{item.notes}</p>}
      {href && (
        <a href={href} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: t.accent, fontFamily: mono, fontSize: 11, fontWeight: 900, textDecoration: "none", width: "fit-content", border: `1px solid ${t.accent}33`, background: t.accent + "10", borderRadius: 999, padding: "3px 8px" }}>
          <Link2 size={12} />
          {urlLabel || "open link"}
        </a>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: "auto" }}>
        <button type="button" onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`} style={{ ...iconButton(t), color: t.textMuted }}><Pencil size={13} /></button>
        <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.title}`} style={{ ...iconButton(t), color: t.red }}><Trash2 size={13} /></button>
      </div>
    </article>
  );
}

function iconButton(t: ReturnType<typeof useModel>["t"]): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: "transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
}

function EmptyState({ text }: { text: string }) {
  const { t } = useModel();
  return <div style={{ border: `1px dashed ${t.border}`, borderRadius: 12, padding: 22, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontSize: 12 }}>{text}</div>;
}
