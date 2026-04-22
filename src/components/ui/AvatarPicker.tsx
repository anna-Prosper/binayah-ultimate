"use client";

import React, { useState, useRef } from "react";
import { AVATARS, type UserType } from "@/lib/data";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";

/**
 * AvatarPicker — reusable avatar selection primitive.
 * Extracted from AvatarStep6 in Onboarding.tsx so it can be embedded inline
 * (e.g. WelcomeModal) without its own fixed-position wrapper, preview block,
 * or save button. Those three concerns are caller responsibilities.
 *
 * Props:
 *   - showPreview: render the big avatar preview block (default true; pass false
 *     when the parent already shows the avatar live, e.g. WelcomeModal identity chip)
 *   - onAvatarChange: called on every selection change so parent can reflect it
 */

export interface AvatarPickerProps {
  t: T;
  user: UserType;
  selAvatar: string | null;
  setSelAvatar: (a: string | null) => void;
  /** Pass a selected AI image data-URL if the user generated one */
  selAiImg: string | null;
  setSelAiImg: (img: string | null) => void;
  /** Notifies parent when effective avatar selection changes */
  onAvatarChange?: (opts: { avatar: string | null; aiAvatar: string | null }) => void;
  /** Whether to render the big ringed preview block (default true) */
  showPreview?: boolean;
}

const hints = [
  "cyberpunk hacker with neon glasses",
  "minimalist geometric logo",
  "astronaut explorer",
  "mystical wolf warrior",
  "zen monk in golden light",
];

