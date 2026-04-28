import { type SubtaskItem } from "@/lib/data";

export const DEFAULT_SUBTASK_POINTS = 5;

/**
 * Subtask-ledger model:
 *   - Stage WITH live subtasks: sum of their points (pure ledger).
 *   - Stage WITHOUT live subtasks (a leaf): its own points, taken from
 *     stagePointsOverride[name] if set, else stageDefaultPoints.
 *
 * Subtasks dominate when present — there's no override-vs-sum ambiguity:
 * decomposing a stage replaces the leaf estimate with the real ledger.
 */
export function deriveStageDisplayPoints(
  stageName: string,
  subtasks: SubtaskItem[] | undefined,
  archivedSubtaskKeys: Set<string>,
  stageDefaultPoints: number,
  stagePointsOverride: Record<string, number>,
): number {
  const live = (subtasks || []).filter(
    s => !archivedSubtaskKeys.has(`${stageName}::${s.id}`)
  );
  if (live.length > 0) {
    return live.reduce((sum, s) => sum + (s.points ?? DEFAULT_SUBTASK_POINTS), 0);
  }
  // Leaf stage — use override (set by LLM on creation, or by user) or default
  if (stagePointsOverride[stageName] !== undefined) {
    return stagePointsOverride[stageName];
  }
  return stageDefaultPoints;
}

/** Back-compat alias — same logic without override (used for "natural" sum displays). */
export function deriveStagePoints(
  stageName: string,
  subtasks: SubtaskItem[] | undefined,
  archivedSubtaskKeys: Set<string>,
  stageDefaultPoints: number,
): number {
  return deriveStageDisplayPoints(stageName, subtasks, archivedSubtaskKeys, stageDefaultPoints, {});
}

/** Pipeline total = sum of stage display points across non-archived stages. */
export function derivePipelinePoints(
  stageNames: string[],
  archivedStages: string[],
  subtasks: Record<string, SubtaskItem[]>,
  archivedSubtaskKeys: Set<string>,
  stageDefaultPointsFn: (name: string) => number,
  stagePointsOverride: Record<string, number>,
): number {
  return stageNames
    .filter(s => !archivedStages.includes(s))
    .reduce((sum, s) => {
      return sum + deriveStageDisplayPoints(
        s,
        subtasks[s],
        archivedSubtaskKeys,
        stageDefaultPointsFn(s),
        stagePointsOverride,
      );
    }, 0);
}
