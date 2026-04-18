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
  pipeDescOverrides?: Record<string, string>;
  pipeMetaOverrides?: Record<string, { name?: string; priority?: string }>;
  customStages?: Record<string, string[]>;
  customPipelines?: unknown[];
  users?: unknown[];
  updatedAt?: number;
};

export async function fetchState(): Promise<SharedState | null> {
  try {
    const res = await fetch(API_BASE, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Bulk write for non-array state (claims, reactions, overrides, etc.)
// chatMessages, comments, and activityLog are excluded — they use atomic appends
export async function patchState(patch: Partial<SharedState>): Promise<void> {
  try {
    await fetch(API_BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
    });
  } catch { /* localStorage fallback */ }
}

// Atomically append a single chat message (never clobbers other messages)
export async function pushMessage(msg: { id: number; userId: string; text: string; time: string }): Promise<void> {
  try {
    await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
  } catch { /* localStorage fallback */ }
}

// Atomically append a comment to a stage
export async function pushComment(stage: string, comment: { id: number; text: string; by: string; time: string }): Promise<void> {
  try {
    await fetch(`${API_BASE}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, comment }),
    });
  } catch { /* localStorage fallback */ }
}

// Atomically prepend an activity entry
export async function pushActivity(entry: { type: string; user: string; target: string; detail: string; time: number }): Promise<void> {
  try {
    await fetch(`${API_BASE}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch { /* localStorage fallback */ }
}
