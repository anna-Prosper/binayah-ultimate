"use client";

// Per-user daily checklist. Items are admin-defined recurring tasks; checking one
// pays its points immediately and is recorded per (user, Dubai-day, item), so the
// list "refreshes" each day with nothing deleted — points/history accumulate.
// You complete YOUR OWN items; admins can view/configure anyone's.

import { useState } from "react";
import { CalendarCheck, Plus, Trash2, Check, X, Pencil, Flame } from "lucide-react";
import { useModel } from "@/lib/contexts/ModelContext";
import { DAILY_POINTS_CAP } from "@/lib/data";
import { dubaiDateStr } from "@/lib/date";
import { dailyStreak, completionByDay, shiftDay } from "@/lib/dailyChecklist";
import type { T } from "@/lib/themes";

const mono = "var(--font-dm-mono), monospace";

export default function DailyChecklistPanel({ t, currentUser, isAdmin }: { t: T; currentUser: string; isAdmin: boolean }) {
  const {
    dailyChecklistItems, dailyDone, toggleDailyDone,
    addDailyItem, updateDailyItem, removeDailyItem, users,
  } = useModel();

  const [viewUserId, setViewUserId] = useState(currentUser);
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState("");
  const [newPts, setNewPts] = useState("2");

  const today = dubaiDateStr();
  const isSelf = viewUserId === currentUser;
  const viewUser = users.find(u => u.id === viewUserId);
  const accent = viewUser?.color || t.accent;

  const items = dailyChecklistItems
    .filter(i => i.userId === viewUserId && (editing || i.active))
    .sort((a, b) => a.order - b.order);

  // Nothing to show for a non-admin with no items.
  if (items.length === 0 && !isAdmin) return null;

  const doneKey = (id: number) => `${viewUserId}::${today}::${id}`;
  const isDone = (id: number) => doneKey(id) in dailyDone;
  const activeItems = items.filter(i => i.active);
  const doneCount = activeItems.filter(i => isDone(i.id)).length;
  const earnedToday = activeItems.reduce((s, i) => s + (isDone(i.id) ? i.points : 0), 0);
  const cappedToday = Math.min(earnedToday, DAILY_POINTS_CAP);
  const pct = activeItems.length ? Math.round((doneCount / activeItems.length) * 100) : 0;
  const allDone = activeItems.length > 0 && doneCount === activeItems.length;
  const streak = dailyStreak(viewUserId, dailyDone, today);
  const byDay = completionByDay(viewUserId, dailyDone);
  // Last 30 Dubai-days, oldest → newest, for the completion heatmap.
  const heatDays = Array.from({ length: 30 }, (_, i) => shiftDay(today, -(29 - i)));

  const addItem = () => {
    const n = parseInt(newPts, 10);
    if (!newText.trim()) return;
    addDailyItem(viewUserId, newText, isNaN(n) ? 1 : n);
    setNewText(""); setNewPts("2");
  };

  return (
    <section style={{ marginBottom: 16, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <CalendarCheck size={16} color={accent} />
        <span style={{ fontSize: 13, fontWeight: 900, color: t.text, fontFamily: mono, letterSpacing: 0.3 }}>
          {isSelf ? "daily checklist" : `${viewUser?.name || viewUserId}'s daily`}
        </span>
        <span style={{ fontSize: 11, color: allDone ? t.green : t.textDim, fontFamily: mono, fontWeight: allDone ? 700 : 400 }}>
          {allDone ? "all done 🎉" : `${doneCount}/${activeItems.length}`} · +{cappedToday} pts{earnedToday > DAILY_POINTS_CAP ? ` (cap ${DAILY_POINTS_CAP})` : ""}
        </span>
        {streak > 0 && (
          <span title={`${streak}-day streak`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 900, fontFamily: mono, color: t.orange, background: t.orange + "18", border: `1px solid ${t.orange}44`, borderRadius: 999, padding: "1px 7px" }}>
            <Flame size={11} /> {streak}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {isAdmin && (
            <select
              value={viewUserId}
              onChange={e => { setViewUserId(e.target.value); setEditing(false); }}
              style={{ fontSize: 11, fontFamily: mono, color: t.textMuted, background: t.bgHover || t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "3px 6px", outline: "none" }}
            >
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          {isAdmin && (
            <button
              onClick={() => setEditing(v => !v)}
              title={editing ? "done editing" : "edit items"}
              style={{ display: "flex", alignItems: "center", gap: 4, background: editing ? accent + "18" : "transparent", border: `1px solid ${editing ? accent + "66" : t.border}`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", color: editing ? accent : t.textMuted, fontFamily: mono, fontSize: 11, fontWeight: 700 }}
            >
              <Pencil size={11} /> {editing ? "done" : "edit"}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {activeItems.length > 0 && (
        <div style={{ height: 5, background: t.bgHover || t.border, borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 999, transition: "width 0.25s ease" }} />
        </div>
      )}

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(item => {
          const done = isDone(item.id);
          const canCheck = isSelf; // you complete your own items only
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, background: done ? accent + "10" : (t.bgHover || "transparent"), border: `1px solid ${done ? accent + "40" : t.border}`, borderRadius: 10, padding: "7px 10px", opacity: item.active ? 1 : 0.5 }}>
              <button
                onClick={() => canCheck && toggleDailyDone(item.id)}
                disabled={!canCheck}
                title={canCheck ? (done ? "mark not done" : "mark done") : "only this user can check their items"}
                style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: `1.5px solid ${done ? accent : t.textDim}`, background: done ? accent : "transparent", cursor: canCheck ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                {done && <Check size={13} color="#fff" strokeWidth={3} />}
              </button>

              {editing ? (
                <>
                  <input
                    defaultValue={item.text}
                    onBlur={e => { const v = e.target.value.trim(); if (v && v !== item.text) updateDailyItem(item.id, { text: v }); }}
                    style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.text, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 6px", outline: "none", fontFamily: mono }}
                  />
                  <input
                    type="number" min={1}
                    defaultValue={item.points}
                    onBlur={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n) && n > 0 && n !== item.points) updateDailyItem(item.id, { points: n }); }}
                    style={{ width: 52, fontSize: 12, color: t.text, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 6px", outline: "none", fontFamily: mono }}
                  />
                  <button
                    onClick={() => updateDailyItem(item.id, { active: !item.active })}
                    title={item.active ? "deactivate" : "activate"}
                    style={{ fontSize: 10, fontFamily: mono, fontWeight: 700, color: item.active ? t.green : t.textDim, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 6px", cursor: "pointer" }}
                  >{item.active ? "on" : "off"}</button>
                  <button onClick={() => removeDailyItem(item.id)} title="remove" style={{ background: "transparent", border: "none", cursor: "pointer", color: t.red, display: "flex", padding: 2 }}>
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: done ? t.textDim : t.textSec, textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.text}
                  </span>
                  <span style={{ flexShrink: 0, color: accent, border: `1px solid ${accent}55`, borderRadius: 999, padding: "1px 7px", fontFamily: mono, fontSize: 10, fontWeight: 900 }}>
                    {item.points}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 30-day completion heatmap */}
      {!editing && activeItems.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: mono, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 5 }}>last 30 days</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {heatDays.map(day => {
              const dc = byDay.get(day);
              const intensity = dc ? Math.min(dc.points / DAILY_POINTS_CAP, 1) : 0;
              const isToday = day === today;
              const bg = dc ? `${accent}${Math.round(25 + intensity * 55).toString(16).padStart(2, "0")}` : (t.bgHover || t.border);
              return (
                <div
                  key={day}
                  title={dc ? `${day} · ${dc.count} done · ${dc.points} pts` : `${day} · none`}
                  style={{ width: 13, height: 13, borderRadius: 3, background: bg, border: isToday ? `1.5px solid ${accent}` : `1px solid ${t.border}` }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ color: t.textDim, fontFamily: mono, fontSize: 12, border: `1px dashed ${t.border}`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
          {`// no daily items yet`}
        </div>
      )}

      {/* Admin add-item form */}
      {editing && isAdmin && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addItem(); }}
            placeholder="new daily task…"
            style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: t.text, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 9px", outline: "none", fontFamily: mono }}
          />
          <input
            type="number" min={1} value={newPts}
            onChange={e => setNewPts(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addItem(); }}
            title="points"
            style={{ width: 56, fontSize: 12, color: t.text, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 6px", outline: "none", fontFamily: mono }}
          />
          <button
            onClick={addItem}
            disabled={!newText.trim()}
            style={{ display: "flex", alignItems: "center", gap: 4, background: accent, border: "none", borderRadius: 8, padding: "7px 11px", cursor: newText.trim() ? "pointer" : "default", color: "#fff", fontWeight: 900, fontFamily: mono, fontSize: 12, opacity: newText.trim() ? 1 : 0.5 }}
          >
            <Plus size={13} /> add
          </button>
        </div>
      )}

      {isAdmin && editing && (
        <div style={{ fontSize: 10.5, color: t.textDim, fontFamily: mono, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
          <X size={10} /> daily points count toward PTS, capped at {DAILY_POINTS_CAP}/day per person.
        </div>
      )}
    </section>
  );
}
