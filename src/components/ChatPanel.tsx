"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { type UserType } from "@/lib/data";

export type ChatMsg = { id: number; userId: string; text: string; time: string };

interface Props {
  messages: ChatMsg[];
  onSend: (text: string) => void;
  users: UserType[];
  currentUser: string;
  t: T;
}

export default function ChatPanel({ messages, onSend, users, currentUser, t }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, marginBottom: 16, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.amber, boxShadow: `0 0 6px ${t.amber}88` }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>team chat</span>
        <span style={{ marginLeft: "auto", fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", background: t.surface, padding: "2px 8px", borderRadius: 6 }}>
          local · wire API for real-time
        </span>
      </div>

      {/* Messages */}
      <div style={{ height: 220, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 24 }}>{"\uD83D\uDCAC"}</span>
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

      {/* Input */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="message the team..."
          style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 10, color: t.text, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={send} style={{ background: t.accent, border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u21B5"}</button>
      </div>
    </div>
  );
}
