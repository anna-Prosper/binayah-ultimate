import { useCallback } from "react";
import { MAX_BODY_TEXT_LEN } from "@/lib/constants";
import {
  ADMIN_IDS,
  type UserType, type ExecProposal, type ReminderItem, type NoteItem,
  type BugItem, type BugAttachment, type BugSeverity, type BugStatus, type BugType,
} from "@/lib/data";
import { SubtaskKey } from "@/lib/subtaskKey";

// Cap on owners that can be set via the assign path (not self-claim).
const ASSIGN_CAP = 2;

export interface ContentHandlersDeps {
  currentUser: string | null;
  currentWorkspaceId: string;
  users: UserType[];
  execProposals: ExecProposal[];
  reminders: ReminderItem[];
  notes: NoteItem[];
  bugs: BugItem[];
  setExecProposals: React.Dispatch<React.SetStateAction<ExecProposal[]>>;
  setReminders: React.Dispatch<React.SetStateAction<ReminderItem[]>>;
  setNotes: React.Dispatch<React.SetStateAction<NoteItem[]>>;
  setBugs: React.Dispatch<React.SetStateAction<BugItem[]>>;
  setOwners: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setArchivedStages: React.Dispatch<React.SetStateAction<string[]>>;
  setArchivedSubtasks: React.Dispatch<React.SetStateAction<string[]>>;
  setStageNameOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setStageDescOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setStageDueDates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSubtasks: React.Dispatch<React.SetStateAction<Record<string, import("@/lib/data").SubtaskItem[]>>>;
  setSubtaskDescOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSubtaskDueDates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  markLocalWrite: (slice: string) => void;
  logActivity: (type: string, target: string, detail: string, notifyTo?: string[]) => void;
  showToast: (msg: string, color: string, durationMs?: number, action?: { label: string; onClick: () => void }) => void;
  tAmber: string;
  tGreen: string;
}

