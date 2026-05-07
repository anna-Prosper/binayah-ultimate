import { useCallback } from "react";
import { NOTIF_DISMISS_MS } from "@/lib/constants";
import { pushMessage, type ChatAttachment } from "@/lib/apiSync";
import { type UserType } from "@/lib/data";
import { type ChatMsg } from "@/components/ChatPanel";

export interface ChatHandlersDeps {
  currentUser: string | null;
  currentWorkspaceId: string;
  users: UserType[];
  chatMessages: ChatMsg[];
  hasMoreMessages: boolean;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
  setHasMoreMessages: React.Dispatch<React.SetStateAction<boolean>>;
  setChatNotif: React.Dispatch<React.SetStateAction<{ name: string; text: string; isComment?: boolean; stage?: string; isReaction?: boolean; isClaim?: boolean } | null>>;
  setSyncStatus: (status: string) => void;
  playNotifSound: () => void;
  showToast: (msg: string, color: string, durationMs?: number, action?: { label: string; onClick: () => void }) => void;
  tRed: string;
}

export function useChatHandlers(deps: ChatHandlersDeps) {
  const {
    currentUser,
    currentWorkspaceId,
    users,
    chatMessages,
    hasMoreMessages,
    setChatMessages,
    setHasMoreMessages,
    setChatNotif,
    setSyncStatus,
    playNotifSound,
    showToast,
    tRed,
  } = deps;

  const sendChat = useCallback((text: string, opts?: { threadId?: string; attachments?: ChatAttachment[] }) => {
    if (!currentUser) return;
    const msgId = Date.now();
    const msg: ChatMsg = {
      id: msgId,
      userId: currentUser,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      workspaceId: currentWorkspaceId,
      threadId: opts?.threadId || "team",
      attachments: opts?.attachments || [],
    };
    setChatMessages(prev => [...prev, msg]);
    pushMessage(msg).then(result => {
      if (!result.ok) {
        setChatMessages(prev => prev.filter(m => m.id !== msgId));
        setSyncStatus("offline");
        const reason = result.error ? `// ${result.error}` : "// message lost — try again";
        showToast(reason, tRed);
      }
    });
  }, [currentUser, currentWorkspaceId, setChatMessages, setSyncStatus, showToast, tRed]);

  const handleRemoteMessage = useCallback((msg: ChatMsg) => {
    let pendingNotif: { name: string; text: string } | null = null;
    setChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      if (msg.userId !== currentUser) {
        const sender = users.find(u => u.id === msg.userId);
        pendingNotif = { name: sender?.name || msg.userId, text: msg.text };
      }
      return [...prev, msg].sort((a, b) => a.id - b.id);
    });
    if (pendingNotif) { setChatNotif(pendingNotif); playNotifSound(); setTimeout(() => setChatNotif(null), NOTIF_DISMISS_MS); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || chatMessages.length === 0) return;
    const oldest = chatMessages[0];
    try {
      const wsParam = currentWorkspaceId ? `&workspaceId=${encodeURIComponent(currentWorkspaceId)}` : "";
      const threadParam = oldest.threadId ? `&threadId=${encodeURIComponent(oldest.threadId)}` : "";
      const res = await fetch(`/api/pipeline-state/messages?before=${oldest.id}&limit=50${wsParam}${threadParam}`);
      const older: ChatMsg[] = await res.json();
      if (!Array.isArray(older) || older.length === 0) { setHasMoreMessages(false); return; }
      setChatMessages(prev => [...older, ...prev]);
      if (older.length < 50) setHasMoreMessages(false);
    } catch { /* ignore */ }
  }, [hasMoreMessages, chatMessages, currentWorkspaceId, setChatMessages, setHasMoreMessages]);

  return { sendChat, handleRemoteMessage, loadMoreMessages };
}
