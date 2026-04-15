const API_BASE = "https://binayah-api.onrender.com/api/pipeline-state";

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

export async function patchState(patch: Partial<SharedState>): Promise<void> {
  try {
    await fetch(API_BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
    });
  } catch {
    // silently fail — localStorage is the fallback
  }
}
