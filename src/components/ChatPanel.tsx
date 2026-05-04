"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { type UserType } from "@/lib/data";
import { type ChatAttachment } from "@/lib/apiSync";

export type ChatMsg = { id: number; userId: string; text: string; time: string; workspaceId?: string; threadId?: string; attachments?: ChatAttachment[] };
type AiMsg = { role: "user" | "assistant"; content: string; time: string; error?: boolean };

const MAX_MSG_LEN = 2000;

interface Props {
  messages: ChatMsg[];
  onSend: (text: string, opts?: { threadId?: string; attachments?: ChatAttachment[] }) => void;
  onRemoteMessage?: (msg: ChatMsg) => void;
  users: UserType[];
  currentUser: string;
  workspaceId?: string;
  t: T;
  defaultTab?: "team" | "dm" | "ai";
  buildAiContext?: () => string;
  /** When true: renders flat (no outer card border/radius) for embedding in a BottomSheet */
  mobileMode?: boolean;
  /** When true: occupies full viewport height (Telegram-style) — no border/radius, messages area fills remaining height */
  fullScreen?: boolean;
  /** Load older messages (infinite scroll — scroll to top triggers this) */
  onLoadMore?: () => Promise<void>;
  onLoadThread?: (threadId: string) => Promise<void>;
  /** Whether more messages are available to load */
  hasMore?: boolean;
}

