"use client";

import { createContext, useContext } from "react";

/**
 * AppShellContext — shell-level UI state shared by route pages.
 *
 * The (app)/layout.tsx mounts AppShell, which provides this context.
 * Each route page (src/app/(app)/<section>/page.tsx) consumes whatever
 * slice it needs to render its view component. Keeps view components
 * unaware of routing; pages translate context → view props.
 */
export interface AppShellContextValue {
  showToast: (
    msg: string,
    color: string,
    durationMs?: number,
    action?: { label: string; onClick: () => void }
  ) => void;
  currentWorkspaceId: string;
  setCurrentWorkspaceId: (v: string) => void;

  // user popups / avatar picker
  viewingUser: string | null;
  setViewingUser: (v: string | null) => void;
  selUser: string | null;
  setSelUser: (v: string | null) => void;
  selAvatar: string | null;
  setSelAvatar: (v: string | null) => void;
  setShowAvatarPicker: (v: boolean) => void;

  // activity drawer (used by HomeView navbar slot)
  showActivity: boolean;
  setShowActivity: (v: boolean) => void;
  setLastSeenActivity: (v: number) => void;
  unseen: number;

  // theme picker (used by HomeView navbar slot)
  showThemePicker: boolean;
  setShowThemePicker: (v: boolean) => void;
  themeId: string;
  setThemeId: (v: string) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;

  // claim-with-animation (used by HomeView)
  handleClaimWithAnim: (sid: string) => void;

  // documents palette deep-link
  paletteDocId: string | null;

  // DM
  openDm: (userId: string) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({
  value,
  children,
}: {
  value: AppShellContextValue;
  children: React.ReactNode;
}) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellContextValue {
  const v = useContext(AppShellContext);
  if (!v) throw new Error("useAppShell must be used inside AppShellProvider");
  return v;
}