export function AvatarPicker({
  t,
  user,
  selAvatar,
  setSelAvatar,
  selAiImg,
  setSelAiImg,
  onAvatarChange,
  showPreview = true,
}: AvatarPickerProps) {
  const [tab, setTab] = useState<"emoji" | "ai">("emoji");
  const [loadedImgs, setLoadedImgs] = useState<Set<string>>(new Set());
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function generate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAiImage(null);
    setSelAiImg(null);
    onAvatarChange?.({ avatar: selAvatar, aiAvatar: null });
    try {
      const res = await fetch("/api/generate-pfp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(
          data.error === "GENERATION_TIMEOUT"
            ? "// avatar gen timed out — try again"
            : data.error || "generation failed"
        );
        return;
      }
      if (data.image) {
        setAiImage(data.image);
        setSelAiImg(data.image);
        onAvatarChange?.({ avatar: null, aiAvatar: data.image });
      } else {
        setAiError("no image returned — try a different prompt");
      }
    } catch {
      setAiError("network error");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <style>{`
        @keyframes ap-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ap-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes ap-popIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
        @keyframes ap-scaleIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
        @keyframes ap-fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes ap-ringExpand{from{transform:scale(0.5);opacity:0.6}to{transform:scale(2.5);opacity:0}}
        @media(min-width:600px){.ap-grid{grid-template-columns:repeat(5,1fr)!important;gap:6px!important}}
      `}</style>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: t.surface, borderRadius: 12, padding: 3, marginBottom: 18 }}>
        {(["emoji", "ai"] as const).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 12, fontWeight: 700,
              background: tab === tb ? t.bgCard : "transparent",
              color: tab === tb ? user.color : t.textMuted,
              boxShadow: tab === tb ? `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px ${user.color}22` : "none",
              transition: "all 0.2s",
            }}
          >
            {tb === "emoji" ? "✦ pick avatar" : "✦ generate with AI"}
          </button>
        ))}
      </div>

      {/* EMOJI/IMAGE TAB */}
      {tab === "emoji" && (
        <div
          className="ap-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "0 auto 16px" }}
        >
          {AVATARS.map((av, idx) => {
            const active = selAvatar === av.id && !selAiImg;
            return (
              <button
                key={av.id}
                onClick={() => {
                  setSelAvatar(av.id);
                  setSelAiImg(null);
                  setAiImage(null);
                  onAvatarChange?.({ avatar: av.id, aiAvatar: null });
                }}
                style={{
                  width: "100%", aspectRatio: "1", borderRadius: 14, padding: 0, overflow: "hidden",
                  border: `2px solid ${active ? user.color : t.border}`,
                  cursor: "pointer", transition: "all 0.2s", position: "relative",
                  boxShadow: active ? `0 0 20px ${user.color}44` : "none",
                  transform: active ? "scale(1.07)" : "scale(1)",
                  animation: `ap-scaleIn 0.3s ease ${idx * 0.02}s both`,
                  background: "#111",
                }}
              >
                {!loadedImgs.has(av.id) && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", background: `${user.color}18`,
                    fontSize: 18, fontWeight: 800, color: user.color,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                  }}>
                    {av.name[0]}
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={av.img}
                  alt={av.name}
                  onLoad={() => setLoadedImgs(p => new Set([...p, av.id]))}
                  style={{
                    width: "100%", height: "100%", objectFit: "cover", objectPosition: "top",
                    display: "block", opacity: loadedImgs.has(av.id) ? 1 : 0, transition: "opacity 0.25s",
                    transform: av.zoom && av.zoom !== 1 ? `scale(${av.zoom})` : undefined,
                    transformOrigin: "center 20%",
                  }}
                />
                {active && (
                  <div style={{ position: "absolute", inset: 0, background: `${user.color}22`, borderRadius: 12 }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* AI TAB */}
      {tab === "ai" && (
        <div style={{ animation: "ap-fadeIn 0.3s ease" }}>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <input
              ref={inputRef}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder="describe your vibe..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: t.surface, border: `1.5px solid ${t.border}`, borderRadius: 12,
                padding: "12px 52px 12px 14px", color: t.text, fontSize: 13,
                fontFamily: "var(--font-dm-mono), monospace", outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = user.color; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = t.border; }}
            />
            <button
              onClick={generate}
              disabled={aiLoading || !aiPrompt.trim()}
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: `linear-gradient(135deg,${user.color},${user.color}bb)`,
                border: "none", borderRadius: 8, width: 36, height: 30,
                color: "#fff", fontSize: 14, cursor: aiLoading || !aiPrompt.trim() ? "not-allowed" : "pointer",
                opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1, transition: "opacity 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {aiLoading
                ? <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "ap-spin 0.7s linear infinite" }} />
                : "→"}
            </button>
          </div>

          {/* Hint chips */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
            {hints.map(h => (
              <button
                key={h}
                onClick={() => { setAiPrompt(h); setTimeout(() => inputRef.current?.focus(), 0); }}
                style={{
                  background: "transparent", border: `1px solid ${t.border}`, borderRadius: 20,
                  padding: "3px 10px", fontSize: 9, color: t.textMuted, cursor: "pointer",
                  fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = user.color + "55";
                  (e.currentTarget as HTMLElement).style.color = user.color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLElement).style.color = t.textMuted;
                }}
              >{h}</button>
            ))}
          </div>

          {aiLoading && (
            <div style={{ marginBottom: 16, textAlign: "center" }}>
              <div style={{
                width: 100, height: 100, borderRadius: 20, margin: "0 auto",
                background: `linear-gradient(90deg, ${t.surface} 25%, ${t.border} 50%, ${t.surface} 75%)`,
                backgroundSize: "200% 100%", animation: "ap-shimmer 1.4s ease-in-out infinite",
              }} />
              <div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 10 }}>
                // generating your vibe...
              </div>
            </div>
          )}

          {aiError && (
            <div style={{ color: "#ff5f5f", fontSize: 11, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>
              ⚠ {aiError}
            </div>
          )}

          {aiImage && !aiLoading && (
            <div style={{ marginBottom: 16, textAlign: "center", animation: "ap-popIn 0.4s ease" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aiImage}
                  alt="ai pfp"
                  style={{
                    width: 100, height: 100, borderRadius: 20, objectFit: "cover",
                    border: `3px solid ${user.color}`, boxShadow: `0 0 30px ${user.color}44`,
                  }}
                />
                <div style={{
                  position: "absolute", top: 6, right: 6, width: 20, height: 20,
                  borderRadius: "50%", background: user.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, boxShadow: `0 0 8px ${user.color}`,
                }}>✓</div>
              </div>
              <button
                onClick={generate}
                style={{
                  display: "block", margin: "8px auto 0", background: "transparent",
                  border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 14px",
                  fontSize: 9, color: t.textMuted, cursor: "pointer",
                  fontFamily: "var(--font-dm-mono), monospace",
                }}
              >↺ regenerate</button>
            </div>
          )}

          {!aiImage && !aiLoading && !aiError && (
            <div style={{ padding: "20px 0", color: t.textDim, fontSize: 11, fontFamily: "var(--font-dm-mono), monospace" }}>
              // type a vibe above and hit enter
            </div>
          )}
        </div>
      )}

      {/* Optional preview block */}
      {showPreview && (
        <div style={{ marginBottom: 16, animation: "ap-fadeIn 0.4s ease", textAlign: "center" }}>
          <div style={{ display: "inline-block", position: "relative" }}>
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: `2px solid ${user.color}22`,
              animation: "ap-ringExpand 2.5s ease-out infinite",
            }} />
            {selAiImg
              ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selAiImg}
                  alt="selected ai avatar"
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${user.color}` }}
                />
              )
              : selAvatar
              ? <AvatarC user={{ ...user, avatar: selAvatar }} size={56} />
              : (
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: `radial-gradient(circle at 30% 30%, ${user.color}55, ${user.color}22)`,
                  border: `2px solid ${user.color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 800, color: user.color,
                }}>
                  {user.name[0]}
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}