export function useContentHandlers(deps: ContentHandlersDeps) {
  const {
    currentUser,
    currentWorkspaceId,
    users,
    execProposals,
    setExecProposals,
    setReminders,
    setNotes,
    setBugs,
    setOwners,
    setArchivedStages,
    setArchivedSubtasks,
    setStageNameOverrides,
    setStageDescOverrides,
    setStageDueDates,
    setSubtasks,
    setSubtaskDescOverrides,
    setSubtaskDueDates,
    markLocalWrite,
    logActivity,
    showToast,
    tAmber,
    tGreen,
  } = deps;

  // Internal helper — not returned
  const applyExecProposalAction = useCallback((proposal: ExecProposal): boolean => {
    const target = proposal.target || "";
    const value = proposal.requestedValue ?? null;
    if (!target || proposal.kind === "strategy") return true;
    if (proposal.kind === "archive") {
      if (SubtaskKey.isValid(target)) {
        markLocalWrite("archivedSubtasks");
        setArchivedSubtasks(prev => prev.includes(target) ? prev : [...prev, target]);
      } else {
        markLocalWrite("archivedStages");
        setArchivedStages(prev => prev.includes(target) ? prev : [...prev, target]);
      }
      logActivity("archive", target, "approved archive request");
      return true;
    }
    if (proposal.kind === "assign") {
      const clearAssign = /^clear/i.test(proposal.requestedAction || "");
      const resolvedUserId = proposal.requestedUserId || (() => {
        const haystack = `${proposal.requestedAction || ""} ${proposal.body || ""}`.toLowerCase();
        return users.find(u =>
          haystack.includes(u.id.toLowerCase()) ||
          haystack.includes(u.name.toLowerCase()) ||
          haystack.includes(u.name.split(" ")[0].toLowerCase())
        )?.id || null;
      })();
      if (!resolvedUserId && !clearAssign) {
        showToast("// assign request is missing who to assign", tAmber);
        return false;
      }
      markLocalWrite("owners");
      setOwners(prev => {
        const next = { ...prev };
        if (!resolvedUserId) {
          delete next[target];
          return next;
        }
        const current = next[target] || [];
        next[target] = current.includes(resolvedUserId)
          ? current
          : [...current, resolvedUserId].slice(-ASSIGN_CAP);
        return next;
      });
      logActivity("assign", target, resolvedUserId ? `approved assignment to ${resolvedUserId}` : "approved unassign");
      return true;
    }
    if (proposal.kind === "edit") {
      if (proposal.requestedAction === "rename task" && value) {
        markLocalWrite("stageNameOverrides");
        setStageNameOverrides(prev => ({ ...prev, [target]: value }));
      } else if (proposal.requestedAction === "edit task description") {
        markLocalWrite("stageDescOverrides");
        setStageDescOverrides(prev => ({ ...prev, [target]: value || "" }));
      } else if (proposal.requestedAction === "set due date") {
        markLocalWrite("stageDueDates");
        setStageDueDates(prev => {
          const next = { ...prev };
          if (!value) delete next[target]; else next[target] = value;
          return next;
        });
      } else if (proposal.requestedAction === "rename subtask" && value) {
        const parsed = SubtaskKey.parse(target as Parameters<typeof SubtaskKey.parse>[0]);
        if (parsed) {
          markLocalWrite("subtasks");
          setSubtasks(prev => ({
            ...prev,
            [parsed.parentStageId]: (prev[parsed.parentStageId] || []).map(s => s.id === parsed.subtaskId ? { ...s, text: value } : s),
          }));
        }
      } else if (proposal.requestedAction === "edit subtask description") {
        markLocalWrite("subtaskDescOverrides");
        setSubtaskDescOverrides(prev => ({ ...prev, [target]: value || "" }));
      } else if (proposal.requestedAction === "set subtask due date") {
        markLocalWrite("subtaskDueDates");
        setSubtaskDueDates(prev => {
          const next = { ...prev };
          if (!value) delete next[target]; else next[target] = value;
          return next;
        });
      }
      logActivity("edit", target, `approved ${proposal.requestedAction || "edit request"}`);
      return true;
    }
    return true;
  }, [
    users, markLocalWrite, logActivity, showToast, tAmber,
    setArchivedStages, setArchivedSubtasks, setOwners,
    setStageNameOverrides, setStageDescOverrides, setStageDueDates,
    setSubtasks, setSubtaskDescOverrides, setSubtaskDueDates,
  ]);

  const addExecProposal = useCallback((title: string, body: string) => {
    if (!currentUser) return;
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody) {
      showToast("// proposal needs a title and detail", tAmber);
      return;
    }
    markLocalWrite("execProposals");
    const proposal: ExecProposal = {
      id: Date.now(),
      title: cleanTitle.slice(0, 120),
      body: cleanBody.slice(0, 1200),
      by: currentUser,
      status: "pending",
      createdAt: Date.now(),
      kind: "strategy",
    };
    setExecProposals(prev => [proposal, ...prev].slice(0, 80));
    logActivity("proposal", proposal.title, "submitted executive request");
    showToast("// proposal sent to Anna", tGreen);
  }, [currentUser, markLocalWrite, setExecProposals, logActivity, showToast, tAmber, tGreen]);

  const addReminder = useCallback((input: { title: string; body: string; recipientIds: string[]; remindAt: string }) => {
    if (!currentUser) return;
    const title = input.title.trim();
    const body = input.body.trim();
    const recipients = Array.from(new Set(input.recipientIds.filter(Boolean)));
    const due = Date.parse(input.remindAt);
    if (!title || recipients.length === 0 || !Number.isFinite(due)) {
      showToast("// reminder needs title, date, and recipient", tAmber);
      return;
    }
    const reminder: ReminderItem = {
      id: Date.now(),
      title: title.slice(0, 140),
      body: body.slice(0, 1000),
      createdBy: currentUser,
      recipientIds: recipients,
      remindAt: new Date(due).toISOString(),
      createdAt: Date.now(),
      emailedTo: [],
      dismissedBy: [],
    };
    markLocalWrite("reminders");
    setReminders(prev => [reminder, ...prev].slice(0, 200));
    logActivity("reminder", reminder.title, `scheduled for ${new Date(reminder.remindAt).toLocaleString()}`, recipients);
    showToast("// reminder scheduled", tGreen);
  }, [currentUser, markLocalWrite, setReminders, logActivity, showToast, tAmber, tGreen]);

  const dismissReminder = useCallback((id: number) => {
    if (!currentUser) return;
    markLocalWrite("reminders");
    setReminders(prev => prev.map(r => r.id === id
      ? { ...r, dismissedBy: Array.from(new Set([...(r.dismissedBy || []), currentUser])) }
      : r
    ));
  }, [currentUser, markLocalWrite, setReminders]);

  const addNote = useCallback((input: { title: string; body: string; pinnedTo?: string; color?: string }) => {
    if (!currentUser) return;
    const title = input.title.trim() || "Untitled note";
    const body = input.body.trim();
    if (!body && !input.title.trim()) return;
    const now = Date.now();
    const note: NoteItem = {
      id: now,
      title: title.slice(0, 120),
      body: body.slice(0, MAX_BODY_TEXT_LEN),
      by: currentUser,
      createdAt: now,
      updatedAt: now,
      workspaceId: currentWorkspaceId,
      pinnedTo: input.pinnedTo?.trim() || undefined,
      color: input.color,
    };
    markLocalWrite("notes");
    setNotes(prev => [note, ...prev].slice(0, 300));
    logActivity("note", note.title, "created note");
  }, [currentUser, currentWorkspaceId, markLocalWrite, setNotes, logActivity]);

  const updateNote = useCallback((id: number, patch: Partial<Pick<NoteItem, "title" | "body" | "pinnedTo" | "color">>) => {
    if (!currentUser) return;
    markLocalWrite("notes");
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;
      if (note.by !== currentUser && !ADMIN_IDS.includes(currentUser)) return note;
      return {
        ...note,
        ...patch,
        title: patch.title !== undefined ? patch.title.slice(0, 120) : note.title,
        body: patch.body !== undefined ? patch.body.slice(0, MAX_BODY_TEXT_LEN) : note.body,
        pinnedTo: patch.pinnedTo !== undefined ? (patch.pinnedTo.trim() || undefined) : note.pinnedTo,
        updatedAt: Date.now(),
      };
    }));
  }, [currentUser, markLocalWrite, setNotes]);

  const deleteNote = useCallback((id: number) => {
    if (!currentUser) return;
    markLocalWrite("notes");
    setNotes(prev => prev.filter(note => note.id !== id || (note.by !== currentUser && !ADMIN_IDS.includes(currentUser))));
  }, [currentUser, markLocalWrite, setNotes]);

  const addBug = useCallback((input: { title: string; body?: string; steps?: string; expected?: string; actual?: string; type: BugType; severity: BugSeverity; status?: BugStatus; ownerId?: string; linkedTask?: string; attachments?: BugAttachment[] }) => {
    if (!currentUser) return;
    const title = input.title.trim();
    if (!title) {
      showToast("// bug/test needs a title", tAmber);
      return;
    }
    const now = Date.now();
    const bug: BugItem = {
      id: now,
      title: title.slice(0, 160),
      body: (input.body || "").trim().slice(0, 2000),
      steps: input.steps?.trim().slice(0, 2000) || undefined,
      expected: input.expected?.trim().slice(0, 1000) || undefined,
      actual: input.actual?.trim().slice(0, 1000) || undefined,
      type: input.type,
      severity: input.severity,
      status: input.status || "open",
      ownerId: input.ownerId || undefined,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
      workspaceId: currentWorkspaceId,
      linkedTask: input.linkedTask?.trim() || undefined,
      attachments: input.attachments && input.attachments.length > 0 ? input.attachments.slice(0, 8) : undefined,
    };
    markLocalWrite("bugs");
    setBugs(prev => [bug, ...prev].slice(0, 300));
    logActivity("bug", bug.title, `${bug.type} · ${bug.severity}`, bug.ownerId ? [bug.ownerId] : undefined);
    showToast("// tracker item added", tGreen);
  }, [currentUser, currentWorkspaceId, markLocalWrite, setBugs, logActivity, showToast, tAmber, tGreen]);

  const updateBug = useCallback((id: number, patch: Partial<Pick<BugItem, "title" | "body" | "steps" | "expected" | "actual" | "type" | "severity" | "status" | "ownerId" | "linkedTask">>) => {
    if (!currentUser) return;
    markLocalWrite("bugs");
    setBugs(prev => prev.map(item => {
      if (item.id !== id) return item;
      const canEdit = ADMIN_IDS.includes(currentUser) || item.createdBy === currentUser || item.ownerId === currentUser;
      if (!canEdit) return item;
      return {
        ...item,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim().slice(0, 160) || item.title : item.title,
        body: patch.body !== undefined ? patch.body.trim().slice(0, 2000) : item.body,
        steps: patch.steps !== undefined ? patch.steps.trim().slice(0, 2000) || undefined : item.steps,
        expected: patch.expected !== undefined ? patch.expected.trim().slice(0, 1000) || undefined : item.expected,
        actual: patch.actual !== undefined ? patch.actual.trim().slice(0, 1000) || undefined : item.actual,
        ownerId: patch.ownerId !== undefined ? patch.ownerId || undefined : item.ownerId,
        linkedTask: patch.linkedTask !== undefined ? patch.linkedTask.trim() || undefined : item.linkedTask,
        updatedAt: Date.now(),
      };
    }));
  }, [currentUser, markLocalWrite, setBugs]);

  const deleteBug = useCallback((id: number) => {
    if (!currentUser) return;
    markLocalWrite("bugs");
    setBugs(prev => prev.filter(item => item.id !== id || (item.createdBy !== currentUser && item.ownerId !== currentUser && !ADMIN_IDS.includes(currentUser))));
  }, [currentUser, markLocalWrite, setBugs]);

  const updateExecProposalStatus = useCallback((id: number, status: "reviewed" | "rejected" | "canceled") => {
    if (!currentUser || !ADMIN_IDS.includes(currentUser)) {
      showToast("// only Anna can close executive requests", tAmber);
      return;
    }
    const proposal = execProposals.find(p => p.id === id);
    if (proposal && status === "reviewed" && proposal.status === "pending" && !applyExecProposalAction(proposal)) return;
    markLocalWrite("execProposals");
    setExecProposals(prev => prev.map(p => p.id === id ? {
      ...p,
      status,
      reviewedAt: Date.now(),
      reviewedBy: currentUser,
    } : p));
  }, [currentUser, execProposals, applyExecProposalAction, markLocalWrite, setExecProposals, showToast, tAmber]);

  const applyExecProposal = useCallback((id: number) => {
    if (!currentUser || !ADMIN_IDS.includes(currentUser)) {
      showToast("// only Anna can apply requests", tAmber);
      return;
    }
    const proposal = execProposals.find(p => p.id === id);
    if (!proposal) return;
    if (applyExecProposalAction(proposal)) showToast("// request action applied", tGreen);
  }, [currentUser, execProposals, applyExecProposalAction, showToast, tAmber, tGreen]);

  const cancelExecProposal = useCallback((id: number) => {
    if (!currentUser) return;
    markLocalWrite("execProposals");
    setExecProposals(prev => prev.map(p => p.id === id && p.by === currentUser && p.status === "pending" ? {
      ...p,
      status: "canceled",
      reviewedAt: Date.now(),
      reviewedBy: currentUser,
    } : p));
  }, [currentUser, markLocalWrite, setExecProposals]);

  const deleteExecProposal = useCallback((id: number) => {
    if (!currentUser || !ADMIN_IDS.includes(currentUser)) {
      showToast("// only Anna can delete requests", tAmber);
      return;
    }
    markLocalWrite("execProposals");
    setExecProposals(prev => prev.filter(p => !(p.id === id && p.status !== "pending")));
  }, [currentUser, markLocalWrite, setExecProposals, showToast, tAmber]);

  return {
    addExecProposal,
    addReminder,
    dismissReminder,
    addNote,
    updateNote,
    deleteNote,
    addBug,
    updateBug,
    deleteBug,
    updateExecProposalStatus,
    applyExecProposal,
    cancelExecProposal,
    deleteExecProposal,
  };
}
