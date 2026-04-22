"use client";

import { T } from "@/lib/themes";

export type NavItem = "pipelines" | "documents" | "activity" | "chat";

export interface SidebarPipeline {
  id: string;
  name: string;
  icon: string;
}

interface Props {
  t: T;
  activeNav: NavItem;
  onNavChange: (item: NavItem) => void;
  // Pipeline sub-list (shown when pipelines active)
  pipelines: SidebarPipeline[];
  activePipelineId: string | null;
  onPipelineSelect: (id: string) => void;
}

const NAV_ITEMS: { id: NavItem; label: string; icon: string }[] = [
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
}: Props) {
  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      background: t.bgSoft,
      borderRight: `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
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
            pipelines
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
