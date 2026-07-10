import { useCallback } from "react";
import { ADMIN_IDS, type Workspace } from "@/lib/data";

export interface WorkspaceHandlersDeps {
  currentUser: string | null;
  workspaces: Workspace[];
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  markLocalWrite: (slice: string) => void;
  // Records an explicit removal so it propagates through the server's
  // keep-existing merge (workspaces union-merge; a removal needs a scoped delete).
  queueDelete: (slice: string, key: string | string[]) => void;
  logActivity: (type: string, target: string, detail: string, notifyTo?: string[]) => void;
  showToast: (msg: string, color: string, durationMs?: number, action?: { label: string; onClick: () => void }) => void;
  tAmber: string;
  tGreen: string;
  tRed: string;
}

export function useWorkspaceHandlers(deps: WorkspaceHandlersDeps) {
  const {
    currentUser,
    workspaces,
    setWorkspaces,
    markLocalWrite,
    queueDelete,
    logActivity,
    showToast,
    tAmber,
    tGreen,
    tRed,
  } = deps;

  const createWorkspace = useCallback((name: string, icon: string, colorKey: string) => {
    if (!currentUser) return;
    if (!ADMIN_IDS.includes(currentUser)) { showToast("// only root can create a workspace", tAmber); return; }
    const trimmed = name.trim();
    if (!trimmed) { showToast("// workspace needs a name", tAmber); return; }
    const id = `ws-${Date.now()}`;
    markLocalWrite("workspaces");
    setWorkspaces(prev => [...prev, { id, name: trimmed, icon: icon || "🏴", colorKey: colorKey || "purple", members: [currentUser], captains: [currentUser], pipelineIds: [] }]);
    showToast(`// workspace "${trimmed}" created`, tGreen);
    logActivity("claim", id, `created workspace ${trimmed}`);
  }, [currentUser, markLocalWrite, setWorkspaces, showToast, logActivity, tAmber, tGreen]);

  const addMemberToWorkspace = useCallback((workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ADMIN_IDS.includes(currentUser)) { showToast("// only an operator can manage members", tAmber); return; }
    if (ws.members.includes(userId)) return;
    markLocalWrite("workspaces");
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, members: [...w.members, userId] } : w));
  }, [currentUser, workspaces, setWorkspaces, markLocalWrite, showToast, tAmber]);

  const removeMemberFromWorkspace = useCallback((workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ADMIN_IDS.includes(currentUser)) { showToast("// only an operator can manage members", tAmber); return; }
    if (ws.captains.length === 1 && ws.captains[0] === userId) { showToast("// can't remove the only operator", tRed); return; }
    markLocalWrite("workspaces");
    queueDelete("workspaces", [`${workspaceId}::members::${userId}`, `${workspaceId}::captains::${userId}`, `${workspaceId}::firstMates::${userId}`]);
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, members: w.members.filter(id => id !== userId), captains: w.captains.filter(id => id !== userId) } : w));
  }, [currentUser, workspaces, setWorkspaces, markLocalWrite, queueDelete, showToast, tAmber, tRed]);

  const setMemberRank = useCallback((workspaceId: string, userId: string, rank: "operator" | "agent") => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ADMIN_IDS.includes(currentUser)) { showToast("// only an operator can change ranks", tAmber); return; }
    if (ws.captains.length === 1 && ws.captains[0] === userId && rank !== "operator") { showToast("// can't demote the only operator", tRed); return; }
    markLocalWrite("workspaces");
    // Demotion removes the user from captains — propagate that removal explicitly.
    if (rank !== "operator") queueDelete("workspaces", `${workspaceId}::captains::${userId}`);
    setWorkspaces(prev => prev.map(w => {
      if (w.id !== workspaceId) return w;
      const captains = w.captains.filter(id => id !== userId);
      if (rank === "operator") captains.push(userId);
      return { ...w, captains, members: w.members.includes(userId) ? w.members : [...w.members, userId] };
    }));
  }, [currentUser, workspaces, setWorkspaces, markLocalWrite, queueDelete, showToast, tAmber, tRed]);

  const deleteWorkspace = useCallback((workspaceId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ADMIN_IDS.includes(currentUser)) { showToast("// only root can delete a workspace", tAmber); return; }
    if (workspaces.length === 1) { showToast("// can't delete your last workspace", tRed); return; }
    markLocalWrite("workspaces");
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    showToast(`// workspace "${ws.name}" deleted`, tAmber);
  }, [currentUser, workspaces, setWorkspaces, markLocalWrite, showToast, tAmber, tRed]);

  return { createWorkspace, addMemberToWorkspace, removeMemberFromWorkspace, setMemberRank, deleteWorkspace };
}
