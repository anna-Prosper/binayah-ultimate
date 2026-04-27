"use client";

/**
 * Onboarding.tsx — full multi-step first-login experience.
 *
 * Steps:
 *   0   — Theme picker (2 phases: style → dark/light mode)
 *   1-4 — Pipeline overview / intro cards (typewriter titles, progress dots)
 *   5   — Avatar picker (emoji + AI generation)
 *   6   — Celebration / "you're in" final step
 *
 * The user-picker step (formerly step 5) is REMOVED.
 * Identity comes from the auth session via `sessionUser` prop.
 * `selUser` is always pre-filled from `sessionUser.id`.
 *
 * When complete, calls `onComplete({ avatar, aiAvatar })`.
 */

import React, { useState, useEffect, useRef } from "react";
import { ONBOARDING, AVATARS, pipelineData, type UserType } from "@/lib/data";
import { T, THEME_OPTIONS } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { NB } from "@/components/ui/primitives";

// ─── Global keyframes ─────────────────────────────────────────────────────────

const css = `
@keyframes ob-slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes ob-slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes ob-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes ob-scaleIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
@keyframes ob-orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes ob-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes ob-scanline{0%{top:-10%}100%{top:110%}}
@keyframes ob-scanlineH{0%{left:-100%}100%{left:200%}}
@keyframes ob-glitch{0%,100%{transform:translate(0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1px,2px)}80%{transform:translate(1px,-2px)}}
@keyframes ob-typeGlow{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes ob-ringExpand{from{transform:scale(0.5);opacity:0.6}to{transform:scale(2.5);opacity:0}}
@keyframes ob-countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes ob-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes ob-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes ob-popIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
@keyframes ob-celebPop{0%{opacity:0;transform:scale(0.6) rotate(-12deg)}60%{transform:scale(1.15) rotate(4deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
@keyframes ob-celebFloat{0%,100%{transform:translateY(0) rotate(0deg);opacity:0.7}50%{transform:translateY(-18px) rotate(12deg);opacity:1}}
@media(min-width:600px){.ob-av-grid{grid-template-columns:repeat(5,1fr)!important;gap:6px!important}.ob-av-card{max-height:88vh;overflow-y:hidden!important}}
`;

// ─── Typewriter hook ──────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 35, delay = 200) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    const timeout = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(iv); setDone(true); }
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return { displayed, done };
}

// ─── Animated background ──────────────────────────────────────────────────────

