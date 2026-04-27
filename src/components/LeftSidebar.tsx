"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { Home, Zap, FileText, Activity, MessageSquare, Settings } from "lucide-react";

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

const NAV_ITEMS: { id: NavItem; label: string }[] = [
  { id: "home",      label: "home"      },
  { id: "pipelines", label: "pipelines" },
  { id: "documents", label: "documents" },
  { id: "activity",  label: "activity"  },
  { id: "chat",      label: "chat"      },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  home: <Home size={15} strokeWidth={1.8} />,
  pipelines: <Zap size={15} strokeWidth={1.8} />,
  documents: <FileText size={15} strokeWidth={1.8} />,
  activity: <Activity size={15} strokeWidth={1.8} />,
  chat: <MessageSquare size={15} strokeWidth={1.8} />,
};

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
      <div style={{ padding: "8px 8px 8px", borderBottom: `1px solid ${t.border}`, position: "relative" }}>
        <button
          onClick={() => setWsOpen(v => !v)}
          style={{ width: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: t.text, fontFamily: "var(--font-dm-sans, sans-serif)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, textAlign: "left" }}
        >
          <span style={{ fontSize: 15 }}>{current?.icon || "🏴‍☠️"}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.name || "No workspace"}</span>
          <span style={{ fontSize: 10, color: t.textDim }}>▾</span>
        </button>
        {wsOpen && (
          <div style={{ position: "absolute", left: 10, right: 10, top: "calc(100% - 2px)", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 50, overflow: "hidden" }}>
            {workspaces.map(w => {
              const isActive = w.id === currentWorkspaceId;
              return (
                <button
                  key={w.id}
                  onClick={() => { onWorkspaceChange(w.id); setWsOpen(false); }}
                  style={{ width: "100%", background: isActive ? t.accent + "18" : "transparent", border: "none", padding: "8px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: isActive ? t.accent : t.text, fontFamily: "var(--font-dm-sans, sans-serif)", fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: "left" }}
                >
                  <span style={{ fontSize: 15 }}>{w.icon}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                  <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono, monospace)" }}>{w.memberCount}</span>
                </button>
              );
            })}
            {canManageCurrentWorkspace && (
              <button
                onClick={() => { setWsOpen(false); onManageCurrentWorkspace(); }}
                style={{ width: "100%", background: "transparent", border: "none", borderTop: `1px solid ${t.border}`, padding: "8px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontFamily: "var(--font-dm-mono, monospace)", fontSize: 13, fontWeight: 700, textAlign: "left" }}
              >
                <Settings size={11} strokeWidth={2} style={{display:"inline",verticalAlign:"middle",marginRight:4}} /> manage workspace
              </button>
            )}
            {canCreateWorkspace && (
              <button
                onClick={() => { setWsOpen(false); onCreateWorkspace(); }}
                style={{ width: "100%", background: "transparent", border: "none", borderTop: `1px solid ${t.border}`, padding: "8px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: t.accent, fontFamily: "var(--font-dm-mono, monospace)", fontSize: 13, fontWeight: 700, textAlign: "left" }}
              >
                + new workspace
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 0 }}>
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
                padding: "8px 12px",
                background: isActive ? t.accent + "18" : "transparent",
                border: "none",
                cursor: "pointer",
                color: isActive ? t.accent : t.textMuted,
                fontSize: 13,
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
              <span style={{ display: "flex", alignItems: "center" }}>{NAV_ICONS[item.id]}</span>
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
          {pipelines.map(p => {
            const isActive = activePipelineId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onPipelineSelect(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "4px 12px",
                  background: isActive ? t.accent + "18" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: isActive ? t.accent : t.textSec,
                  fontSize: 13,
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
                <span style={{ fontSize: 15, flexShrink: 0 }}>{p.icon}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
