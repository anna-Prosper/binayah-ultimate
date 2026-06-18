export function cleanHumanText(input?: string | null): string {
  return (input || "")
    .replace(/::\d+/g, "")
    .replace(/\b(?:stage|subtask|task|pipeline)\s*[:#]?\s*([A-Za-z][\w -]*?)::\d+\b/gi, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactSubject(input: string, max = 92): string {
  const text = cleanHumanText(input);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function line(label: string, value?: string | null): string {
  const cleanValue = cleanHumanText(value);
  return cleanValue ? `${label}: ${cleanValue}` : "";
}

export function quoteText(input?: string | null, max = 500): string {
  const text = cleanHumanText(input);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

export function humanList(parts: Array<string | undefined | null>): string {
  return parts.map(cleanHumanText).filter(Boolean).join(" · ");
}
