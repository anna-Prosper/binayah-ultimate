"use client";

import ChatView from "@/components/views/ChatView";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function ChatPage() {
  const isMobile = useIsMobile(768);
  const { showToast, currentWorkspaceId } = useAppShell();
  // On mobile the BottomSheet from AppShell handles team chat; the route
  // doesn't need to render a full panel here. Match the legacy behavior
  // where mobile + activeNavItem === "chat" was effectively a no-op page.
  if (isMobile) return null;
  // Fills the AppShell's content area exactly. The shell switches to a fixed
  // 100vh / overflow:hidden layout when activeNavItem === "chat" so the chat
  // panel can flex-grow into available space and the message list scrolls
  // independently of the page (no body-level scroll).
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ChatView showToast={showToast} currentWorkspaceId={currentWorkspaceId} fullScreen defaultTab="team" />
    </div>
  );
}
