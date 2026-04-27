"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { T } from "@/lib/themes";
import { pipelineData, USERS_DEFAULT, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

// ── Module-scope document content cache ──────────────────────────────────────
interface DocWithContent {
  _id: string;
  title: string;
  pipelineId: string | null;
  plaintext: string;   // server-extracted from TipTap JSON
}

const docCache = {
  data: null as DocWithContent[] | null,
  fetchedAt: 0,
  TTL: 5 * 60 * 1000, // 5 minutes
  isStale(): boolean {
    return Date.now() - this.fetchedAt > this.TTL;
  },
  set(docs: DocWithContent[]) {
    this.data = docs;
    this.fetchedAt = Date.now();
  },
  invalidate() {
    this.fetchedAt = 0;
  },
};

// Exported so DocumentsPanel can call it after a successful save
export function invalidateDocCache() {
  docCache.invalidate();
}

// ── Search item types ─────────────────────────────────────────────────────────
type StageResult = {
  kind: "stage";
  stageName: string;
  pipelineId: string;
  pipelineName: string;
  pipelineIcon: string;
  matchIn: "name";
};

type DocResult = {
  kind: "doc";
  id: string;
  title: string;
  snippet: string;     // matched excerpt for context
  matchIn: "title" | "content";
};

type PersonResult = {
  kind: "person";
  user: UserType;
  matchIn: "name" | "role";
};

type SearchResult = StageResult | DocResult | PersonResult;

// ── Fuzzy match helper — highlights matched substring ─────────────────────────
function fuzzyMatch(haystack: string, needle: string): { matched: boolean; index: number; length: number } {
  if (!needle) return { matched: true, index: -1, length: 0 };
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  return { matched: idx >= 0, index: idx, length: needle.length };
}

function highlight(text: string, needle: string, accentColor: string): React.ReactNode {
  if (!needle) return text;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: accentColor, fontWeight: 700 }}>{text.slice(idx, idx + needle.length)}</span>
      {text.slice(idx + needle.length)}
    </>
  );
}

function snippetAround(text: string, needle: string, radius = 60): string {
  if (!needle) return text.slice(0, 120);
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, 120);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + needle.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, t }: { label: string; t: T }) {
  return (
    <div style={{
      padding: "6px 14px 4px",
      fontSize: 9,
      fontWeight: 700,
      color: t.textMuted,
      letterSpacing: 2,
      textTransform: "uppercase" as const,
      fontFamily: "var(--font-geist-mono, monospace)",
      borderBottom: `1px solid ${t.border}`,
      userSelect: "none" as const,
    }}>
      {label}
    </div>
  );
}