// Render chat text with @mentions styled in user color
function renderMentions(text: string, users: UserType[], textColor: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /@([a-z0-9_-]+)/gi;
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(re)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push(<span key={`t-${i++}`}>{text.slice(last, idx)}</span>);
    const handle = match[1].toLowerCase();
    const user = users.find(u => u.id === handle || u.name.toLowerCase() === handle);
    if (user) {
      parts.push(<span key={`m-${i++}`} style={{ color: user.color, fontWeight: 700, background: user.color + "14", padding: "0 4px", borderRadius: 8 }}>@{user.name}</span>);
    } else {
      parts.push(<span key={`u-${i++}`} style={{ color: textColor }}>{match[0]}</span>);
    }
    last = idx + match[0].length;
  }
  if (last < text.length) parts.push(<span key={`t-${i++}`}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

const dmThreadId = (a: string, b: string) => `dm:${[a, b].sort().join(":")}`;

export default function ChatPanel({ messages, onSend, onRemoteMessage, users, currentUser, workspaceId = "main", t, defaultTab = "team", buildAiContext, mobileMode = false, fullScreen = false, onLoadMore, onLoadThread, hasMore = true }: Props) {
  const [tab, setTab] = useState<"team" | "dm" | "ai">(defaultTab);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [dmUserId, setDmUserId] = useState(() => users.find(u => u.id !== currentUser && u.id !== "ai")?.id || "");
  const [mentionState, setMentionState] = useState<{ open: boolean; query: string; selectedIdx: number; startPos: number }>({ open: false, query: "", selectedIdx: 0, startPos: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filter users by mention query
  const mentionMatches = mentionState.open
    ? users.filter(u => u.id !== currentUser && (u.id.includes(mentionState.query.toLowerCase()) || u.name.toLowerCase().includes(mentionState.query.toLowerCase()))).slice(0, 6)
    : [];

  const detectMention = (value: string, caretPos: number) => {
    // Find the @ before the caret without a space in between
    const beforeCaret = value.slice(0, caretPos);
    const atIdx = beforeCaret.lastIndexOf("@");
    if (atIdx === -1) { setMentionState(s => ({ ...s, open: false })); return; }
    // Must be at start, or preceded by whitespace
    if (atIdx > 0 && !/\s/.test(beforeCaret[atIdx - 1])) { setMentionState(s => ({ ...s, open: false })); return; }
    const between = beforeCaret.slice(atIdx + 1);
    if (/\s/.test(between)) { setMentionState(s => ({ ...s, open: false })); return; }
    setMentionState({ open: true, query: between, selectedIdx: 0, startPos: atIdx });
  };

  const insertMention = (userId: string) => {
    if (!mentionState.open) return;
    const before = input.slice(0, mentionState.startPos);
    const after = input.slice((inputRef.current?.selectionStart ?? input.length));
    const newValue = `${before}@${userId} ${after}`;
    setInput(newValue);
    setMentionState(s => ({ ...s, open: false }));
    setTimeout(() => {
      const caret = (before + "@" + userId + " ").length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    }, 0);
  };
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInputError, setAiInputError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [sseHasConnected, setSseHasConnected] = useState(false); // true after first successful open
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiBottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const activeThreadId = tab === "dm" && dmUserId ? dmThreadId(currentUser, dmUserId) : "team";
  const visibleMessages = messages.filter(m => (m.threadId || "team") === activeThreadId);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleMessages.length]);
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages.length]);
  useEffect(() => { if (tab !== "ai") void onLoadThread?.(activeThreadId); }, [activeThreadId, tab, onLoadThread]);

  // SSE subscription — team chat only. AI tab has no SSE.
  useEffect(() => {
    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;
	      const threadMessages = messages.filter(m => (m.threadId || "team") === activeThreadId);
	      const lastId = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1].id : 0;
	      const workspace = workspaceId || threadMessages[threadMessages.length - 1]?.workspaceId || messages[messages.length - 1]?.workspaceId || "main";
	      const es = new EventSource(`/api/pipeline-state/messages/stream?since=${lastId}&workspaceId=${encodeURIComponent(workspace)}&threadId=${encodeURIComponent(activeThreadId)}`);
      esRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        setSseConnected(true);
        setSseHasConnected(true);
        backoffRef.current = 1000; // reset backoff on successful connection
      };

      es.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data) as ChatMsg;
          onRemoteMessage?.(msg);
        } catch { /* malformed event, skip */ }
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        setSseConnected(false);
        es.close();
        esRef.current = null;
        // Exponential backoff: 1s → 2s → 4s → capped at 30s
        const delay = Math.min(backoffRef.current, 30_000);
        backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]); // reconnect when switching team/DM thread

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < 60 && !loadingMore && hasMore) {
      setLoadingMore(true);
      const prevHeight = el.scrollHeight;
      await onLoadMore?.();
      // After messages load, maintain scroll position so it doesn't jump to top
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight;
      });
      setLoadingMore(false);
    }
  };

  const canSend = (input.trim().length > 0 || attachments.length > 0) && input.trim().length <= MAX_MSG_LEN;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, 4 - attachments.length);
    const next = await Promise.all(picked.map(file => new Promise<ChatAttachment>((resolve, reject) => {
      if (file.size > 900_000) reject(new Error("file too large"));
      const reader = new FileReader();
      reader.onload = () => resolve({ id: `${Date.now()}-${file.name}`, name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: String(reader.result) });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }).catch(() => null)));
    setAttachments(prev => [...prev, ...next.filter((x): x is ChatAttachment => !!x)].slice(0, 4));
    if (fileRef.current) fileRef.current.value = "";
  };

  const send = () => {
    const text = input.trim();
    if (!text || text.length > MAX_MSG_LEN) return;
    onSend(text, { threadId: activeThreadId, attachments });
    setInput("");
    setAttachments([]);
  };

  const sendAi = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiInputError(null);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: AiMsg = { role: "user", content: text, time: now };
    const updated = [...aiMessages, userMsg];
    setAiMessages(updated);
    // Don't clear input yet — restore it if the request fails so the user doesn't lose their message
    setAiLoading(true);
    let succeeded = false;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          context: buildAiContext?.(),
        }),
      });
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (res.status === 429) {
        setAiMessages(prev => [...prev, { role: "assistant", content: "// slow down — 20 messages per minute", time: replyTime, error: true }]);
        return;
      }
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok || data.error) {
        const errMsg = data.error?.toLowerCase().includes("rate") || data.error?.toLowerCase().includes("429")
          ? "// slow down — 20 messages per minute"
          : data.error?.toLowerCase().includes("context") || data.error?.toLowerCase().includes("too long")
          ? "// context too long — start a fresh conversation"
          : "// ai is taking a nap — try again";
        setAiMessages(prev => [...prev, { role: "assistant", content: errMsg, time: replyTime, error: true }]);
        return;
      }
      setAiMessages(prev => [...prev, { role: "assistant", content: data.reply || "no response", time: replyTime }]);
      succeeded = true;
      setAiInput("");
    } catch {
      const errTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAiMessages(prev => [...prev, { role: "assistant", content: "// ai is taking a nap — try again", time: errTime, error: true }]);
    } finally {
      setAiLoading(false);
      // Restore user's message in the input if the request failed
      if (!succeeded) setAiInput(text);
    }
  };

  const inputCharCount = input.length;
  const isInputTooLong = inputCharCount > MAX_MSG_LEN;

  // In mobile mode, the BottomSheet provides the container; render flat with taller message areas
  // In fullScreen mode, the messages area should flex to fill remaining height (no fixed height)
  const msgAreaHeight = mobileMode ? "calc(50vh - 80px)" : 220;

  return (
    <div style={fullScreen
      ? { display: "flex", flexDirection: "column", height: "100vh", background: t.bgCard, overflow: "hidden" }
      : mobileMode
      ? { background: t.bgCard, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1 }
      : { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, marginBottom: 16, overflow: "hidden", animation: "fadeIn 0.2s ease" }
    }>
      {/* Header + tabs */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        {/* SSE connection dot — only shown on team tab */}
          {tab === "team" || tab === "dm" ? (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: sseConnected ? t.green : t.amber, boxShadow: `0 0 6px ${sseConnected ? t.green : t.amber}88`, transition: "all 0.3s" }} title={sseConnected ? "live" : "reconnecting..."} />
        ) : (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.amber, boxShadow: `0 0 6px ${t.amber}88` }} />
        )}
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
          {tab === "team" ? "team chat" : tab === "dm" ? "direct messages" : "binayah ai"}
        </span>
        {/* M-2: Only show "reconnecting" after we've had a successful connection before; otherwise it's just "connecting" */}
        {(tab === "team" || tab === "dm") && !sseConnected && sseHasConnected && (
          <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontStyle: "italic" }}>
            // reconnecting...
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
	          {(["team", "dm", "ai"] as const).map(v => (
            <button key={v} onClick={() => setTab(v)} style={{ background: tab === v ? t.accent + "22" : "transparent", border: `1px solid ${tab === v ? t.accent + "55" : t.border}`, borderRadius: 8, padding: "0 8px", cursor: "pointer", fontSize: 10, color: tab === v ? t.accent : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>
	              {v === "team" ? "👥 team" : v === "dm" ? "✉ dm" : "🤖 ai"}
            </button>
          ))}
        </div>
      </div>

      {/* Team chat */}
      {(tab === "team" || tab === "dm") && (
        <>
          {tab === "dm" && (
            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 6, overflowX: "auto" }}>
              {users.filter(u => u.id !== currentUser && u.id !== "ai").map(u => (
                <button key={u.id} onClick={() => setDmUserId(u.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: dmUserId === u.id ? u.color + "22" : "transparent", border: `1px solid ${dmUserId === u.id ? u.color + "66" : t.border}`, borderRadius: 999, padding: "4px 8px", color: dmUserId === u.id ? u.color : t.textMuted, cursor: "pointer", fontSize: 11, fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" }}>
                  <AvatarC user={u} size={18} /> {u.name}
                </button>
              ))}
            </div>
          )}
          <div onScroll={handleScroll} style={fullScreen ? { flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 } : { height: msgAreaHeight, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingMore && (
              <div style={{ textAlign: "center", padding: "8px", fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>
                // loading older messages...
              </div>
            )}
            {hasMore && !loadingMore && messages.length >= 50 && (
              <div style={{ textAlign: "center", padding: "8px" }}>
                <button onClick={async () => { setLoadingMore(true); await onLoadMore?.(); setLoadingMore(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>
                  &#x2191; load older messages
                </button>
              </div>
            )}
            {visibleMessages.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 24 }}>💬</span>
              </div>
            )}
            {visibleMessages.map(msg => {
              const u = users.find(u => u.id === msg.userId);
              const isMe = msg.userId === currentUser;
              return (
                <div key={msg.id} style={{ display: "flex", gap: 8, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", animation: "msgFadeIn 0.15s ease" }}>
                  {u && <div style={{ flexShrink: 0 }}><AvatarC user={u} size={22} /></div>}
                  <div style={{ maxWidth: "85%", minWidth: 0 }}>
                    {!isMe && <div style={{ fontSize: 10, color: u?.color || t.textMuted, fontWeight: 700, marginBottom: 4, paddingLeft: 4, fontFamily: "var(--font-dm-mono), monospace" }}>{u?.name}</div>}
	                    <div style={{ background: isMe ? (u?.color || t.accent) + "22" : t.surface, border: `1px solid ${isMe ? (u?.color || t.accent) + "44" : t.border}`, borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "8px 12px", fontSize: 13, color: t.text, lineHeight: 1.5, wordBreak: "break-word" }}>
	                      {renderMentions(msg.text, users, t.text)}
	                      {(msg.attachments || []).length > 0 && (
	                        <div style={{ display: "grid", gap: 6, marginTop: msg.text ? 8 : 0 }}>
	                          {(msg.attachments || []).map(file => file.type.startsWith("image/")
	                            ? (
	                              <a key={file.id} href={file.dataUrl} target="_blank" rel="noreferrer">
	                                {/* eslint-disable-next-line @next/next/no-img-element */}
	                                <img src={file.dataUrl} alt={file.name} style={{ maxWidth: 220, maxHeight: 160, borderRadius: 10, border: `1px solid ${t.border}`, display: "block", objectFit: "cover" }} />
	                              </a>
	                            )
	                            : <a key={file.id} href={file.dataUrl} download={file.name} style={{ color: t.accent, fontSize: 11, fontFamily: "var(--font-dm-mono), monospace" }}>📎 {file.name}</a>
	                          )}
	                        </div>
	                      )}
	                    </div>
                    <div style={{ fontSize: 10, color: t.textDim, marginTop: 4, textAlign: isMe ? "right" : "left", paddingInline: 4 }}>{msg.time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "8px 16px", borderTop: `1px solid ${t.border}`, position: "relative" }}>
            {/* Mention autocomplete picker */}
            {mentionState.open && mentionMatches.length > 0 && (
              <div style={{ position: "absolute", left: 16, right: 16, bottom: "calc(100% - 4px)", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: "0 -8px 24px rgba(0,0,0,0.3)", overflow: "hidden", zIndex: 50 }}>
                {mentionMatches.map((u, idx) => (
                  <button
                    key={u.id}
                    onClick={() => insertMention(u.id)}
                    onMouseEnter={() => setMentionState(s => ({ ...s, selectedIdx: idx }))}
                    style={{ width: "100%", background: idx === mentionState.selectedIdx ? u.color + "22" : "transparent", border: "none", padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left", color: t.text, fontFamily: "var(--font-dm-mono), monospace", fontSize: 13 }}
                  >
                    <AvatarC user={u} size={20} />
                    <span style={{ color: u.color, fontWeight: 700 }}>@{u.id}</span>
                    <span style={{ color: t.textDim, fontSize: 11 }}>{u.name} · {u.role}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 4 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => {
                  const v = e.target.value;
                  setInput(v);
                  detectMention(v, e.target.selectionStart ?? v.length);
                }}
                onKeyUp={e => {
                  // Update mention detection on caret movement
                  const caret = (e.target as HTMLInputElement).selectionStart ?? input.length;
                  detectMention(input, caret);
                }}
                onClick={e => detectMention(input, (e.target as HTMLInputElement).selectionStart ?? input.length)}
                onKeyDown={e => {
                  if (mentionState.open && mentionMatches.length > 0) {
                    if (e.key === "ArrowDown") { e.preventDefault(); setMentionState(s => ({ ...s, selectedIdx: (s.selectedIdx + 1) % mentionMatches.length })); return; }
                    if (e.key === "ArrowUp") { e.preventDefault(); setMentionState(s => ({ ...s, selectedIdx: (s.selectedIdx - 1 + mentionMatches.length) % mentionMatches.length })); return; }
                    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionMatches[mentionState.selectedIdx].id); return; }
                    if (e.key === "Escape") { e.preventDefault(); setMentionState(s => ({ ...s, open: false })); return; }
                  }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
	                placeholder={tab === "dm" ? "private message..." : "message the team... use @ to mention"}
                maxLength={MAX_MSG_LEN + 50} /* allow overage to show counter */
                style={{
                  flex: 1,
                  background: "transparent",
                  border: `1px solid ${isInputTooLong ? t.red + "88" : t.border}`,
                  borderRadius: 12,
                  padding: mobileMode ? "12px" : "8px 12px",
                  minHeight: mobileMode ? 44 : undefined,
                  fontSize: 13,
                  color: t.text,
                  fontFamily: "inherit",
                  outline: "none",
                }}
	              />
	              <input ref={fileRef} type="file" multiple onChange={e => addFiles(e.target.files)} style={{ display: "none" }} />
	              <button onClick={() => fileRef.current?.click()} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 10px", cursor: "pointer", color: t.textMuted }}>📎</button>
              <button
                onClick={send}
                disabled={!canSend}
                style={{
                  background: canSend ? t.accent : t.surface,
                  border: "none",
                  borderRadius: 12,
                  padding: mobileMode ? "12px 20px" : "8px 16px",
                  minHeight: mobileMode ? 44 : undefined,
                  minWidth: mobileMode ? 44 : undefined,
                  cursor: canSend ? "pointer" : "not-allowed",
                  fontSize: 15,
                  color: canSend ? "#fff" : t.textMuted,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: canSend ? 1 : 0.5,
                  transition: "all 0.15s",
                }}
              >↵</button>
	            </div>
	            {attachments.length > 0 && (
	              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
	                {attachments.map(file => (
	                  <button key={file.id} onClick={() => setAttachments(prev => prev.filter(f => f.id !== file.id))} style={{ background: t.accent + "12", border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "3px 7px", color: t.accent, fontSize: 10, fontFamily: "var(--font-dm-mono), monospace", cursor: "pointer" }}>📎 {file.name} ×</button>
	                ))}
	              </div>
	            )}
            {isInputTooLong && (
              <div style={{ fontSize: 10, color: t.red, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>
                // {inputCharCount}/{MAX_MSG_LEN} — message too long
              </div>
            )}
          </div>
        </>
      )}

      {/* AI chat */}
      {tab === "ai" && (
        <>
          <div style={fullScreen ? { flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 } : { height: msgAreaHeight, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {aiMessages.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 28 }}>🤖</span>
                <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}>binayah ai · powered by gpt-4o-mini<br />ask anything about the pipeline</span>
              </div>
            )}
            {aiMessages.map((msg, i) => {
              const isUser = msg.role === "user";
              // For error messages, find the last user message before this one for retry
              const prevUserMsg = !isUser && msg.error
                ? [...aiMessages].slice(0, i).reverse().find(m => m.role === "user")
                : null;
              return (
                <div key={i} style={{ display: "flex", gap: 8, flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-end" }}>
                  {!isUser && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
                  )}
                  <div style={{ maxWidth: "85%", minWidth: 0 }}>
                    {!isUser && <div style={{ fontSize: 10, color: msg.error ? t.red : t.accent, fontWeight: 700, marginBottom: 4, paddingLeft: 4, fontFamily: "var(--font-dm-mono), monospace" }}>Binayah AI</div>}
                    <div style={{
                      background: isUser ? t.accent + "22" : msg.error ? t.red + "12" : t.surface,
                      border: `1px solid ${isUser ? t.accent + "44" : msg.error ? t.red + "33" : t.border}`,
                      borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      padding: "8px 12px",
                      fontSize: 13,
                      color: msg.error ? t.red : t.text,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      fontFamily: msg.error ? "var(--font-dm-mono), monospace" : "inherit",
                    }}>
                      {msg.content}
                    </div>
                    {prevUserMsg && (
                      <button
                        onClick={() => setAiInput(prevUserMsg.content)}
                        style={{ marginTop: 4, paddingLeft: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        ↻ retry
                      </button>
                    )}
                    <div style={{ fontSize: 10, color: t.textDim, marginTop: 2, textAlign: isUser ? "right" : "left", paddingInline: 4 }}>{msg.time}</div>
                  </div>
                </div>
              );
            })}
            {aiLoading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px 14px 14px 4px", padding: "8px 12px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent, animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>
          <div style={{ padding: "8px 16px", borderTop: `1px solid ${t.border}` }}>
            {aiInputError && (
              <div style={{ fontSize: 10, color: t.red, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 4 }}>
                {aiInputError}
              </div>
            )}
            <div style={{ display: "flex", gap: 4 }}>
              <input
                value={aiInput}
                onChange={e => { setAiInput(e.target.value); setAiInputError(null); }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAi(); } }}
                placeholder="ask binayah ai..."
                disabled={aiLoading}
                style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none" }}
              />
              <button
                onClick={sendAi}
                disabled={aiLoading || !aiInput.trim()}
                style={{
                  background: (aiLoading || !aiInput.trim()) ? t.surface : `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`,
                  border: "none",
                  borderRadius: 12,
                  padding: "8px 16px",
                  cursor: (aiLoading || !aiInput.trim()) ? "not-allowed" : "pointer",
                  fontSize: 13,
                  color: "#fff",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: (aiLoading || !aiInput.trim()) ? 0.5 : 1,
                }}
              >→</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-5px) }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
