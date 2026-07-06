"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import type { WorkspaceDb, DbColumn } from "@/lib/data";
import { ADMIN_IDS } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { Plus, Trash2, ExternalLink, ChevronDown, Table2 } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

const DB_EMOJIS = ["🗃️","📊","📋","📁","🗂️","📈","📉","🔗","💾","🧾","📌","📍","🔐","💼","🏢","🌐","🎯","⚡","🔬","🔍","📡","🧪","🏗️","🤖","🎨","✅","⏰","🟢","🔴","🟡","🟣","💎","🚀","🧠","🔥"];

interface Props {
  currentWorkspaceId: string | null;
  /** If set, auto-opens the database with this name on mount (skips the list view). */
  openDbName?: string;
}

// Status pill color mapping
function statusColor(value: string, t: ReturnType<typeof useModel>["t"]) {
  const v = value.toLowerCase();
  if (v === "active" || v === "published" || v === "new") return t.green;
  if (v === "pending" || v === "draft" || v === "old") return t.textMuted;
  return t.textMuted;
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function truncateUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== "/" ? u.pathname.slice(0, 20) + (u.pathname.length > 20 ? "…" : "") : "");
  } catch {
    return url.slice(0, 30) + (url.length > 30 ? "…" : "");
  }
}

type DbUser = ReturnType<typeof useModel>["users"][number];

function findDbUser(users: ReturnType<typeof useModel>["users"], value: string): DbUser | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return users.find(u =>
    u.id.toLowerCase() === normalized ||
    u.name.toLowerCase() === normalized ||
    u.name.split(" ")[0].toLowerCase() === normalized
  );
}

function UserCellPill({
  user,
  value,
  t,
  onClick,
}: {
  user?: DbUser;
  value: string;
  t: ReturnType<typeof useModel>["t"];
  onClick?: () => void;
}) {
  if (!user) {
    return (
      <span onClick={onClick} style={{ color: t.textDim, cursor: onClick ? "pointer" : "default", fontSize: 12 }}>
        {value || "—"}
      </span>
    );
  }
  return (
    <span
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: onClick ? "pointer" : "default", minWidth: 0 }}
      title={user.name}
    >
      <AvatarC user={user} size={20} />
      <span style={{ fontSize: 12, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
    </span>
  );
}

