export const DEFAULT_PARENT_DISPLAY_LABEL = "default";

export function isDefaultParentLabel(value?: string | null): boolean {
  const label = (value || "").trim().toLowerCase();
  return label.startsWith("default-parent-") || label === "hidden default parent";
}

export function displayStageLabel(value?: string | null): string {
  if (!value) return "";
  return isDefaultParentLabel(value) ? DEFAULT_PARENT_DISPLAY_LABEL : value;
}

export function displayStageName(stageId: string, overrides?: Record<string, string>): string {
  return displayStageLabel(overrides?.[stageId] || stageId);
}
