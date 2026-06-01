"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, FileText, Activity, MessageSquare, Phone, Settings, StickyNote, Bug, Archive, Table2, ListTodo, Link2, CalendarDays } from "lucide-react";
import { T } from "@/lib/themes";

export type NavItem = "home" | "my-tasks" | "timeline" | "links" | "now" | "pipelines" | "documents" | "notes" | "bugs" | "activity" | "chat" | "calls" | "archive" | "databases";

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
  callsLabel?: string;
}

interface Props {
  t: T;
  /**
   * Optional side-effect hook fired when a nav item is clicked.
   * Navigation itself happens via <Link>; this is for things like
   * "mark activity feed as seen" that should fire on click but
   * shouldn't prevent navigation.
   */
  onNavClick?: (item: NavItem) => void;
  // Workspace switcher
  workspaces: SidebarWorkspace[];
  currentWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
  canCreateWorkspace: boolean;
  onCreateWorkspace: () => void;
  canManageCurrentWorkspace: boolean;
  onManageCurrentWorkspace: () => void;
  hiddenNavItems?: NavItem[];
}

// Map NavItem → URL. Single source of truth used by both the sidebar
// (to render Links) and AppShell (to derive activeNavItem from pathname).
export const NAV_HREFS: Record<NavItem, string> = {
  home: "/",
  "my-tasks": "/my-tasks",
  timeline: "/timeline",
  links: "/links",
  now: "/", // legacy/unused — falls back to home
  pipelines: "/pipelines",
  documents: "/documents",
  notes: "/notes",
  bugs: "/bugs",
  activity: "/activity",
  chat: "/chat",
  calls: "/calls",
  archive: "/archive",
  databases: "/databases",
};

export function navItemFromPathname(pathname: string): NavItem {
  if (!pathname || pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/my-tasks")) return "my-tasks";
  if (pathname.startsWith("/timeline")) return "timeline";
  if (pathname.startsWith("/links")) return "links";
  if (pathname.startsWith("/pipelines")) return "pipelines";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/notes")) return "notes";
  if (pathname.startsWith("/bugs")) return "bugs";
  if (pathname.startsWith("/activity")) return "activity";
  if (pathname.startsWith("/archive")) return "archive";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/calls")) return "calls";
  if (pathname.startsWith("/databases")) return "databases";
  return "home";
}

// Home is rendered separately at the top
const WORKSPACE_NAV_ITEMS: { id: NavItem; label: string }[] = [
  { id: "pipelines",  label: "pipelines"  },
  { id: "documents",  label: "documents"  },
  { id: "notes",      label: "notes"      },
  { id: "bugs",       label: "testing"    },
  { id: "databases",  label: "databases"  },
  { id: "activity",   label: "activity"   },
  { id: "timeline",   label: "timeline"   },
  { id: "archive",    label: "archive"    },
  { id: "chat",       label: "chat"       },
  { id: "calls",      label: "calls"      },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  home: <Home size={15} strokeWidth={1.8} />,
  "my-tasks": <ListTodo size={15} strokeWidth={1.8} />,
  timeline: <CalendarDays size={15} strokeWidth={1.8} />,
  links: <Link2 size={15} strokeWidth={1.8} />,
  pipelines: <Zap size={15} strokeWidth={1.8} />,
  documents: <FileText size={15} strokeWidth={1.8} />,
  notes: <StickyNote size={15} strokeWidth={1.8} />,
  bugs: <Bug size={15} strokeWidth={1.8} />,
  databases: <Table2 size={15} strokeWidth={1.8} />,
  activity: <Activity size={15} strokeWidth={1.8} />,
  archive: <Archive size={15} strokeWidth={1.8} />,
  chat: <MessageSquare size={15} strokeWidth={1.8} />,
  calls: <Phone size={15} strokeWidth={1.8} />,
};

export default function LeftSidebar({
  t,
  onNavClick,
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  canCreateWorkspace,
  onCreateWorkspace,
  canManageCurrentWorkspace,
  onManageCurrentWorkspace,
  hiddenNavItems = [],
}: Props) {
  const pathname = usePathname() || "/";
  const activeNav = navItemFromPathname(pathname);

  const [wsOpen, setWsOpen] = useState(false);
  const wsDropdownRef = useRef<HTMLDivElement>(null);
  // Click-outside + Escape closes workspace dropdown
  useEffect(() => {
    if (!wsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) setWsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setWsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [wsOpen]);
  const current = workspaces.find(w => w.id === currentWorkspaceId);

  const renderNavItem = (item: { id: NavItem; label: string }) => {
    const isActive = activeNav === item.id;
    return (
      <Link
        key={item.id}
        href={NAV_HREFS[item.id]}
        onClick={() => { onNavClick?.(item.id); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          marginLeft: isActive ? 4 : 0,
          paddingLeft: isActive ? 8 : 12,
          background: isActive ? t.accent + "22" : "transparent",
          border: "none",
          borderLeft: isActive ? `3px solid ${t.accent}` : "3px solid transparent",
          cursor: "pointer",
          color: isActive ? t.accent : t.textMuted,
          fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          fontFamily: "var(--font-dm-mono, monospace)",
          letterSpacing: 0.5,
          textAlign: "left",
          transition: "all 0.15s",
          borderRadius: 6,
          textDecoration: "none",
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
        <span>{item.id === "calls" && current?.callsLabel ? current.callsLabel : item.label}</span>
      </Link>
    );
  };

  return (
    <div style={{
      width: 220,
      height: "100vh",
      minHeight: "100vh",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      background: t.bgSoft,
      borderRight: `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Home nav — workspace-independent */}
      <nav style={{ padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
        {renderNavItem({ id: "home", label: "home" })}
        {renderNavItem({ id: "my-tasks", label: "my tasks" })}
      </nav>

      {/* Workspace switcher */}
      <div ref={wsDropdownRef} style={{ padding: "8px 8px 8px", borderBottom: `1px solid ${t.border}`, position: "relative" }}>
        <button
          onClick={() => setWsOpen(v => !v)}
          style={{ width: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: t.text, fontFamily: "var(--font-dm-sans, sans-serif)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, textAlign: "left" }}
        >
          <span style={{ fontSize: 15 }}>{current?.icon || "🏴‍☠️"}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.name || "No workspace"}</span>
          <span style={{ fontSize: 11, color: t.textDim }}>▾</span>
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
                  <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono, monospace)" }}>{w.memberCount}</span>
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

      {/* Workspace-scoped nav items — only when user belongs to at least one workspace */}
      {workspaces.length > 0 ? (
        <nav style={{ padding: "8px 0 14px", display: "flex", flexDirection: "column", gap: 0, flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
          {WORKSPACE_NAV_ITEMS.filter(item => !hiddenNavItems.includes(item.id)).map(item => renderNavItem(item))}
        </nav>
      ) : (
        <div style={{ padding: "16px 12px", fontSize: 12, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", lineHeight: 1.6, flex: "1 1 auto" }}>
          // no workspace yet.<br />ask an admin to add you.
        </div>
      )}

      <nav style={{ padding: "8px 0", borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        {renderNavItem({ id: "links", label: "useful links" })}
      </nav>

    </div>
  );
}