function UserCellEditor({
  value,
  users,
  t,
  onSave,
  onCancel,
  onKeyDown,
  baseInputStyle,
}: {
  value: string;
  users: ReturnType<typeof useModel>["users"];
  t: ReturnType<typeof useModel>["t"];
  onSave: (v: string) => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  baseInputStyle: React.CSSProperties;
}) {
  const [val, setVal] = useState(value);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const selectedUser = findDbUser(users, val);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  const choose = (next: string) => {
    setVal(next);
    onSave(next);
  };

  return (
    <div
      ref={pickerRef}
      data-no-close
      style={{ position: "relative", minWidth: 170, zIndex: 30 }}
    >
      <button
        type="button"
        autoFocus
        onKeyDown={onKeyDown}
        style={{
          ...baseInputStyle,
          minHeight: 28,
          fontFamily: "inherit",
          cursor: "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          textAlign: "left",
        }}
      >
        <UserCellPill user={selectedUser} value={val} t={t} />
        <ChevronDown size={12} color={t.textDim} />
      </button>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "calc(100% + 4px)",
          width: 230,
          maxHeight: 280,
          overflowY: "auto",
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          boxShadow: t.shadowLg,
          padding: 4,
          zIndex: 2000,
        }}
      >
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault();
            choose("");
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: !val ? t.accent + "18" : "transparent",
            border: "none",
            borderRadius: 6,
            padding: "7px 8px",
            color: !val ? t.accent : t.textMuted,
            cursor: "pointer",
            fontSize: 12,
            textAlign: "left",
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1px dashed ${t.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>—</span>
          <span>None</span>
        </button>
        {users.map(u => {
          const active = selectedUser?.id === u.id || val === u.id;
          return (
            <button
              key={u.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                choose(u.id);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: active ? u.color + "18" : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "7px 8px",
                color: active ? u.color : t.text,
                cursor: "pointer",
                fontSize: 12,
                textAlign: "left",
                fontWeight: active ? 800 : 500,
              }}
            >
              <AvatarC user={u} size={20} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
              {active && <span style={{ color: u.color, fontWeight: 900 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Cell renderer
function CellView({
  col,
  value,
  users,
  t,
  onEdit,
}: {
  col: DbColumn;
  value: string;
  users: ReturnType<typeof useModel>["users"];
  t: ReturnType<typeof useModel>["t"];
  onEdit: () => void;
}) {
  if (col.type === "status") {
    const color = statusColor(value, t);
    return (
      <div
        onClick={onEdit}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 10,
          background: color + "22", color, fontSize: 11,
          fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          border: `1px solid ${color}44`,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}
      >
        {value || "—"}
      </div>
    );
  }
  if (col.type === "url") {
    if (!value) return <span onClick={onEdit} style={{ color: t.textDim, cursor: "pointer" }}>—</span>;
    // Strip javascript: and data: protocol to prevent XSS
    const safeHref = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: t.accent, fontSize: 12, fontFamily: "var(--font-dm-mono), monospace", textDecoration: "none" }}
          onClick={e => e.stopPropagation()}
        >
          {truncateUrl(value)}
        </a>
        <ExternalLink size={10} style={{ color: t.accent, flexShrink: 0 }} />
        <span onClick={onEdit} style={{ color: t.textDim, cursor: "pointer", marginLeft: 2, fontSize: 10 }}>✎</span>
      </span>
    );
  }
  if (col.type === "date") {
    return (
      <span
        onClick={onEdit}
        style={{ color: value ? t.text : t.textDim, cursor: "pointer", fontSize: 12,
          fontFamily: "var(--font-dm-mono), monospace" }}
      >
        {value ? formatDate(value) : "—"}
      </span>
    );
  }
  if (col.type === "user") {
    return <UserCellPill user={findDbUser(users, value)} value={value} t={t} onClick={onEdit} />;
  }
  if (col.type === "number") {
    return (
      <span
        onClick={onEdit}
        style={{ color: value ? t.text : t.textDim, cursor: "pointer", fontSize: 12,
          fontFamily: "var(--font-dm-mono), monospace", textAlign: "right" as const }}
      >
        {value || "—"}
      </span>
    );
  }
  // text default
  return (
    <span onClick={onEdit} style={{ color: value ? t.text : t.textDim, cursor: "pointer", fontSize: 12 }}>
      {value || "—"}
    </span>
  );
}

// Inline cell editor
function CellEditor({
  col,
  value,
  users,
  t,
  onSave,
  onCancel,
}: {
  col: DbColumn;
  value: string;
  users: ReturnType<typeof useModel>["users"];
  t: ReturnType<typeof useModel>["t"];
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const commit = () => onSave(val);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") onCancel();
  };

  const baseInputStyle: React.CSSProperties = {
    background: t.surface,
    color: t.text,
    border: `1px solid ${t.accent}`,
    borderRadius: 4,
    padding: "3px 6px",
    fontSize: 12,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  if (col.type === "status" && col.options && col.options.length > 0) {
    return (
      <select
        ref={r => { inputRef.current = r; }}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        autoFocus
        style={{ ...baseInputStyle, fontFamily: "inherit" }}
      >
        <option value="">—</option>
        {col.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (col.type === "user") {
    return (
      <UserCellEditor
        value={val}
        users={users}
        t={t}
        onSave={onSave}
        onCancel={onCancel}
        onKeyDown={handleKey}
        baseInputStyle={baseInputStyle}
      />
    );
  }

  if (col.type === "date") {
    return (
      <input
        ref={r => { inputRef.current = r; }}
        type="date"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        autoFocus
        style={baseInputStyle}
      />
    );
  }

  return (
    <input
      ref={r => { inputRef.current = r; }}
      type={col.type === "number" ? "number" : "text"}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      autoFocus
      placeholder={col.type === "url" ? "https://…" : ""}
      style={baseInputStyle}
    />
  );
}

// Add column modal
function AddColumnModal({
  t,
  onAdd,
  onClose,
}: {
  t: ReturnType<typeof useModel>["t"];
  onAdd: (col: Omit<DbColumn, "id">) => void;
  onClose: () => void;
}) {
  const isMobile = useIsMobile(720);
  const [name, setName] = useState("");
  const [type, setType] = useState<DbColumn["type"]>("text");
  const [options, setOptions] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const col: Omit<DbColumn, "id"> = { name: trimmed, type };
    if (type === "status" && options.trim()) {
      col.options = options.split(",").map(o => o.trim()).filter(Boolean);
    }
    onAdd(col);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", display: "flex",
      alignItems: isMobile ? "flex-start" : "center", justifyContent: "center",
      padding: isMobile ? 10 : 0,
    }} onClick={onClose}>
      <div
        style={{
          background: t.bgCard, border: `1px solid ${t.border}`,
          borderRadius: 8, padding: isMobile ? 16 : 24, width: isMobile ? "100%" : 340,
          maxWidth: "100%",
          boxShadow: t.shadowLg,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 16 }}>
          Add column
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Column name</div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
              style={{
                background: t.surface, color: t.text,
                border: `1px solid ${t.border}`, borderRadius: 4,
                padding: "6px 10px", fontSize: 12, outline: "none", width: "100%",
                boxSizing: "border-box",
              }}
              placeholder="e.g. Project Name"
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Type</div>
            <select
              value={type}
              onChange={e => setType(e.target.value as DbColumn["type"])}
              style={{
                background: t.surface, color: t.text,
                border: `1px solid ${t.border}`, borderRadius: 4,
                padding: "6px 10px", fontSize: 12, outline: "none", width: "100%",
                boxSizing: "border-box",
              }}
            >
              <option value="text">text</option>
              <option value="url">url</option>
              <option value="date">date</option>
              <option value="status">status</option>
              <option value="user">user</option>
              <option value="number">number</option>
            </select>
          </div>
          {type === "status" && (
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>
                Options (comma separated)
              </div>
              <input
                value={options}
                onChange={e => setOptions(e.target.value)}
                style={{
                  background: t.surface, color: t.text,
                  border: `1px solid ${t.border}`, borderRadius: 4,
                  padding: "6px 10px", fontSize: 12, outline: "none", width: "100%",
                  boxSizing: "border-box",
                }}
                placeholder="e.g. Active, Pending"
              />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: `1px solid ${t.border}`,
                borderRadius: 4, padding: "6px 14px", fontSize: 12,
                color: t.textMuted, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                background: t.accent, border: "none",
                borderRadius: 4, padding: "6px 14px", fontSize: 12,
                color: "#fff", cursor: "pointer", fontWeight: 600,
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create database modal
function CreateDbModal({
  t,
  onCreate,
  onClose,
  workspaceId,
}: {
  t: ReturnType<typeof useModel>["t"];
  onCreate: (name: string, icon: string) => void;
  onClose: () => void;
  workspaceId: string;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🗃️");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isMobile = useIsMobile(720);
  void workspaceId;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)", display: "flex",
      alignItems: isMobile ? "flex-start" : "center", justifyContent: "center",
      padding: isMobile ? 10 : 0,
    }} onClick={onClose}>
      <div
        style={{
          background: t.bgCard, border: `1px solid ${t.border}`,
          borderRadius: 8, padding: isMobile ? 16 : 24, width: isMobile ? "100%" : 320,
          maxWidth: "100%",
          boxShadow: t.shadowLg,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 16 }}>
          Create database
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowEmojiPicker(v => !v)}
                style={{
                  width: 44, height: 36, fontSize: 18, border: `1px solid ${t.border}`,
                  borderRadius: 6, cursor: "pointer", background: t.surface,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >{icon}</button>
              {showEmojiPicker && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0,
                    background: t.bgCard, border: `1px solid ${t.border}`,
                    borderRadius: 8, padding: 8, zIndex: 10, boxShadow: t.shadowLg,
                    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
                    width: 176,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {DB_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => { setIcon(e); setShowEmojiPicker(false); }}
                      style={{
                        fontSize: 18, background: "transparent", border: "none",
                        cursor: "pointer", borderRadius: 4, padding: 2,
                        lineHeight: 1,
                      }}
                    >{e}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && name.trim()) { onCreate(name.trim(), icon); onClose(); }
                if (e.key === "Escape") onClose();
              }}
              placeholder="Database name"
              style={{
                background: t.surface, color: t.text,
                border: `1px solid ${t.border}`, borderRadius: 4,
                padding: "6px 10px", fontSize: 12, outline: "none",
                flex: 1, boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              background: "transparent", border: `1px solid ${t.border}`,
              borderRadius: 4, padding: "6px 14px", fontSize: 12,
              color: t.textMuted, cursor: "pointer",
            }}>Cancel</button>
            <button
              onClick={() => { if (name.trim()) { onCreate(name.trim(), icon); onClose(); } }}
              style={{
                background: t.accent, border: "none",
                borderRadius: 4, padding: "6px 14px", fontSize: 12,
                color: "#fff", cursor: "pointer", fontWeight: 600,
              }}
            >Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main table view
function TableView({
  db,
  t,
  users,
  canEdit,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
  onAddColumn,
  onUpdateDb,
  isMobile,
}: {
  db: WorkspaceDb;
  t: ReturnType<typeof useModel>["t"];
  users: ReturnType<typeof useModel>["users"];
  canEdit: boolean;
  onUpdateRow: (rowId: number, values: Record<string, string>) => void;
  onDeleteRow: (rowId: number) => void;
  onAddRow: () => void;
  onAddColumn: (col: Omit<DbColumn, "id">) => void;
  onUpdateDb: (patch: Partial<Pick<WorkspaceDb, "name" | "icon" | "columns" | "rows" | "views">>) => void;
  isMobile: boolean;
}) {
  const [activeView, setActiveView] = useState(db.views[0]?.id || "view_all");
  const [editingCell, setEditingCell] = useState<{ rowId: number; colId: string } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showAddCol, setShowAddCol] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(db.name);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colNameVal, setColNameVal] = useState("");
  const [confirmDeleteRowId, setConfirmDeleteRowId] = useState<number | null>(null);

  useEffect(() => {
    if (!editingName) setNameVal(db.name);
  }, [db.name, editingName]);

  const saveColName = (colId: string) => {
    const trimmed = colNameVal.trim();
    if (trimmed) {
      onUpdateDb({ columns: db.columns.map(c => c.id === colId ? { ...c, name: trimmed } : c) });
    }
    setEditingColId(null);
  };

  const currentView = db.views.find(v => v.id === activeView) || db.views[0];

  // Filter rows based on current view
  const filteredRows = (() => {
    if (!currentView?.filterCol || currentView.filterCol.startsWith("__")) return db.rows;
    const col = db.columns.find(c => c.id === currentView.filterCol);
    if (!col) return db.rows;
    return db.rows.filter(r => {
      if (!currentView.filterVal) return true;
      return r.values[col.id]?.toLowerCase().includes(currentView.filterVal.toLowerCase());
    });
  })();

  // Default sort: newest date first whenever the table has a date column.
  // This keeps imported Notion update tables useful immediately without
  // forcing users to switch to the date-specific view.
  const sortedRows = (() => {
    const dateCol = db.columns.find(c => c.type === "date");
    if (!dateCol) return [...filteredRows].sort((a, b) => b.createdAt - a.createdAt);
    return [...filteredRows].sort((a, b) => {
      // Rows with no date use createdAt so new undated rows stay at the top
      const da = new Date(a.values[dateCol.id] || "").getTime() || a.createdAt;
      const db2 = new Date(b.values[dateCol.id] || "").getTime() || b.createdAt;
      return db2 - da || b.createdAt - a.createdAt;
    });
  })();

  const handleCellSave = (rowId: number, colId: string, value: string) => {
    onUpdateRow(rowId, { [colId]: value });
    setEditingCell(null);
  };

  const handleNameSave = () => {
    if (nameVal.trim()) onUpdateDb({ name: nameVal.trim() });
    setEditingName(false);
  };

  const COL_MIN = 120;
  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 34;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: isMobile ? "stretch" : "center", gap: 10,
        flexDirection: isMobile ? "column" : "row",
        padding: isMobile ? "8px 10px" : "10px 16px", borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
      }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => { if (canEdit) setShowIconPicker(v => !v); }}
            style={{
              fontSize: 18, background: "transparent", border: `1px solid ${showIconPicker ? t.accent : "transparent"}`,
              borderRadius: 6, cursor: canEdit ? "pointer" : "default", padding: "2px 4px", lineHeight: 1,
            }}
            title={canEdit ? "Change icon" : undefined}
          >{db.icon}</button>
          {showIconPicker && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0,
                background: t.bgCard, border: `1px solid ${t.border}`,
                borderRadius: 8, padding: 8, zIndex: 10, boxShadow: t.shadowLg,
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
                width: 176,
              }}
              onClick={e => e.stopPropagation()}
            >
              {DB_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { onUpdateDb({ icon: e }); setShowIconPicker(false); }}
                  style={{
                    fontSize: 18, background: "transparent", border: "none",
                    cursor: "pointer", borderRadius: 4, padding: 2, lineHeight: 1,
                  }}
                >{e}</button>
              ))}
            </div>
          )}
        </div>
        {editingName ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") { setNameVal(db.name); setEditingName(false); } }}
              style={{
                background: t.surface, color: t.text,
                border: `1px solid ${t.accent}`, borderRadius: 4,
                padding: "3px 8px", fontSize: 14, fontWeight: 700,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleNameSave}
              style={{ background: t.accent, border: "none", borderRadius: 4, padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 800 }}
            >
              save
            </button>
            <button
              type="button"
              onClick={() => { setNameVal(db.name); setEditingName(false); }}
              style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 4, padding: "3px 7px", color: t.textDim, cursor: "pointer", fontSize: 11 }}
            >
              cancel
            </button>
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              onClick={() => { if (canEdit) setEditingName(true); }}
              style={{ fontSize: 14, fontWeight: 700, color: t.text, cursor: canEdit ? "pointer" : "default" }}
            >
              {db.name}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px", color: t.textDim, cursor: "pointer", fontSize: 10 }}
                data-tooltip="Rename database"
              >
                ✎
              </button>
            )}
          </span>
        )}

        <div style={{ display: "flex", gap: 4, marginLeft: isMobile ? 0 : 8, overflowX: "auto", maxWidth: "100%", paddingBottom: isMobile ? 2 : 0 }}>
          {db.views.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              style={{
                background: activeView === v.id ? t.accent + "22" : "transparent",
                border: activeView === v.id ? `1px solid ${t.accent}44` : `1px solid transparent`,
                borderRadius: 4, padding: "3px 10px", fontSize: 11,
                color: activeView === v.id ? t.accent : t.textMuted,
                cursor: "pointer", fontWeight: activeView === v.id ? 600 : 400,
              }}
            >
              {v.name}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: isMobile ? "none" : "block" }} />

        {canEdit && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
            <button
              onClick={() => setShowAddCol(true)}
              style={{
                background: "transparent", border: `1px solid ${t.border}`,
                borderRadius: 4, padding: "4px 10px", fontSize: 11,
                color: t.textMuted, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                flex: isMobile ? "1 1 140px" : undefined,
              }}
            >
              <Plus size={11} /> add column
            </button>
            <button
              onClick={onAddRow}
              style={{
                background: t.accent, border: "none",
                borderRadius: 4, padding: "4px 12px", fontSize: 11,
                color: "#fff", cursor: "pointer", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                flex: isMobile ? "1 1 100px" : undefined,
              }}
            >
              <Plus size={11} /> New
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {db.columns.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 8,
            color: t.textDim, fontSize: 13,
          }}>
            <Table2 size={28} style={{ opacity: 0.3 }} />
            <span>No columns yet. Click &ldquo;+ add column&rdquo; to create one.</span>
          </div>
        ) : (
          <table style={{
            borderCollapse: "collapse", width: "100%", minWidth: Math.max(520, db.columns.length * 130 + 32),
            tableLayout: "fixed", fontSize: 12,
          }}>
            <colgroup>
              {db.columns.map(col => (
                <col key={col.id} style={{ width: col.width ? `${col.width}px` : `${COL_MIN}px` }} />
              ))}
              <col style={{ width: 32 }} />
            </colgroup>
            <thead>
              <tr style={{ height: HEADER_HEIGHT, background: t.bgSoft || t.bg }}>
                {db.columns.map(col => (
                  <th
                    key={col.id}
                    onDoubleClick={() => {
                      if (!canEdit) return;
                      setEditingColId(col.id);
                      setColNameVal(col.name);
                    }}
                    style={{
                      padding: "0 12px",
                      textAlign: "left", fontWeight: 600,
                      fontSize: 10, color: t.textMuted,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      borderBottom: `1px solid ${t.border}`,
                      borderRight: `1px solid ${t.border}`,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      position: "sticky", top: 0, zIndex: 2,
                      background: t.bgSoft || t.bg,
                      cursor: canEdit ? "text" : "default",
                    }}
                  >
                    {editingColId === col.id ? (
                      <input
                        autoFocus
                        value={colNameVal}
                        onChange={e => setColNameVal(e.target.value)}
                        onBlur={() => saveColName(col.id)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveColName(col.id);
                          if (e.key === "Escape") setEditingColId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          background: t.surface, color: t.text,
                          border: `1px solid ${t.accent}`, borderRadius: 3,
                          padding: "1px 4px", fontSize: 10, outline: "none",
                          width: "calc(100% - 8px)", fontWeight: 600,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          fontFamily: "inherit",
                        }}
                      />
                    ) : (
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        data-tooltip={`${col.name} · ${col.type}${canEdit ? " · double-click to rename" : ""}`}
                      >
                        {col.name}
                        <span style={{ fontSize: 9, opacity: 0.5 }}>
                          {col.type === "url" ? "↗" : col.type === "date" ? "📅" : col.type === "status" ? "◎" : col.type === "user" ? "👤" : col.type === "number" ? "#" : "T"}
                        </span>
                      </span>
                    )}
                  </th>
                ))}
                <th style={{
                  borderBottom: `1px solid ${t.border}`,
                  position: "sticky", top: 0, zIndex: 2,
                  background: t.bgSoft || t.bg,
                }} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={db.columns.length + 1}
                    style={{
                      padding: "32px 16px", textAlign: "center",
                      color: t.textDim, fontSize: 12,
                    }}
                  >
                    {db.rows.length > 0
                      ? "No rows match this filter."
                      : canEdit ? "No rows yet. Click + New to add one." : "No rows yet."}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      height: ROW_HEIGHT,
                      background: hoveredRow === row.id
                        ? (t.bgHover || t.bgSoft || t.bg)
                        : idx % 2 === 0 ? t.bgCard : (t.bgSoft || t.bg),
                      transition: "background 0.1s",
                    }}
                  >
                    {db.columns.map(col => (
                      <td
                        key={col.id}
                        onClick={() => { if (canEdit && !editingCell) setEditingCell({ rowId: row.id, colId: col.id }); }}
                        style={{
                          padding: "0 12px",
                          borderBottom: `1px solid ${t.border}`,
                          borderRight: `1px solid ${t.border}`,
                          overflow: editingCell?.rowId === row.id && editingCell.colId === col.id ? "visible" : "hidden",
                          position: "relative",
                          zIndex: editingCell?.rowId === row.id && editingCell.colId === col.id ? 20 : 1,
                          maxWidth: col.width ? col.width : COL_MIN,
                          cursor: canEdit ? "text" : "default",
                        }}
                      >
                        {editingCell?.rowId === row.id && editingCell.colId === col.id ? (
                          <CellEditor
                            col={col}
                            value={row.values[col.id] || ""}
                            users={users}
                            t={t}
                            onSave={v => handleCellSave(row.id, col.id, v)}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : (
                          <CellView
                            col={col}
                            value={row.values[col.id] || ""}
                            users={users}
                            t={t}
                            onEdit={() => setEditingCell({ rowId: row.id, colId: col.id })}
                          />
                        )}
                      </td>
                    ))}
                    <td style={{
                      padding: "0 4px",
                      borderBottom: `1px solid ${t.border}`,
                      textAlign: "center",
                    }}>
                      {canEdit && (confirmDeleteRowId === row.id ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <button
                            onClick={() => { onDeleteRow(row.id); setConfirmDeleteRowId(null); }}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: t.red, fontSize: 10, padding: "1px 3px", borderRadius: 3 }}
                          >✓</button>
                          <button
                            onClick={() => setConfirmDeleteRowId(null)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, fontSize: 10, padding: "1px 3px", borderRadius: 3 }}
                          >✕</button>
                        </span>
                      ) : hoveredRow === row.id && (
                        <button
                          onClick={() => setConfirmDeleteRowId(row.id)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, padding: 2, borderRadius: 3, display: "inline-flex", alignItems: "center" }}
                          data-tooltip="Delete row"
                        >
                          <Trash2 size={11} />
                        </button>
                      ))}
                    </td>
                  </tr>
                ))
              )}
              {/* Add row button as a table row — editors only */}
              {canEdit && (
                <tr>
                  <td
                    colSpan={db.columns.length + 1}
                    onClick={onAddRow}
                    style={{
                      padding: "7px 12px",
                      color: t.textDim,
                      fontSize: 12,
                      cursor: "pointer",
                      borderTop: `1px solid ${t.border}`,
                      userSelect: "none",
                      fontFamily: "var(--font-dm-mono), monospace",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = t.accent; (e.currentTarget as HTMLElement).style.background = t.accent + "08"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textDim; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    + new row
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAddCol && (
        <AddColumnModal
          t={t}
          onAdd={col => onAddColumn(col)}
          onClose={() => setShowAddCol(false)}
        />
      )}
    </div>
  );
}

export default function DatabasesView({ currentWorkspaceId, openDbName }: Props) {
  const {
    t, users, databases,
    createDatabase, updateDatabase, deleteDatabase,
    addDbRow, updateDbRow, deleteDbRow, addDbColumn,
    currentUser, workspaces,
  } = useModel();

  const [selectedDbId, setSelectedDbId] = useState<number | null>(null);
  // Persist the open database in the URL (?db=<id>) so a reload keeps you in the
  // same table instead of dropping back to the full list. Restore on mount
  // (client-only to avoid a hydration mismatch); mirror every change to the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dbParam = new URLSearchParams(window.location.search).get("db");
    if (dbParam) {
      const id = Number(dbParam);
      if (!Number.isNaN(id)) setSelectedDbId(id);
    }
  }, []);
  const selectDb = useCallback((id: number | null) => {
    setSelectedDbId(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (id === null) url.searchParams.delete("db");
    else url.searchParams.set("db", String(id));
    window.history.replaceState(null, "", url.toString());
  }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [confirmDeleteDbId, setConfirmDeleteDbId] = useState<number | null>(null);
  const isMobile = useIsMobile(720);

  const wsId = currentWorkspaceId ?? "war-room";

  // Workspace databases are collaborative: every workspace member can add rows
  // and edit cells/columns. Root admins retain access everywhere.
  const currentWorkspace = workspaces.find(w => w.id === wsId);
  const canEdit = !!currentUser && (
    ADMIN_IDS.includes(currentUser) ||
    currentWorkspace?.members.includes(currentUser) === true ||
    currentWorkspace?.captains.includes(currentUser) === true
  );
  const wsDbs = databases.filter(db => db.workspaceId === wsId);
  const selectedDb = wsDbs.find(db => db.id === selectedDbId) || null;

  // Auto-open a specific DB by name when navigating from a dedicated nav tab
  useEffect(() => {
    if (!openDbName || selectedDbId !== null || wsDbs.length === 0) return;
    const target = wsDbs.find(db => db.name.toLowerCase() === openDbName.toLowerCase());
    if (target) selectDb(target.id);
  }, [openDbName, wsDbs, selectedDbId, selectDb]);

  const handleCreate = useCallback((name: string, icon: string) => {
    createDatabase(wsId, name, icon);
  }, [createDatabase, wsId]);

  const handleUpdateDb = useCallback((id: number, patch: Partial<Pick<WorkspaceDb, "name" | "icon" | "columns" | "rows" | "views">>) => {
    updateDatabase(id, patch);
  }, [updateDatabase]);

  if (selectedDb) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100%", background: t.bg,
      }}>
        {/* Back nav */}
        <div style={{
          display: "flex", alignItems: isMobile ? "stretch" : "center", gap: 8,
          flexDirection: isMobile ? "column" : "row",
          padding: isMobile ? "8px 10px" : "8px 16px", borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
        }}>
          <button
            onClick={() => selectDb(null)}
            style={{
              background: "transparent", border: "none",
              color: t.textMuted, cursor: "pointer", fontSize: 11,
              padding: "3px 6px", borderRadius: 4,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            ← databases
          </button>
          <span style={{ color: t.border }}>›</span>
          <span style={{ fontSize: 12, color: t.text }}>
            {selectedDb.icon} {selectedDb.name}
          </span>
          <div style={{ flex: 1 }} />
          {canEdit && (confirmDeleteDbId === selectedDb.id ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ color: t.textMuted }}>delete this database?</span>
              <button
                onClick={() => { deleteDatabase(selectedDb.id); selectDb(null); setConfirmDeleteDbId(null); }}
                style={{ background: t.red + "22", border: `1px solid ${t.red}44`, color: t.red, cursor: "pointer", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}
              >yes, delete</button>
              <button
                onClick={() => setConfirmDeleteDbId(null)}
                style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, cursor: "pointer", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}
              >cancel</button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDeleteDbId(selectedDb.id)}
              style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 11, padding: "3px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}
              data-tooltip="Delete database"
            >
              <Trash2 size={12} /> delete
            </button>
          ))}
        </div>

        <TableView
          db={selectedDb}
          t={t}
          users={users}
          canEdit={canEdit}
          onUpdateRow={(rowId, values) => updateDbRow(selectedDb.id, rowId, values)}
          onDeleteRow={rowId => deleteDbRow(selectedDb.id, rowId)}
          onAddRow={() => addDbRow(selectedDb.id)}
          onAddColumn={col => addDbColumn(selectedDb.id, col)}
          onUpdateDb={patch => handleUpdateDb(selectedDb.id, patch)}
          isMobile={isMobile}
        />
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", background: t.bg, padding: isMobile ? 10 : 24,
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 12 : 16,
        marginBottom: isMobile ? 16 : 24,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.text, display: "flex", alignItems: "center", gap: 8 }}>
            <Table2 size={20} style={{ color: t.accent }} />
            databases
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            {currentWorkspace && <span>{currentWorkspace.icon} {currentWorkspace.name} ·</span>}
            {wsDbs.length} database{wsDbs.length !== 1 ? "s" : ""}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: t.accent, border: "none",
              borderRadius: 6, padding: "10px 16px", fontSize: 12,
              color: "#fff", cursor: "pointer", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: isMobile ? "100%" : undefined,
            }}
          >
            <Plus size={13} /> Create database
          </button>
        )}
      </div>

      {/* Database list */}
      {wsDbs.length === 0 ? (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: t.textDim, gap: 12,
        }}>
          <Table2 size={40} style={{ opacity: 0.2 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No databases yet</div>
          <div style={{ fontSize: 12 }}>{canEdit ? "Create a database to start tracking structured data." : "No databases have been created for this workspace yet."}</div>
          {canEdit && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                marginTop: 8, background: t.accent + "22",
                border: `1px solid ${t.accent}44`,
                borderRadius: 6, padding: "8px 16px", fontSize: 12,
                color: t.accent, cursor: "pointer", fontWeight: 600,
              }}
            >
              + Create database
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {wsDbs.map(db => (
            <div
              key={db.id}
              onClick={() => selectDb(db.id)}
              onMouseEnter={() => setHoveredItem(db.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                background: hoveredItem === db.id ? (t.bgHover || t.bgCard) : t.bgCard,
                border: `1px solid ${hoveredItem === db.id ? t.accent + "44" : t.border}`,
                borderRadius: 8, padding: 16, cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: hoveredItem === db.id ? t.shadow : "none",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{db.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>
                {db.name}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted }}>
                {db.columns.length} columns · {db.rows.length} rows
              </div>
              {db.columns.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {db.columns.slice(0, 4).map(col => (
                    <span
                      key={col.id}
                      style={{
                        fontSize: 9, padding: "1px 6px",
                        background: t.accent + "18",
                        color: t.accent,
                        borderRadius: 4,
                        border: `1px solid ${t.accent}28`,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontFamily: "var(--font-dm-mono), monospace",
                      }}
                    >
                      {col.type}
                    </span>
                  ))}
                  {db.columns.length > 4 && (
                    <span style={{ fontSize: 9, color: t.textDim }}>+{db.columns.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && showCreate && (
        <CreateDbModal
          t={t}
          workspaceId={wsId}
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
