"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { type UserType } from "@/lib/data";

export type ChatMsg = { id: number; userId: string; text: string; time: string };
type AiMsg = { role: "user" | "assistant"; content: string; time: string };

interface Props {
  messages: ChatMsg[];
  onSend: (text: string) => void;
  users: UserType[];
  currentUser: string;
  t: T;
  defaultTab?: "team" | "ai";
}

export default function ChatPanel({ messages, onSend, users, currentUser, t, defaultTab = "team" }: Props) {
  const [tab, setTab] = useState<"team" | "ai">(defaultTab);
  const [input, setInput] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages.length]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  const sendAi = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: AiMsg = { role: "user", content: text, time: now };
    const updated = [...aiMessages, userMsg];
    setAiMessages(updated);
    setAiInput("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAiMessages(prev => [...prev, { role: "assistant", content: data.reply || data.error || "no response", time: replyTime }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "network error — try again", time: now }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, marginBottom: 16, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
      {/* Header + tabs */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.amber, boxShadow: `0 0 6px ${t.amber}88` }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
          {tab === "team" ? "team chat" : "binayah ai"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {(["team", "ai"] as const).map(v => (
            <button key={v} onClick={() => setTab(v)} style={{ background: tab === v ? t.accent + "22" : "transparent", border: `1px solid ${tab === v ? t.accent + "55" : t.border}`, borderRadius: 8, padding: "2px 10px", cursor: "pointer", fontSize: 8, color: tab === v ? t.accent : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>
              {v === "team" ? "👥 team" : "🤖 ai"}
            </button>
          ))}
        </div>
      </div>

      {/* Team chat */}
      {tab === "team" && (
        <>
          <div style={{ height: 220, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 24 }}>💬</span>
                <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>no messages yet — start the chat</span>
              </div>
            )}
            {messages.map(msg => {
              const u = users.find(u => u.id === msg.userId);
              const isMe = msg.userId === currentUser;
              return (
                <div key={msg.id} style={{ display: "flex", gap: 8, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end" }}>
                  {u && <div style={{ flexShrink: 0 }}><AvatarC user={u} size={22} /></div>}
                  <div style={{ maxWidth: "68%" }}>
                    {!isMe && <div style={{ fontSize: 7, color: u?.color || t.textMuted, fontWeight: 700, marginBottom: 3, paddingLeft: 4, fontFamily: "var(--font-dm-mono), monospace" }}>{u?.name}</div>}
                    <div style={{ background: isMe ? (u?.color || t.accent) + "22" : t.surface, border: `1px solid ${isMe ? (u?.color || t.accent) + "44" : t.border}`, borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "7px 11px", fontSize: 11, color: t.text, lineHeight: 1.5 }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: 7, color: t.textDim, marginTop: 3, textAlign: isMe ? "right" : "left", paddingInline: 4 }}>{msg.time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="message the team..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 10, color: t.text, fontFamily: "inherit", outline: "none" }} />
            <button onClick={send} style={{ background: t.accent, border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>↵</button>
          </div>
        </>
      )}

      {/* AI chat */}
      {tab === "ai" && (
        <>
          <div style={{ height: 220, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {aiMessages.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 28 }}>🤖</span>
                <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}>binayah ai · powered by gpt-4o-mini<br />ask anything about the pipeline</span>
              </div>
            )}
            {aiMessages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={i} style={{ display: "flex", gap: 8, flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-end" }}>
                  {!isUser && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🤖</div>
                  )}
                  <div style={{ maxWidth: "75%" }}>
                    {!isUser && <div style={{ fontSize: 7, color: t.accent, fontWeight: 700, marginBottom: 3, paddingLeft: 4, fontFamily: "var(--font-dm-mono), monospace" }}>Binayah AI</div>}
                    <div style={{ background: isUser ? t.accent + "22" : t.surface, border: `1px solid ${isUser ? t.accent + "44" : t.border}`, borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "7px 11px", fontSize: 11, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 7, color: t.textDim, marginTop: 3, textAlign: isUser ? "right" : "left", paddingInline: 4 }}>{msg.time}</div>
                  </div>
                </div>
              );
            })}
            {aiLoading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🤖</div>
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px 14px 14px 4px", padding: "7px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent, animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 6 }}>
            <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAi(); } }} placeholder="ask binayah ai..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 10, color: t.text, fontFamily: "inherit", outline: "none" }} disabled={aiLoading} />
            <button onClick={sendAi} disabled={aiLoading} style={{ background: aiLoading ? t.surface : `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`, border: "none", borderRadius: 10, padding: "8px 16px", cursor: aiLoading ? "default" : "pointer", fontSize: 11, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", opacity: aiLoading ? 0.5 : 1 }}>→</button>
          </div>
        </>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-5px) }
        }
      `}</style>
    </div>
  );
}
