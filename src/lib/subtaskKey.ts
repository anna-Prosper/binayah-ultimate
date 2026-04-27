// The wire format :: stays as-is in MongoDB and localStorage.
// This module only types the client-side make/parse operations.

export type SubtaskKey = string & { readonly __brand: "SubtaskKey" };

export const SubtaskKey = {
  make(parentStageId: string, subtaskId: number): SubtaskKey {
    return `${parentStageId}::${subtaskId}` as SubtaskKey;
  },
  parse(key: SubtaskKey): { parentStageId: string; subtaskId: number } | null {
    const idx = key.lastIndexOf("::");
    if (idx === -1) return null;
    const id = parseInt(key.slice(idx + 2), 10);
    if (isNaN(id)) return null;
    return { parentStageId: key.slice(0, idx), subtaskId: id };
  },
  isValid(key: string): key is SubtaskKey {
    return key.includes("::") && !isNaN(parseInt(key.split("::").pop() || "", 10));
  },
};