export const FloatingBg = ({ colors, themeStyle }: { colors: string[]; themeStyle: string }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapesMap: Record<string, any> = {
    warroom: { grid: true, scanline: true, rings: true, particles: "dots", cornerGlow: ["#bf5af2", "#ff2d78"] },
    lab: { grid: false, scanline: false, rings: false, particles: "hexagons", cornerGlow: ["#00e5a0", "#00b4d8"], dna: true },
    engine: { grid: true, scanline: true, rings: false, particles: "sparks", cornerGlow: ["#ff6b35", "#ffcc00"], gears: true },
    nerve: { grid: false, scanline: false, rings: true, particles: "neurons", cornerGlow: ["#5b8cf8", "#a78bfa"], waves: true },
  };
  const shapes = shapesMap[themeStyle || "warroom"] || shapesMap.warroom;
  const cs = colors;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {shapes.grid && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03 }}>
          <defs><pattern id="ob-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth="0.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#ob-grid)" />
        </svg>
      )}
      {shapes.scanline && <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,#ffffff08,transparent)", animation: "ob-scanline 8s linear infinite" }} />}
      {shapes.rings && cs.map((c: string, i: number) => (
        <div key={`ring-${i}`} style={{ position: "absolute", left: "50%", top: "50%", width: 300 + i * 120, height: 300 + i * 120, marginLeft: -(150 + i * 60), marginTop: -(150 + i * 60), borderRadius: "50%", border: `1px solid ${c}08`, animation: `ob-orbit ${30 + i * 15}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }}>
          <div style={{ position: "absolute", top: -2, left: "50%", width: 4, height: 4, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}66`, opacity: 0.5 }} />
        </div>
      ))}
      {shapes.dna && [...Array(10)].map((_: unknown, i: number) => (
        <div key={`dna-${i}`} style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", border: `1px solid ${cs[i % 2 === 0 ? 0 : 1]}22`, left: `${45 + Math.sin(i * 0.6) * 8}%`, top: `${5 + i * 9}%`, animation: `ob-float ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * -0.2}s`, opacity: 0.3 }} />
      ))}
      {shapes.gears && [...Array(3)].map((_: unknown, i: number) => (
        <svg key={`gear-${i}`} style={{ position: "absolute", left: `${10 + i * 35}%`, top: `${15 + i * 25}%`, width: 60 + i * 20, height: 60 + i * 20, opacity: 0.04, animation: `ob-orbit ${20 + i * 10}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }} viewBox="0 0 100 100">
          <path d="M50 10 L55 25 L65 15 L60 30 L75 25 L65 35 L80 40 L65 45 L75 55 L60 50 L65 65 L55 55 L50 70 L45 55 L35 65 L40 50 L25 55 L35 45 L20 40 L35 35 L25 25 L40 30 L35 15 L45 25 Z" fill="#fff" />
          <circle cx="50" cy="40" r="12" fill="none" stroke="#fff" strokeWidth="3" />
        </svg>
      ))}
      {shapes.waves && [...Array(3)].map((_: unknown, i: number) => (
        <div key={`wave-${i}`} style={{ position: "absolute", left: "-10%", right: "-10%", top: `${30 + i * 20}%`, height: 1, background: `linear-gradient(90deg,transparent,${cs[i % cs.length]}06,transparent)`, animation: `ob-float ${4 + i}s ease-in-out infinite`, animationDelay: `${i * -0.8}s` }} />
      ))}
      {[...Array(16)].map((_: unknown, i: number) => (
        <div key={`p-${i}`} style={{
          position: "absolute",
          width: shapes.particles === "sparks" ? 1 : shapes.particles === "hexagons" ? 4 : 2,
          height: shapes.particles === "sparks" ? 8 + i % 5 : shapes.particles === "hexagons" ? 4 : 2,
          borderRadius: shapes.particles === "hexagons" ? "1px" : "50%",
          background: cs[i % cs.length], opacity: 0.08 + (i % 5) * 0.03,
          left: `${5 + i * 6}%`, top: `${8 + (i * 17) % 80}%`,
          animation: `ob-float ${3 + i * 0.7}s ease-in-out infinite`, animationDelay: `${i * -0.4}s`,
        }} />
      ))}
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle,${shapes.cornerGlow[0]}08,transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 350, height: 350, borderRadius: "50%", background: `radial-gradient(circle,${shapes.cornerGlow[1]}08,transparent 70%)` }} />
    </div>
  );
};

// ─── AvatarStep (step 5) — embedded in the full flow ─────────────────────────

function AvatarStep({
  t, user, selAvatar, setSelAvatar, onComplete, AnimBg,
}: {
  t: T; user: UserType;
  selAvatar: string | null; setSelAvatar: (a: string | null) => void;
  onComplete: (opts: { avatar: string | null; aiAvatar: string | null }) => void;
  AnimBg: () => React.ReactElement;
}) {
  const [tab, setTab] = useState<"emoji" | "ai">("emoji");
  const [loadedImgs, setLoadedImgs] = useState<Set<string>>(new Set());
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [selAiImg, setSelAiImg] = useState<string | null>(null);
  const [aiUserAvatar, setAiUserAvatar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hints = ["cyberpunk hacker with neon glasses", "minimalist geometric logo", "astronaut explorer", "mystical wolf warrior", "zen monk in golden light"];

  async function generate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError(""); setAiImage(null); setSelAiImg(null); setAiUserAvatar(null);
    try {
      const res = await fetch("/api/generate-pfp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt }) });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error === "GENERATION_TIMEOUT" ? "// avatar gen timed out — try again" : data.error || "generation failed");
        return;
      }
      if (data.image) { setAiImage(data.image); setSelAiImg(data.image); setAiUserAvatar(data.image); }
      else setAiError("no image returned — try a different prompt");
    } catch { setAiError("network error"); }
    finally { setAiLoading(false); }
  }

  function confirm() {
    const finalAvatar = selAiImg ? "__ai__" : (selAvatar || user.avatar);
    onComplete({ avatar: finalAvatar || null, aiAvatar: selAiImg || null });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: t.bg + "ee", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <AnimBg />
      <div onClick={e => e.stopPropagation()} className="ob-av-card" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <NB color={user.color} style={{ background: t.bgCard, padding: "20px 20px", maxWidth: 460, width: "94vw", textAlign: "center", animation: "ob-scaleIn 0.4s ease", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: user.color }}>choose your pfp</div>
          <p style={{ fontSize: 10, color: t.textMuted, margin: "4px 0 16px", fontFamily: "var(--font-dm-mono), monospace" }}>// {user.name.toLowerCase()}, pick your persona</p>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, background: t.surface, borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {(["emoji", "ai"] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)} style={{
                flex: 1, padding: "8px 0", borderRadius: 12, border: "none", cursor: "pointer",
                fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 12, fontWeight: 700,
                background: tab === tb ? t.bgCard : "transparent",
                color: tab === tb ? user.color : t.textMuted,
                boxShadow: tab === tb ? `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px ${user.color}22` : "none",
                transition: "all 0.2s",
              }}>
                {tb === "emoji" ? "✦ pick avatar" : "✦ generate with AI"}
              </button>
            ))}
          </div>

          {/* Emoji/image tab */}
          {tab === "emoji" && (
            <div className="ob-av-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "0 auto 16px" }}>
              {AVATARS.map((av, idx) => {
                const active = selAvatar === av.id && !selAiImg;
                return (
                  <button key={av.id} onClick={() => { setSelAvatar(av.id); setSelAiImg(null); setAiUserAvatar(null); }} style={{
                    width: "100%", aspectRatio: "1", borderRadius: 16, padding: 0, overflow: "hidden",
                    border: `2px solid ${active ? user.color : t.border}`,
                    cursor: "pointer", transition: "all 0.2s", position: "relative",
                    boxShadow: active ? `0 0 20px ${user.color}44` : "none",
                    transform: active ? "scale(1.07)" : "scale(1)",
                    animation: `ob-scaleIn 0.3s ease ${idx * 0.02}s both`,
                    background: "#111",
                  }}>
                    {!loadedImgs.has(av.id) && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${user.color}18`, fontSize: 18, fontWeight: 800, color: user.color, fontFamily: "var(--font-dm-sans), sans-serif" }}>{av.name[0]}</div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={av.img} alt={av.name} onLoad={() => setLoadedImgs(p => new Set([...p, av.id]))} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block", opacity: loadedImgs.has(av.id) ? 1 : 0, transition: "opacity 0.25s", transform: av.zoom && av.zoom !== 1 ? `scale(${av.zoom})` : undefined, transformOrigin: "center 20%" }} />
                    {active && <div style={{ position: "absolute", inset: 0, background: `${user.color}22`, borderRadius: 12 }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* AI tab */}
          {tab === "ai" && (
            <div style={{ animation: "ob-fadeIn 0.3s ease" }}>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input ref={inputRef} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="describe your vibe..."
                  style={{ width: "100%", boxSizing: "border-box", background: t.surface, border: `1.5px solid ${t.border}`, borderRadius: 12, padding: "12px 48px 12px 12px", color: t.text, fontSize: 13, fontFamily: "var(--font-dm-mono), monospace", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = user.color; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = t.border; }}
                />
                <button onClick={generate} disabled={aiLoading || !aiPrompt.trim()} style={{
                  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                  background: `linear-gradient(135deg,${user.color},${user.color}bb)`,
                  border: "none", borderRadius: 8, width: 36, height: 30, color: "#fff", fontSize: 14,
                  cursor: aiLoading || !aiPrompt.trim() ? "not-allowed" : "pointer",
                  opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1, transition: "opacity 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {aiLoading ? <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "ob-spin 0.7s linear infinite" }} /> : "→"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
                {hints.map(h => (
                  <button key={h} onClick={() => { setAiPrompt(h); setTimeout(() => inputRef.current?.focus(), 0); }} style={{
                    background: "transparent", border: `1px solid ${t.border}`, borderRadius: 16,
                    padding: "4px 8px", fontSize: 9, color: t.textMuted, cursor: "pointer",
                    fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s", whiteSpace: "nowrap",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = user.color + "55"; (e.currentTarget as HTMLElement).style.color = user.color; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                  >{h}</button>
                ))}
              </div>
              {aiLoading && (
                <div style={{ marginBottom: 16, textAlign: "center" }}>
                  <div style={{ width: 140, height: 140, borderRadius: 16, margin: "0 auto", background: `linear-gradient(90deg, ${t.surface} 25%, ${t.border} 50%, ${t.surface} 75%)`, backgroundSize: "200% 100%", animation: "ob-shimmer 1.4s ease-in-out infinite" }} />
                  <div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 8 }}>// generating your vibe...</div>
                </div>
              )}
              {aiError && <div style={{ color: "#ff5f5f", fontSize: 11, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>⚠ {aiError}</div>}
              {aiImage && !aiLoading && (
                <div style={{ marginBottom: 16, textAlign: "center", animation: "ob-popIn 0.4s ease" }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={aiImage} alt="ai pfp" style={{ width: 140, height: 140, borderRadius: 16, objectFit: "cover", border: `3px solid ${user.color}`, boxShadow: `0 0 30px ${user.color}44` }} />
                    <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: user.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, boxShadow: `0 0 8px ${user.color}` }}>✓</div>
                  </div>
                  <button onClick={generate} style={{ display: "block", margin: "8px auto 0", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 12px", fontSize: 9, color: t.textMuted, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}>↺ regenerate</button>
                </div>
              )}
              {!aiImage && !aiLoading && !aiError && (
                <div style={{ padding: "24px 0", color: t.textDim, fontSize: 11, fontFamily: "var(--font-dm-mono), monospace" }}>// type a vibe above and hit enter</div>
              )}
            </div>
          )}

          {/* Preview */}
          <div style={{ marginBottom: 20, animation: "ob-fadeIn 0.4s ease" }}>
            <div style={{ display: "inline-block", position: "relative" }}>
              <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `2px solid ${user.color}22`, animation: "ob-ringExpand 2.5s ease-out infinite" }} />
              {aiUserAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={aiUserAvatar} alt="selected ai avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${user.color}` }} />
              ) : selAvatar ? (
                <AvatarC user={{ ...user, avatar: selAvatar }} size={64} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${user.color}55, ${user.color}22)`, border: `2px solid ${user.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: user.color }}>{user.name[0]}</div>
              )}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: user.color, marginTop: 8 }}>{user.name}</div>
            <div style={{ fontSize: 9, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{user.role}</div>
          </div>

          <button onClick={confirm} style={{
            background: `linear-gradient(135deg,${user.color},${user.color}cc)`, border: "none", borderRadius: 16,
            padding: "12px 40px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 4px 24px ${user.color}33`,
            textTransform: "lowercase", position: "relative", overflow: "hidden",
          }}>
            <span style={{ position: "relative", zIndex: 1 }}>let&apos;s build →</span>
            <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "ob-scanlineH 2.5s ease-in-out infinite" }} />
          </button>
        </NB>
      </div>
    </div>
  );
}

// ─── AvatarStep6 — legacy export used in Dashboard avatar picker modal ────────

export function AvatarStep6({
  t, user, selAvatar, setSelAvatar, users, setUsers, setCurrentUser, setOnboardStep, selUser, AnimBg, onClose, onConfirm,
}: {
  t: T; user: UserType; selAvatar: string | null; setSelAvatar: (a: string | null) => void;
  users: UserType[]; setUsers: (u: UserType[]) => void; setCurrentUser: (u: string | null) => void;
  setOnboardStep: (s: number) => void; selUser: string | null; AnimBg: () => React.ReactElement;
  onClose?: () => void; onConfirm?: () => void;
}) {
  const [tab, setTab] = useState<"emoji" | "ai">("emoji");
  const [loadedImgs, setLoadedImgs] = useState<Set<string>>(new Set());
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [selAiImg, setSelAiImg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [aiUserAvatar, setAiUserAvatar] = useState<string | null>(null);

  // effectiveAvatar kept for future reference
  const effectiveAvatar = selAiImg ? "__ai__" : (selAvatar || user.avatar);
  void effectiveAvatar;

  const hints = ["cyberpunk hacker with neon glasses", "minimalist geometric logo", "astronaut explorer", "mystical wolf warrior", "zen monk in golden light"];

  async function generate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError(""); setAiImage(null); setSelAiImg(null); setAiUserAvatar(null);
    try {
      const res = await fetch("/api/generate-pfp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt }) });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error === "GENERATION_TIMEOUT" ? "// avatar gen timed out — try again" : data.error || "generation failed");
        return;
      }
      if (data.image) { setAiImage(data.image); setSelAiImg(data.image); setAiUserAvatar(data.image); }
      else setAiError("no image returned — try a different prompt");
    } catch { setAiError("network error"); }
    finally { setAiLoading(false); }
  }

  function confirm() {
    const finalAvatar = selAiImg ? "__ai__" : (selAvatar || user.avatar);
    const updated = users.map(u => u.id === selUser ? { ...u, avatar: finalAvatar, aiAvatar: selAiImg || undefined } : u);
    setUsers(updated as UserType[]);
    setCurrentUser(selUser);
    if (onConfirm) {
      onConfirm();
    } else {
      try { localStorage.removeItem("themePhase"); } catch { /* noop */ }
      setTimeout(() => setOnboardStep(7), 50);
    }
  }

  return (
    <div onClick={() => onClose ? onClose() : setOnboardStep(5)} style={{ position: "fixed", inset: 0, background: t.bg + "ee", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <style>{css}</style>
      <AnimBg />
      <div onClick={e => e.stopPropagation()} className="av-card" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <NB color={user.color} style={{ background: t.bgCard, padding: "20px 20px", maxWidth: 460, width: "94vw", textAlign: "center", animation: "ob-scaleIn 0.4s ease", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: user.color }}>choose your pfp</div>
          <p style={{ fontSize: 10, color: t.textMuted, margin: "4px 0 16px", fontFamily: "var(--font-dm-mono), monospace" }}>// {user.name.toLowerCase()}, pick your persona</p>
          <div style={{ display: "flex", gap: 4, background: t.surface, borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {(["emoji", "ai"] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)} style={{
                flex: 1, padding: "8px 0", borderRadius: 12, border: "none", cursor: "pointer",
                fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 12, fontWeight: 700,
                background: tab === tb ? t.bgCard : "transparent",
                color: tab === tb ? user.color : t.textMuted,
                boxShadow: tab === tb ? `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px ${user.color}22` : "none",
                transition: "all 0.2s",
              }}>{tb === "emoji" ? "✦ pick avatar" : "✦ generate with AI"}</button>
            ))}
          </div>
          {tab === "emoji" && (
            <div className="av-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "0 auto 16px" }}>
              {AVATARS.map((av, idx) => {
                const active = selAvatar === av.id && !selAiImg;
                return (
                  <button key={av.id} onClick={() => { setSelAvatar(av.id); setSelAiImg(null); setAiUserAvatar(null); }} style={{
                    width: "100%", aspectRatio: "1", borderRadius: 16, padding: 0, overflow: "hidden",
                    border: `2px solid ${active ? user.color : t.border}`,
                    cursor: "pointer", transition: "all 0.2s", position: "relative",
                    boxShadow: active ? `0 0 20px ${user.color}44` : "none",
                    transform: active ? "scale(1.07)" : "scale(1)",
                    animation: `ob-scaleIn 0.3s ease ${idx * 0.02}s both`, background: "#111",
                  }}>
                    {!loadedImgs.has(av.id) && (<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${user.color}18`, fontSize: 18, fontWeight: 800, color: user.color, fontFamily: "var(--font-dm-sans), sans-serif" }}>{av.name[0]}</div>)}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={av.img} alt={av.name} onLoad={() => setLoadedImgs(p => new Set([...p, av.id]))} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block", opacity: loadedImgs.has(av.id) ? 1 : 0, transition: "opacity 0.25s", transform: av.zoom && av.zoom !== 1 ? `scale(${av.zoom})` : undefined, transformOrigin: "center 20%" }} />
                    {active && <div style={{ position: "absolute", inset: 0, background: `${user.color}22`, borderRadius: 12 }} />}
                  </button>
                );
              })}
            </div>
          )}
          {tab === "ai" && (
            <div style={{ animation: "ob-fadeIn 0.3s ease" }}>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input ref={inputRef} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="describe your vibe..."
                  style={{ width: "100%", boxSizing: "border-box", background: t.surface, border: `1.5px solid ${t.border}`, borderRadius: 12, padding: "12px 48px 12px 12px", color: t.text, fontSize: 13, fontFamily: "var(--font-dm-mono), monospace", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={e => (e.target.style.borderColor = user.color)} onBlur={e => (e.target.style.borderColor = t.border)}
                />
                <button onClick={generate} disabled={aiLoading || !aiPrompt.trim()} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: `linear-gradient(135deg,${user.color},${user.color}bb)`, border: "none", borderRadius: 8, width: 36, height: 30, color: "#fff", fontSize: 14, cursor: aiLoading || !aiPrompt.trim() ? "not-allowed" : "pointer", opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1, transition: "opacity 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {aiLoading ? <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "ob-spin 0.7s linear infinite" }} /> : "→"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
                {hints.map(h => (
                  <button key={h} onClick={() => { setAiPrompt(h); setTimeout(() => inputRef.current?.focus(), 0); }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 16, padding: "4px 8px", fontSize: 9, color: t.textMuted, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s", whiteSpace: "nowrap" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = user.color + "55"; (e.currentTarget as HTMLElement).style.color = user.color; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                  >{h}</button>
                ))}
              </div>
              {aiLoading && (<div style={{ marginBottom: 16, textAlign: "center" }}><div style={{ width: 140, height: 140, borderRadius: 16, margin: "0 auto", background: `linear-gradient(90deg, ${t.surface} 25%, ${t.border} 50%, ${t.surface} 75%)`, backgroundSize: "200% 100%", animation: "ob-shimmer 1.4s ease-in-out infinite" }} /><div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 8 }}>// generating your vibe...</div></div>)}
              {aiError && <div style={{ color: "#ff5f5f", fontSize: 11, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>⚠ {aiError}</div>}
              {aiImage && !aiLoading && (
                <div style={{ marginBottom: 16, textAlign: "center", animation: "ob-popIn 0.4s ease" }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={aiImage} alt="ai pfp" style={{ width: 140, height: 140, borderRadius: 16, objectFit: "cover", border: `3px solid ${user.color}`, boxShadow: `0 0 30px ${user.color}44` }} />
                    <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: user.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, boxShadow: `0 0 8px ${user.color}` }}>✓</div>
                  </div>
                  <button onClick={generate} style={{ display: "block", margin: "8px auto 0", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 12px", fontSize: 9, color: t.textMuted, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}>↺ regenerate</button>
                </div>
              )}
              {!aiImage && !aiLoading && !aiError && (<div style={{ padding: "24px 0", color: t.textDim, fontSize: 11, fontFamily: "var(--font-dm-mono), monospace" }}>// type a vibe above and hit enter</div>)}
            </div>
          )}
          <div style={{ marginBottom: 20, animation: "ob-fadeIn 0.4s ease" }}>
            <div style={{ display: "inline-block", position: "relative" }}>
              <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `2px solid ${user.color}22`, animation: "ob-ringExpand 2.5s ease-out infinite" }} />
              {aiUserAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={aiUserAvatar} alt="selected ai avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${user.color}` }} />
              ) : selAvatar ? (
                <AvatarC user={{ ...user, avatar: selAvatar }} size={64} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${user.color}55, ${user.color}22)`, border: `2px solid ${user.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: user.color }}>{user.name[0]}</div>
              )}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: user.color, marginTop: 8 }}>{user.name}</div>
            <div style={{ fontSize: 9, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{user.role}</div>
          </div>
          <button onClick={confirm} style={{ background: `linear-gradient(135deg,${user.color},${user.color}cc)`, border: "none", borderRadius: 16, padding: "12px 40px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 4px 24px ${user.color}33`, textTransform: "lowercase", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "relative", zIndex: 1 }}>{onConfirm ? "save avatar →" : "let’s build →"}</span>
            <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "ob-scanlineH 2.5s ease-in-out infinite" }} />
          </button>
        </NB>
      </div>
    </div>
  );
}

// ─── TypedTitle — module-level component (must NOT be defined inside render) ──

function TypedTitle({ title, accentColor, textColor }: { title: string; accentColor: string; textColor: string }) {
  const { displayed, done } = useTypewriter(title, 50, 300);
  return (
    <div style={{ fontSize: 26, fontWeight: 900, color: textColor, textShadow: `0 0 12px ${accentColor}33`, minHeight: 36 }}>
      {displayed}
      <span style={{ color: accentColor, animation: done ? "none" : "ob-typeGlow 0.8s ease infinite", marginLeft: 0 }}>
        {done ? "" : "_"}
      </span>
    </div>
  );
}

// ─── CelebStep — module-level component (must NOT be defined inside render) ───

function CelebStep({
  t, sessionUser, selAvatar, selAiAvatar, totalStages, onComplete, AnimBg,
}: {
  t: T;
  sessionUser: UserType;
  selAvatar: string | null;
  selAiAvatar: string | null;
  totalStages: number;
  onComplete: (opts: { avatar: string | null; aiAvatar: string | null }) => void;
  AnimBg: () => React.ReactElement;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setReady(true), 100); return () => clearTimeout(timer); }, []);

  const firstName = sessionUser.name.split(" ")[0];
  const confettiColors = [sessionUser.color, t.accent, t.green, t.amber, t.cyan];
  const confettiPieces = [...Array(12)].map((_, i) => ({
    color: confettiColors[i % confettiColors.length],
    x: 10 + i * 8,
    delay: i * 0.08,
    size: 6 + (i % 3) * 3,
    rot: i * 30,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <AnimBg />
      {/* Floating confetti */}
      {ready && confettiPieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute", width: p.size, height: p.size,
          background: p.color, borderRadius: i % 3 === 0 ? "50%" : 2,
          left: `${p.x}%`, top: "30%",
          animation: `ob-celebFloat ${2.5 + (i % 3) * 0.4}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
          opacity: 0.6, transform: `rotate(${p.rot}deg)`,
        }} />
      ))}

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420, width: "90%", animation: ready ? "ob-celebPop 0.6s cubic-bezier(0.2,0.8,0.3,1.2) both" : "none" }}>
        {/* Avatar */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
          <div style={{ position: "absolute", inset: -12, borderRadius: "50%", border: `2px solid ${sessionUser.color}33`, animation: "ob-ringExpand 2s ease-out infinite" }} />
          <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `1px solid ${sessionUser.color}22`, animation: "ob-ringExpand 2s ease-out 0.7s infinite" }} />
          {selAiAvatar
            ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selAiAvatar} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `2px solid ${sessionUser.color}` }} />
            )
            : <AvatarC user={{ ...sessionUser, avatar: selAvatar || sessionUser.avatar || "" }} size={80} />
          }
        </div>

        {/* Headline */}
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: t.text, marginBottom: 4 }}>
          gm, {firstName}.
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: sessionUser.color, textShadow: `0 0 30px ${sessionUser.color}44`, marginBottom: 16 }}>
          the deck is yours.
        </div>

        {/* Role tag */}
        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 24, letterSpacing: "0.3px" }}>
          // {sessionUser.role} · session live · {totalStages} stages on the board
        </div>

        {/* Stat chips */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { label: "pipelines", value: pipelineData.length },
            { label: "stages", value: totalStages },
            { label: "AI tools", value: 45 },
          ].map(chip => (
            <div key={chip.label} style={{
              background: sessionUser.color + "12", border: `1px solid ${sessionUser.color}25`,
              borderRadius: 16, padding: "4px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: sessionUser.color, fontFamily: "var(--font-dm-mono), monospace" }}>{chip.value}</div>
              <div style={{ fontSize: 8, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>{chip.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={() => onComplete({ avatar: selAvatar, aiAvatar: selAiAvatar })} style={{
          width: "100%", height: 52, borderRadius: 16, border: "none",
          background: `linear-gradient(135deg, ${sessionUser.color}, ${sessionUser.color}cc)`,
          color: "#fff", fontSize: 15, fontWeight: 800,
          letterSpacing: "0.3px", textTransform: "lowercase",
          cursor: "pointer", boxShadow: `0 4px 24px ${sessionUser.color}33`,
          position: "relative", overflow: "hidden", transition: "transform 0.15s, box-shadow 0.15s",
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 32px ${sessionUser.color}55`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px ${sessionUser.color}33`; }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>
            {t.themeId === "warroom" ? "enter the war room →" : t.themeId === "lab" ? "enter the lab →" : t.themeId === "engine" ? "start the engine →" : "enter the nerve center →"}
          </span>
          <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "ob-scanlineH 2.5s ease-in-out infinite" }} />
        </button>

        <div style={{ marginTop: 12, fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 1 }}>esc · skip</div>
      </div>
    </div>
  );
}

// ─── Props for the main Onboarding component ──────────────────────────────────

export interface OnboardingProps {
  /** Authenticated user from the session — identity is known, no picker needed */
  sessionUser: UserType;
  t: T;
  themeId: string;
  setThemeId: (id: string) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  /** Called when onboarding completes (user clicked final CTA or skipped through) */
  onComplete: (opts: { avatar: string | null; aiAvatar: string | null }) => void;
}

// ─── Main Onboarding flow ─────────────────────────────────────────────────────

export default function Onboarding({
  sessionUser, t, themeId, setThemeId, isDark, setIsDark, onComplete,
}: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [themePhase, setThemePhase] = useState<"theme" | "mode">("theme");
  const [selAvatar, setSelAvatar] = useState<string | null>(sessionUser.avatar || null);
  const [selAiAvatar, setSelAiAvatar] = useState<string | null>(sessionUser.aiAvatar || null);

  const totalStages = pipelineData.reduce((s, p) => s + p.stages.length, 0);
  const firstName = sessionUser.name.split(" ")[0];

  const AnimBg = () => (
    <FloatingBg colors={[t.accent, t.purple || t.accent, t.green, t.amber]} themeStyle={themeId} />
  );

  // === STEP 0: THEME PICKER ===
  if (step === 0) {
    const sel = THEME_OPTIONS.find(x => x.id === themeId) || THEME_OPTIONS[0];

    // Phase 2: dark / light
    if (themePhase === "mode") {
      return (
        <div style={{ position: "fixed", inset: 0, background: t.bg, overflowY: "auto", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif", transition: "background 0.5s" }}>
          <style>{css}</style>
          <AnimBg />
          <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
            <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 440, width: "92%", animation: "ob-scaleIn 0.5s ease" }}>
              <div style={{ fontSize: 11, letterSpacing: 6, color: t.accent + "66", textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>{sel.icon} {sel.name}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: t.text, letterSpacing: -1, lineHeight: 1.1, marginBottom: 4 }}>
                set the <span style={{ color: t.accent, textShadow: `0 0 24px ${t.accent}33` }}>vibe</span>
              </div>
              <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 32px", fontFamily: "var(--font-dm-mono), monospace" }}>// gm, {firstName.toLowerCase()} — how do you want your {sel.name.toLowerCase()}?</p>

              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32 }}>
                {([
                  { dark: false, icon: "☀️", label: "lights on", sub: "clean & sharp", hint: "daytime clarity" },
                  { dark: true, icon: "🌚", label: "lights off", sub: "shadows & neon", hint: "late night ops" },
                ] as const).map(opt => {
                  const active = isDark === opt.dark;
                  return (
                    <button key={String(opt.dark)} onClick={() => setIsDark(opt.dark)} style={{
                      flex: "1 1 0", maxWidth: 200,
                      background: active ? t.bgCard : t.surface + "44",
                      border: `2px solid ${active ? t.accent : t.border}`, borderRadius: 16,
                      padding: "24px 12px", cursor: "pointer", textAlign: "center",
                      transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)", fontFamily: "inherit",
                      boxShadow: active ? `0 0 40px ${t.accent}22, inset 0 0 30px ${t.accent}08` : "none",
                      transform: active ? "scale(1.05)" : "scale(0.97)", position: "relative", overflow: "hidden",
                    }}>
                      {active && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 120%, ${t.accent}15, transparent 70%)` }} />}
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ fontSize: 36, marginBottom: 8, filter: active ? `drop-shadow(0 0 12px ${t.accent}44)` : "none", transition: "filter 0.3s" }}>{opt.icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: active ? t.accent : t.textMuted, transition: "color 0.3s", letterSpacing: 0.3 }}>{opt.label}</div>
                        <div style={{ fontSize: 9, color: active ? t.textSec : t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>// {opt.sub}</div>
                        <div style={{ fontSize: 8, color: t.textDim, marginTop: 4, fontStyle: "italic" }}>{opt.hint}</div>
                      </div>
                      {active && <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: t.accent, boxShadow: `0 0 8px ${t.accent}` }} />}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                <button onClick={() => setThemePhase("theme")} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 16, padding: "12px 24px", color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}>← back</button>
                <button onClick={() => setStep(1)} style={{
                  background: `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`,
                  border: "none", borderRadius: 16, padding: "12px 40px", color: "#fff", fontSize: 14, fontWeight: 800,
                  cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif",
                  boxShadow: `0 4px 24px ${t.accent}33`, textTransform: "lowercase", position: "relative", overflow: "hidden",
                }}>
                  <span style={{ position: "relative", zIndex: 1 }}>let&apos;s go →</span>
                  <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "ob-scanlineH 3s ease-in-out infinite" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Phase 1: pick theme style
    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, overflowY: "auto", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <FloatingBg colors={[sel.color, sel.color + "88", "#ffffff08", sel.color + "44"]} themeStyle={themeId} />
        <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 520, width: "92%", animation: "ob-slideUp 0.6s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: 6, color: sel.color + "66", textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>binayah.ai</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: t.text, letterSpacing: -1.5, lineHeight: 1.1 }}>
              gm, {firstName.toLowerCase()}.<br />
              <span style={{ color: sel.color, textShadow: `0 0 30px ${sel.color}44, 0 0 60px ${sel.color}22`, transition: "color 0.3s, text-shadow 0.3s" }}>pick your command center</span>
            </div>
            <p style={{ fontSize: 11, color: t.textMuted, margin: "8px 0 32px", fontFamily: "var(--font-dm-mono), monospace" }}>// {sel.desc.toLowerCase()}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {THEME_OPTIONS.map((th, idx) => {
                const active = themeId === th.id;
                return (
                  <button key={th.id} onClick={() => setThemeId(th.id)} style={{
                    background: active ? th.bg : t.bgCard, border: `2px solid ${active ? th.color : t.border}`,
                    borderRadius: 16, padding: "16px 12px", cursor: "pointer", textAlign: "center",
                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", fontFamily: "inherit", position: "relative", overflow: "hidden",
                    boxShadow: active ? `0 0 40px ${th.color}15, inset 0 0 40px ${th.color}08` : "0 2px 8px rgba(0,0,0,0.3)",
                    transform: active ? "scale(1.02)" : "scale(1)", animation: `ob-scaleIn 0.4s ease ${idx * 0.08}s both`,
                  }}>
                    {active && <>
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 120%, ${th.color}18, transparent 70%)` }} />
                      <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: th.color, boxShadow: `0 0 8px ${th.color}` }} />
                    </>}
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div style={{ fontSize: 32, marginBottom: 4, filter: active ? `drop-shadow(0 0 8px ${th.color}44)` : "none", transition: "filter 0.3s" }}>{th.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: active ? th.color : t.textMuted, transition: "color 0.3s", letterSpacing: -0.3 }}>{th.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 20, margin: "24px 0 20px" }}>
              {[{ l: "pipelines", v: pipelineData.length }, { l: "stages", v: totalStages }, { l: "AI tools", v: "45" }].map((s, i) => (
                <div key={s.l} style={{ textAlign: "center", animation: `ob-countUp 0.5s ease ${0.3 + i * 0.1}s both` }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: sel.color, fontFamily: "var(--font-dm-mono), monospace" }}>{s.v}</div>
                  <div style={{ fontSize: 8, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>{s.l}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setThemePhase("mode")} style={{
              background: `linear-gradient(135deg, ${sel.color}, ${sel.color}aa)`,
              border: "none", borderRadius: 16, padding: "16px 48px", color: "#fff", fontSize: 15, fontWeight: 800,
              cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif",
              boxShadow: `0 4px 30px ${sel.color}33, 0 0 60px ${sel.color}11`,
              letterSpacing: 0.5, textTransform: "lowercase", transition: "all 0.3s", position: "relative", overflow: "hidden",
            }}>
              <span style={{ position: "relative", zIndex: 1 }}>lock in {sel.name.toLowerCase()} →</span>
              <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "ob-scanlineH 3s ease-in-out infinite" }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === STEPS 1-4: ONBOARDING INTRO CARDS ===
  if (step >= 1 && step <= 4) {
    const card = ONBOARDING[step - 1];

    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <AnimBg />
        {/* Step counter */}
        <div style={{ position: "absolute", top: 30, left: 30, zIndex: 2, animation: "ob-fadeIn 0.5s ease" }}>
          <span style={{ fontSize: 11, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>0{step}/04</span>
        </div>
        {/* Personalisation tag */}
        <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", zIndex: 2, animation: "ob-fadeIn 0.5s ease 0.2s both" }}>
          <span style={{ fontSize: 9, color: sessionUser.color, background: sessionUser.color + "15", border: `1px solid ${sessionUser.color}30`, borderRadius: 16, padding: "4px 8px", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>
            // {firstName.toLowerCase()} · {sessionUser.role}
          </span>
        </div>
        {/* Skip */}
        <button onClick={() => setStep(5)} style={{ position: "absolute", top: 28, right: 30, zIndex: 2, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 12px", fontSize: 9, color: t.textMuted, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}>skip →</button>

        <NB color={t.accent} style={{ background: t.bgCard, padding: "40px 32px", maxWidth: 440, width: "90%", textAlign: "center", animation: "ob-scaleIn 0.5s ease", position: "relative", zIndex: 1, overflow: "hidden" }}>
          {/* Ring pulse behind icon */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: `2px solid ${t.accent}22`, animation: "ob-ringExpand 2s ease-out infinite" }} />
            <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `1px solid ${t.accent}11`, animation: "ob-ringExpand 2s ease-out 0.5s infinite" }} />
            <div style={{ fontSize: 56, position: "relative", filter: `drop-shadow(0 0 20px ${t.accent}33)` }}>{card.icon}</div>
          </div>

          <TypedTitle title={card.title} accentColor={t.accent} textColor={t.text} />
          <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.7, margin: "12px 0 4px", animation: "ob-fadeIn 0.6s ease 0.5s both" }}>{card.desc}</p>
          <p style={{ fontSize: 10, color: t.accent + "77", fontFamily: "var(--font-dm-mono), monospace", margin: "0 0 24px", animation: "ob-fadeIn 0.6s ease 0.7s both" }}>{card.sub}</p>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24, justifyContent: "center" }}>
            {ONBOARDING.map((_, i) => (
              <div key={i} style={{
                height: 3, borderRadius: 2, transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                width: i === (step - 1) ? 32 : i < (step - 1) ? 12 : 8,
                background: i <= (step - 1) ? t.accent : t.surface,
                boxShadow: i === (step - 1) ? `0 0 8px ${t.accent}66` : "none",
              }} />
            ))}
          </div>

          <button onClick={() => setStep(step + 1)} style={{
            background: `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`, border: "none", borderRadius: 16,
            padding: "12px 40px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
            fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 4px 24px ${t.accent}33`,
            textTransform: "lowercase", transition: "all 0.3s", letterSpacing: 0.3,
          }}>
            {step < 4 ? "next →" : "pick your look →"}
          </button>
        </NB>
      </div>
    );
  }

  // === STEP 5: AVATAR PICK ===
  if (step === 5) {
    return (
      <>
        <style>{css}</style>
        <AvatarStep
          t={t}
          user={sessionUser}
          selAvatar={selAvatar}
          setSelAvatar={setSelAvatar}
          AnimBg={AnimBg}
          onComplete={opts => {
            // Save selection into local state, then proceed to celebration
            if (opts.avatar) setSelAvatar(opts.avatar);
            if (opts.aiAvatar) setSelAiAvatar(opts.aiAvatar);
            setStep(6);
          }}
        />
      </>
    );
  }

  // === STEP 6: CELEBRATION / "YOU'RE IN" ===
  if (step === 6) {
    return (
      <>
        <style>{css}</style>
        <CelebStep
          t={t}
          sessionUser={sessionUser}
          selAvatar={selAvatar}
          selAiAvatar={selAiAvatar}
          totalStages={totalStages}
          onComplete={onComplete}
          AnimBg={AnimBg}
        />
      </>
    );
  }

  return null;
}
