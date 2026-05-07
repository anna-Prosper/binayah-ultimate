import { T } from "@/lib/themes";
import { type ExecProposal, EXEC_IDS } from "@/lib/data";
import { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from "@/lib/constants";

type AttentionTone = "accent" | "green" | "amber" | "red" | "cyan";

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < MS_PER_MINUTE) return "just now";
  if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
  if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
  return `${Math.floor(diff / MS_PER_DAY)}d ago`;
}

export function timeAgoFrom(now: number, timestamp: number): string {
  const diff = now - timestamp;
  if (diff < MS_PER_MINUTE) return "just now";
  if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
  if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
  return `${Math.floor(diff / MS_PER_DAY)}d ago`;
}

export function formatEventTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const diffD = diffMs / MS_PER_DAY;
  if (diffD < 7) return d.toLocaleDateString("en-US", { weekday: "short" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function toneColor(t: T, tone: AttentionTone): string {
  if (tone === "green") return t.green;
  if (tone === "amber") return t.amber;
  if (tone === "red") return t.red;
  if (tone === "cyan") return t.cyan || t.accent;
  return t.accent;
}

export function isExecutiveProposal(p: ExecProposal) {
  return p.kind === "strategy" || EXEC_IDS.includes(p.by);
}
