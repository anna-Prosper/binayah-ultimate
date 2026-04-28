import { type SubtaskItem } from "@/lib/data";

/** Default points for a subtask when no explicit points are set. */
export const DEFAULT_SUBTASK_POINTS = 5;

/**
 * Derive the "natural" points for a stage from its live subtasks.
 * - If there are live (non-archived) subtasks: sum of their points.
 * - If no live subtasks: fall back to stageDefaultPoints.
 */
export function deriveStagePoints(
  stageName: string,
  subtasks: SubtaskItem[] | undefined,
  archivedSubtaskKeys: Set<string>,
  stageDefaultPoints: number,
): number {
  const live = (subtasks || []).filter(
    s => !archivedSubtaskKeys.has(`${stageName}::${s.id}`)
  );
  if (live.length === 0) return stageDefaultPoints;
  return live.reduce((sum, s) => sum + (s.points ?? DEFAULT_SUBTASK_POINTS), 0);
}

/**
 * Derive the display points for a stage, respecting user overrides.
 * Override takes priority over the derived subtask sum.
 */
export function deriveStageDisplayPoints(
  stageName: string,
  subtasks: SubtaskItem[] | undefined,
  archivedSubtaskKeys: Set<string>,
  stageDefaultPoints: number,
  stagePointsOverride: Record<string, number>,
): number {
  if (stagePointsOverride[stageName] !== undefined) {
    return stagePointsOverride[stageName];
  }
  return deriveStagePoints(stageName, subtasks, archivedSubtaskKeys, stageDefaultPoints);
}

/**
 * Derive the total points for a pipeline by summing display points of all
 * non-archived stages.
 */
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
