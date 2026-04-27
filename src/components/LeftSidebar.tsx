"use client";

import { useState } from "react";
import { T } from "@/lib/themes";

export type NavItem = "home" | "now" | "pipelines" | "documents" | "activity" | "chat";

export interface SidebarPipeline {
  id: string;
  name: string;
  icon: string;
}

export interface SidebarWorkspace {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
}

interface Props {
  t: T;
  activeNav: NavItem;
  onNavChange: (item: NavItem) => void;
  pipelines: SidebarPipeline[];
  activePipelineId: string | null;
  onPipelineSelect: (id: string) => void;
  // Workspace switcher
  workspaces: SidebarWorkspace[];
  currentWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
  canCreateWorkspace: boolean;
  onCreateWorkspace: () => void;
  canManageCurrentWorkspace: boolean;
  onManageCurrentWorkspace: () => void;
}

const NAV_ITEMS: { id: NavItem; label: string; icon: string }[] = [
  { id: "home",      label: "home",      icon: "🏠" },
  { id: "pipelines", label: "pipelines", icon: "⚡" },
  { id: "documents", label: "documents", icon: "📄" },
  { id: "activity",  label: "activity",  icon: "🔔" },
  { id: "chat",      label: "chat",      icon: "💬" },
];

export default function LeftSidebar({
  t,
  activeNav,
  onNavChange,
  pipelines,
  activePipelineId,
  onPipelineSelect,
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  canCreateWorkspace,
  onCreateWorkspace,
  canManageCurrentWorkspace,
  onManageCurrentWorkspace,
}: Props) {
  const [wsOpen, setWsOpen] = useState(false);
  const current = workspaces.find(w => w.id === currentWorkspaceId);

  return (
    <div style={{
      width: 220,
      height: "100%",
      flexShrink: 0,
      background: t.bgSoft,
      borderRight: `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Workspace switcher */}
      <div style={{ padding: "10px 10px 8px", borderBottom: `1px solid ${t.border}`, position: "relative" }}>
        <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono, monospace)", fontWeight: 600, marginBottom: 4 }}>workspace</div>
        <button
          onClick={() => setWsOpen(v => !v)}
          style={{ width: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: t.text, fontFamily: "var(--font-dm-sans, sans-serif)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, textAlign: "left" }}
        >
          <span style={{ fontSize: 14 }}>{current?.icon || "🏴‍☠️"}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.name || "No workspace"}</span>
          <span style={{ fontSize: 8, color: t.textDim }}>▾</span>
        </button>
        {wsOpen && (
          <div style={{ position: "absolute", left: 10, right: 10, top: "calc(100% - 2px)", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 50, overflow: "hidden" }}>
            {workspaces.map(w => {
              const isActive = w.id === currentWorkspaceId;
              return (
                <button
                  key={w.id}
                  onClick={() => { onWorkspaceChange(w.id); setWsOpen(false); }}
                  style={{ width: "100%", background: isActive ? t.accent + "18" : "transparent", border: "none", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, color: isActive ? t.accent : t.text, fontFamily: "var(--font-dm-sans, sans-serif)", fontSize: 11, fontWeight: isActive ? 700 : 500, textAlign: "left" }}
                >
                  <span style={{ fontSize: 14 }}>{w.icon}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                  <span style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono, monospace)" }}>{w.memberCount}</span>
                </button>
              );
            })}
            {canManageCurrentWorkspace && (
              <button
                onClick={() => { setWsOpen(false); onManageCurrentWorkspace(); }}
                style={{ width: "100%", background: "transparent", border: "none", borderTop: `1px solid ${t.border}`, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, color: t.textMuted, fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, fontWeight: 700, textAlign: "left" }}
              >
                ⚙ manage workspace
              </button>
            )}
            {canCreateWorkspace && (
              <button
                onClick={() => { setWsOpen(false); onCreateWorkspace(); }}
                style={{ width: "100%", background: "transparent", border: "none", borderTop: `1px solid ${t.border}`, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, color: t.accent, fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, fontWeight: 700, textAlign: "left" }}
              >
                + new workspace
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: isActive ? t.accent + "22" : "transparent",
                border: "none",
                borderLeft: `3px solid ${isActive ? t.accent : "transparent"}`,
                cursor: "pointer",
                color: isActive ? t.accent : t.textMuted,
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "var(--font-dm-mono, monospace)",
                letterSpacing: 0.5,
                textAlign: "left",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = t.text;
                  (e.currentTarget as HTMLElement).style.background = t.bgHover;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = t.textMuted;
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pipeline sub-list — only when Pipelines is active */}
      {activeNav === "pipelines" && (
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 0",
          borderTop: `1px solid ${t.border}`,
        }}>
          <div style={{ padding: "6px 14px", fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono, monospace)", fontWeight: 600 }}>
            workspaces
          </div>
          {pipelines.map(p => {
            const isActive = activePipelineId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onPipelineSelect(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  width: "100%",
                  padding: "6px 14px",
                  background: isActive ? t.accent + "18" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? t.accent : "transparent"}`,
                  cursor: "pointer",
                  color: isActive ? t.accent : t.textSec,
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 400,
                  fontFamily: "var(--font-dm-sans, sans-serif)",
                  textAlign: "left",
                  transition: "all 0.15s",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = t.text;
                    (e.currentTarget as HTMLElement).style.background = t.bgHover;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = t.textSec;
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