// ── Result row ─────────────────────────────────────────────────────────────────
function ResultRow({
  result,
  active,
  query,
  t,
  onClick,
}: {
  result: SearchResult;
  active: boolean;
  query: string;
  t: T;
  onClick: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 14px",
    cursor: "pointer",
    background: active ? t.accent + "16" : "transparent",
    borderLeft: `2px solid ${active ? t.accent : "transparent"}`,
    transition: "background 0.1s, border-color 0.1s",
  };

  if (result.kind === "stage") {
    return (
      <div ref={rowRef} style={base} onClick={onClick}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = t.bgHover; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>{result.pipelineIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
            {highlight(result.stageName, query, t.accent)}
          </div>
          <div style={{ fontSize: 9, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)", marginTop: 1 }}>
            {result.pipelineName}
          </div>
        </div>
        <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)", flexShrink: 0 }}>stage</span>
      </div>
    );
  }

  if (result.kind === "doc") {
    return (
      <div ref={rowRef} style={base} onClick={onClick}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = t.bgHover; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
            {highlight(result.title || "untitled", query, t.accent)}
          </div>
          {result.snippet && (
            <div style={{ fontSize: 9, color: t.textSec, marginTop: 2, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
              {highlight(result.snippet, query, t.accent)}
            </div>
          )}
        </div>
        <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)", flexShrink: 0 }}>doc</span>
      </div>
    );
  }

  // person
  return (
    <div ref={rowRef} style={base} onClick={onClick}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = t.bgHover; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <AvatarC user={result.user} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>
          {highlight(result.user.name, query, t.accent)}
        </div>
        <div style={{ fontSize: 9, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)", marginTop: 1 }}>
          {highlight(result.user.role, query, t.accent)}
        </div>
      </div>
      <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)", flexShrink: 0 }}>person</span>
    </div>
  );
}

// ── Skeleton pulse for loading docs ───────────────────────────────────────────
function DocSkeleton({ t }: { t: T }) {
  return (
    <div style={{ padding: "9px 14px", display: "flex", flexDirection: "column" as const, gap: 5 }}>
      {[70, 40, 55].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 11 : 8,
          width: `${w}%`,
          background: t.bgHover,
          borderRadius: 8,
          animation: "searchPulse 1.4s ease-in-out infinite",
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export interface SearchPaletteProps {
  t: T;
  open: boolean;
  onClose: () => void;
  /** Navigate to a stage: expand its pipeline and scroll to the stage */
  onOpenStage: (pipelineId: string, stageName: string) => void;
  /** Open a document in DocumentsPanel */
  onOpenDocument: (docId: string) => void;
  /** Highlight a person in the team bar */
  onOpenPerson: (userId: string) => void;
}

export default function SearchPalette({
  t, open, onClose, onOpenStage, onOpenDocument, onOpenPerson,
}: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsWithContent, setDocsWithContent] = useState<DocWithContent[] | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedRef = useRef(false);

  // ── Focus input when opened ─────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
      // Start docs fetch on first open (or if cache is stale)
      if (!hasFetchedRef.current || docCache.isStale()) {
        hasFetchedRef.current = true;
        if (docCache.data && !docCache.isStale()) {
          setDocsWithContent(docCache.data);
        } else {
          setDocsLoading(true);
          fetch("/api/documents?includeContent=true")
            .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
            .then((data: { docs: DocWithContent[] }) => {
              docCache.set(data.docs);
              setDocsWithContent(data.docs);
            })
            .catch(() => setDocsWithContent([]))
            .finally(() => setDocsLoading(false));
        }
      } else if (docCache.data) {
        setDocsWithContent(docCache.data);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Build all stage results (instant, in-memory) ───────────────────────────
  const allStageResults = useMemo<StageResult[]>(() => {
    return pipelineData.flatMap(p =>
      p.stages.map(stageName => ({
        kind: "stage" as const,
        stageName,
        pipelineId: p.id,
        pipelineName: p.name,
        pipelineIcon: p.icon,
        matchIn: "name" as const,
      }))
    );
  }, []);

  // ── Filter results based on query ─────────────────────────────────────────
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    const stageResults: StageResult[] = q
      ? allStageResults.filter(r => fuzzyMatch(r.stageName, q).matched)
      : allStageResults.slice(0, 5);

    const docResults: DocResult[] = (() => {
      if (!docsWithContent) return [];
      if (!q) return docsWithContent.slice(0, 4).map(d => ({
        kind: "doc" as const, id: d._id, title: d.title, snippet: "", matchIn: "title" as const,
      }));
      return docsWithContent
        .map(d => {
          const titleM = fuzzyMatch(d.title, q);
          const contentM = fuzzyMatch(d.plaintext, q);
          if (titleM.matched) return { kind: "doc" as const, id: d._id, title: d.title, snippet: "", matchIn: "title" as const };
          if (contentM.matched) return { kind: "doc" as const, id: d._id, title: d.title, snippet: snippetAround(d.plaintext, q), matchIn: "content" as const };
          return null;
        })
        .filter((x): x is DocResult => x !== null);
    })();

    const personResults: PersonResult[] = (() => {
      if (!q) return USERS_DEFAULT.map(u => ({ kind: "person" as const, user: u as UserType, matchIn: "name" as const }));
      return USERS_DEFAULT
        .map(u => {
          if (fuzzyMatch(u.name, q).matched) return { kind: "person" as const, user: u as UserType, matchIn: "name" as const };
          if (fuzzyMatch(u.role, q).matched) return { kind: "person" as const, user: u as UserType, matchIn: "role" as const };
          return null;
        })
        .filter((x): x is PersonResult => x !== null);
    })();

    return [...stageResults, ...docResults, ...personResults];
  }, [query, allStageResults, docsWithContent]);

  // Group for rendering
  const stageGroup = results.filter(r => r.kind === "stage") as StageResult[];
  const docGroup = results.filter(r => r.kind === "doc") as DocResult[];
  const personGroup = results.filter(r => r.kind === "person") as PersonResult[];

  // Flat ordered list for keyboard nav
  const flatResults = [...stageGroup, ...docGroup, ...personGroup] as SearchResult[];

  const safeIdx = Math.min(activeIdx, flatResults.length - 1);

  // Reset activeIdx when query changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatResults[safeIdx];
      if (item) activate(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatResults, safeIdx]);

  const activate = useCallback((item: SearchResult) => {
    if (item.kind === "stage") {
      onOpenStage(item.pipelineId, item.stageName);
      onClose();
    } else if (item.kind === "doc") {
      onOpenDocument(item.id);
      onClose();
    } else {
      onOpenPerson(item.user.id);
      onClose();
    }
  }, [onOpenStage, onOpenDocument, onOpenPerson, onClose]);

  if (!open) return null;

  const hasAnyResults = stageGroup.length > 0 || docGroup.length > 0 || personGroup.length > 0;
  // Running index for flat keyboard nav
  let rowIdx = 0;

  return (
    <>
      <style>{`
        @keyframes searchPaletteIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes searchPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1200,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "none",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          paddingTop: "12vh",
        }}
        onClick={onClose}
        onMouseDown={e => { if (e.target === e.currentTarget) e.preventDefault(); }}
      >
        {/* Modal */}
        <div
          style={{
            width: "min(620px, calc(100vw - 32px))",
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            boxShadow: t.shadowLg,
            overflow: "hidden",
            animation: "searchPaletteIn 0.18s ease-out",
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Input row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${t.border}`,
          }}>
            <span style={{ fontSize: 14, color: t.textMuted, flexShrink: 0 }}>⌘</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="search stages, documents, people..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 15,
                color: t.text,
                fontFamily: "var(--font-geist-sans, sans-serif)",
                caretColor: t.accent,
                "::placeholder": { color: t.textDim },
              } as React.CSSProperties}
            />
            <span style={{
              fontSize: 8,
              color: t.textDim,
              fontFamily: "var(--font-geist-mono, monospace)",
              letterSpacing: 1,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "2px 5px",
              flexShrink: 0,
            }}>esc</span>
          </div>

          {/* Results */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* Stages section */}
            {stageGroup.length > 0 && (
              <div>
                <SectionHeader label="Stages" t={t} />
                {stageGroup.map((r) => {
                  const idx = rowIdx++;
                  return (
                    <ResultRow key={`${r.pipelineId}-${r.stageName}`} result={r} active={idx === safeIdx} query={query} t={t} onClick={() => activate(r)} />
                  );
                })}
              </div>
            )}

            {/* Documents section */}
            <div>
              <SectionHeader label="Documents" t={t} />
              {docsLoading ? (
                <>
                  <DocSkeleton t={t} />
                  <DocSkeleton t={t} />
                </>
              ) : docGroup.length > 0 ? (
                docGroup.map((r) => {
                  const idx = rowIdx++;
                  return (
                    <ResultRow key={r.id} result={r} active={idx === safeIdx} query={query} t={t} onClick={() => activate(r)} />
                  );
                })
              ) : (
                <div style={{ padding: "10px 14px", fontSize: 11, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
                  {docsWithContent === null ? "// loading..." : "// no matching documents"}
                </div>
              )}
            </div>

            {/* People section */}
            {personGroup.length > 0 && (
              <div>
                <SectionHeader label="People" t={t} />
                {personGroup.map((r) => {
                  const idx = rowIdx++;
                  return (
                    <ResultRow key={r.user.id} result={r} active={idx === safeIdx} query={query} t={t} onClick={() => activate(r)} />
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!docsLoading && !hasAnyResults && query.trim() !== "" && (
              <div style={{ padding: "28px 14px", textAlign: "center" as const, fontSize: 12, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
                // nothing found — try a different query
              </div>
            )}

            {/* Hint bar */}
            <div style={{
              borderTop: `1px solid ${t.border}`,
              padding: "7px 14px",
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}>
              {[["↑↓", "navigate"], ["↵", "open"], ["esc", "close"]].map(([k, label]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
                  <span style={{ border: `1px solid ${t.border}`, borderRadius: 8, padding: "1px 5px", fontSize: 9 }}>{k}</span>
                  {label}
                </span>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 9, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
                {flatResults.length} result{flatResults.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
