const API_BASE = "/api/pipeline-state";

export type SharedState = {
  claims?: Record<string, string[]>;
  reactions?: Record<string, Record<string, string[]>>;
  chatMessages?: { id: number; userId: string; text: string; time: string }[];
  activityLog?: { type: string; user: string; target: string; detail: string; time: number }[];
  subtasks?: Record<string, { id: number; text: string; done: boolean; by: string }[]>;
  comments?: Record<string, { id: number; text: string; by: string; time: string }[]>;
  stageStatusOverrides?: Record<string, string>;
  stageDescOverrides?: Record<string, string>;
  stageNameOverrides?: Record<string, string>;
  subtaskStages?: Record<string, string>;
  pipeDescOverrides?: Record<string, string>;
  pipeMetaOverrides?: Record<string, { name?: string; priority?: string }>;
  customStages?: Record<string, string[]>;
  customPipelines?: unknown[];
  // lockedPipelines removed in v3 — lock system dropped
  users?: unknown[];
  workspaces?: unknown[];
  archivedStages?: string[];
  archivedPipelines?: string[];
  archivedSubtasks?: string[];
  updatedAt?: number;
};

export type SyncResult = { ok: true } | { ok: false; error: string; status?: number };

export async function fetchState(since?: number): Promise<SharedState | null> {
  try {
    const url = since !== undefined ? `${API_BASE}?since=${since}` : API_BASE;
    const res = await fetch(url, { cache: "no-store" });
    // 304 = client is already up-to-date; return null to signal no update
    if (res.status === 304) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Bulk write for non-array state (claims, reactions, overrides, etc.)
// chatMessages, comments, and activityLog are excluded — they use atomic appends
export async function patchState(patch: Partial<SharedState>): Promise<SyncResult> {
  try {
    const res = await fetch(API_BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}`, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "network error" };
  }
}

// Atomically append a single chat message (never clobbers other messages)
export async function pushMessage(msg: { id: number; userId: string; text: string; time: string }): Promise<SyncResult> {
  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "network error" };
  }
}

// Atomically append a comment to a stage
export async function pushComment(stage: string, comment: { id: number; text: string; by: string; time: string }): Promise<SyncResult> {
  try {
    const res = await fetch(`${API_BASE}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, comment }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}`, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "network error" };
  }
}

// Atomically prepend an activity entry
export async function pushActivity(entry: { type: string; user: string; target: string; detail: string; time: number }): Promise<SyncResult> {
  try {
    const res = await fetch(`${API_BASE}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "network error" };
  }
}
