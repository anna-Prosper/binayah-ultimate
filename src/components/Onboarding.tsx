"use client";

/**
 * Onboarding.tsx — primitives only.
 *
 * The 7-step onboarding flow has been removed (replaced by WelcomeModal).
 * This file is kept as a thin re-export of the two primitives that are
 * still used elsewhere in the app:
 *
 *   FloatingBg  — animated background, used in Dashboard avatar picker
 *                 and WelcomeModal backdrop
 *   AvatarStep6 — avatar picker step, used in Dashboard avatar picker modal
 *
 * Do NOT add multi-step flow logic back here.
 */

import React, { useState, useRef } from "react";
import { AVATARS, type UserType } from "@/lib/data";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { NB } from "@/components/ui/primitives";

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
      {shapes.grid && <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03 }}><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth="0.5" /></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>}
      {shapes.scanline && <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,#ffffff08,transparent)", animation: "scanline 8s linear infinite" }} />}
      {shapes.rings && cs.map((c: string, i: number) => (<div key={`ring-${i}`} style={{ position: "absolute", left: "50%", top: "50%", width: 300 + i * 120, height: 300 + i * 120, marginLeft: -(150 + i * 60), marginTop: -(150 + i * 60), borderRadius: "50%", border: `1px solid ${c}08`, animation: `orbit ${30 + i * 15}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }}><div style={{ position: "absolute", top: -2, left: "50%", width: 4, height: 4, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}66`, opacity: 0.5 }} /></div>))}
      {shapes.dna && [...Array(10)].map((_: unknown, i: number) => (<div key={`dna-${i}`} style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", border: `1px solid ${cs[i % 2 === 0 ? 0 : 1]}22`, left: `${45 + Math.sin(i * 0.6) * 8}%`, top: `${5 + i * 9}%`, animation: `float ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * -0.2}s`, opacity: 0.3 }} />))}
      {shapes.gears && [...Array(3)].map((_: unknown, i: number) => (<svg key={`gear-${i}`} style={{ position: "absolute", left: `${10 + i * 35}%`, top: `${15 + i * 25}%`, width: 60 + i * 20, height: 60 + i * 20, opacity: 0.04, animation: `orbit ${20 + i * 10}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }} viewBox="0 0 100 100"><path d="M50 10 L55 25 L65 15 L60 30 L75 25 L65 35 L80 40 L65 45 L75 55 L60 50 L65 65 L55 55 L50 70 L45 55 L35 65 L40 50 L25 55 L35 45 L20 40 L35 35 L25 25 L40 30 L35 15 L45 25 Z" fill="#fff" /><circle cx="50" cy="40" r="12" fill="none" stroke="#fff" strokeWidth="3" /></svg>))}
      {shapes.waves && [...Array(3)].map((_: unknown, i: number) => (<div key={`wave-${i}`} style={{ position: "absolute", left: "-10%", right: "-10%", top: `${30 + i * 20}%`, height: 1, background: `linear-gradient(90deg,transparent,${cs[i % cs.length]}06,transparent)`, animation: `float ${4 + i}s ease-in-out infinite`, animationDelay: `${i * -0.8}s` }} />))}
      {[...Array(16)].map((_: unknown, i: number) => (<div key={`p-${i}`} style={{ position: "absolute", width: shapes.particles === "sparks" ? 1 : shapes.particles === "hexagons" ? 4 : 2, height: shapes.particles === "sparks" ? 8 + i % 5 : shapes.particles === "hexagons" ? 4 : 2, borderRadius: shapes.particles === "hexagons" ? "1px" : "50%", background: cs[i % cs.length], opacity: 0.08 + ((i % 5) * 0.03), left: `${5 + i * 6}%`, top: `${8 + (i * 17) % 80}%`, animation: `float ${3 + i * 0.7}s ease-in-out infinite`, animationDelay: `${i * -0.4}s` }} />))}
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle,${shapes.cornerGlow[0]}08,transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 350, height: 350, borderRadius: "50%", background: `radial-gradient(circle,${shapes.cornerGlow[1]}08,transparent 70%)` }} />
    </div>
  );
};

// ─── Avatar picker step (legacy export — still used in Dashboard avatar picker modal) ──

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

  const effectiveAvatar = selAiImg ? "__ai__" : (selAvatar || user.avatar);
  const [aiUserAvatar, setAiUserAvatar] = useState<string | null>(null);

  // effectiveAvatar kept for future reference but not used in render directly
  void effectiveAvatar;

  async function generate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError(""); setAiImage(null); setSelAiImg(null); setAiUserAvatar(null);
    try {
      const res = await fetch("/api/generate-pfp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "GENERATION_TIMEOUT") {
          setAiError("// avatar gen timed out — try again");
        } else {
          setAiError(data.error || "generation failed");
        }
        return;
      }
      if (data.image) { setAiImage(data.image); setSelAiImg(data.image); setAiUserAvatar(data.image); }
      else setAiError("no image returned — try a different prompt");
    } catch {
      setAiError("network error");
    } finally {
      setAiLoading(false);
    }
  }

  function confirm() {
    const finalAvatar = selAiImg ? "__ai__" : (selAvatar || user.avatar);
    const updated = users.map(u =>
      u.id === selUser
        ? { ...u, avatar: finalAvatar, aiAvatar: selAiImg || undefined }
        : u
    );
    setUsers(updated as UserType[]);
    setCurrentUser(selUser);
    if (onConfirm) {
      onConfirm();
    } else {
      try { localStorage.removeItem("themePhase"); } catch { /* noop */ }
      setTimeout(() => setOnboardStep(7), 50);
    }
  }

  const hints = ["cyberpunk hacker with neon glasses", "minimalist geometric logo", "astronaut explorer", "mystical wolf warrior", "zen monk in golden light"];

  return (
    <div onClick={() => onClose ? onClose() : setOnboardStep(5)} style={{ position: "fixed", inset: 0, background: t.bg + "ee", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes popIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
        @media(min-width:600px){.av-grid{grid-template-columns:repeat(5,1fr)!important;gap:6px!important}.av-card{max-height:88vh;overflow-y:hidden!important}}
      `}</style>
      <AnimBg />
      <div onClick={e => e.stopPropagation()} className="av-card" style={{ maxHeight: "90vh", overflowY: "auto" }}>
      <NB color={user.color} style={{ background: t.bgCard, padding: "22px 20px", maxWidth: 460, width: "94vw", textAlign: "center", animation: "scaleIn 0.4s ease", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: user.color }}>choose your pfp</div>
        <p style={{ fontSize: 10, color: t.textMuted, margin: "4px 0 16px", fontFamily: "var(--font-dm-mono), monospace" }}>// {user.name.toLowerCase()}, pick your persona</p>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, background: t.surface, borderRadius: 12, padding: 3, marginBottom: 18 }}>
          {(["emoji", "ai"] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer",
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

        {/* IMAGE AVATAR TAB */}
        {tab === "emoji" && (
          <div className="av-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "0 auto 16px" }}>
            {AVATARS.map((av, idx) => {
              const active = selAvatar === av.id && !selAiImg;
              return (
                <button key={av.id} onClick={() => { setSelAvatar(av.id); setSelAiImg(null); setAiUserAvatar(null); }} style={{
                  width: "100%", aspectRatio: "1", borderRadius: 14, padding: 0, overflow: "hidden",
                  border: `2px solid ${active ? user.color : t.border}`,
                  cursor: "pointer", transition: "all 0.2s", position: "relative",
                  boxShadow: active ? `0 0 20px ${user.color}44` : "none",
                  transform: active ? "scale(1.07)" : "scale(1)",
                  animation: `scaleIn 0.3s ease ${idx * 0.02}s both`,
                  background: "#111",
                }}>
                  {!loadedImgs.has(av.id) && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${user.color}18`, fontSize: 18, fontWeight: 800, color: user.color, fontFamily: "var(--font-dm-sans), sans-serif" }}>
                      {av.name[0]}
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={av.img} alt={av.name} onLoad={() => setLoadedImgs(p => new Set([...p, av.id]))} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block", opacity: loadedImgs.has(av.id) ? 1 : 0, transition: "opacity 0.25s", transform: av.zoom && av.zoom !== 1 ? `scale(${av.zoom})` : undefined, transformOrigin: "center 20%" }} />
                  {active && <div style={{ position: "absolute", inset: 0, background: `${user.color}22`, borderRadius: 12 }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* AI TAB */}
        {tab === "ai" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Prompt input */}
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
                onFocus={e => (e.target.style.borderColor = user.color)}
                onBlur={e => (e.target.style.borderColor = t.border)}
              />
              <button onClick={generate} disabled={aiLoading || !aiPrompt.trim()} style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: `linear-gradient(135deg,${user.color},${user.color}bb)`,
                border: "none", borderRadius: 8, width: 36, height: 30,
                color: "#fff", fontSize: 14, cursor: aiLoading || !aiPrompt.trim() ? "not-allowed" : "pointer",
                opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1, transition: "opacity 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {aiLoading ? <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : "→"}
              </button>
            </div>

            {/* Hint chips */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
              {hints.map(h => (
                <button key={h} onClick={() => { setAiPrompt(h); setTimeout(() => inputRef.current?.focus(), 0); }} style={{
                  background: "transparent", border: `1px solid ${t.border}`, borderRadius: 20,
                  padding: "3px 10px", fontSize: 9, color: t.textMuted, cursor: "pointer",
                  fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = user.color + "55"; (e.currentTarget as HTMLElement).style.color = user.color; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                >{h}</button>
              ))}
            </div>

            {/* Loading shimmer */}
            {aiLoading && (
              <div style={{ marginBottom: 16, textAlign: "center" }}>
                <div style={{
                  width: 140, height: 140, borderRadius: 20, margin: "0 auto",
                  background: `linear-gradient(90deg, ${t.surface} 25%, ${t.border} 50%, ${t.surface} 75%)`,
                  backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite",
                }} />
                <div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 10 }}>// generating your vibe...</div>
              </div>
            )}

            {/* Error */}
            {aiError && <div style={{ color: "#ff5f5f", fontSize: 11, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>⚠ {aiError}</div>}

            {/* Generated image */}
            {aiImage && !aiLoading && (
              <div style={{ marginBottom: 16, textAlign: "center", animation: "popIn 0.4s ease" }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aiImage} alt="ai pfp" style={{ width: 140, height: 140, borderRadius: 20, objectFit: "cover", border: `3px solid ${user.color}`, boxShadow: `0 0 30px ${user.color}44` }} />
                  <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: user.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, boxShadow: `0 0 8px ${user.color}` }}>✓</div>
                </div>
                <button onClick={generate} style={{ display: "block", margin: "8px auto 0", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 14px", fontSize: 9, color: t.textMuted, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}>↺ regenerate</button>
              </div>
            )}

            {!aiImage && !aiLoading && !aiError && (
              <div style={{ padding: "24px 0", color: t.textDim, fontSize: 11, fontFamily: "var(--font-dm-mono), monospace" }}>
                // type a vibe above and hit enter
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        <div style={{ marginBottom: 20, animation: "fadeIn 0.4s ease" }}>
          <div style={{ display: "inline-block", position: "relative" }}>
            <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `2px solid ${user.color}22`, animation: "ringExpand 2.5s ease-out infinite" }} />
            {aiUserAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aiUserAvatar} alt="selected ai avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${user.color}` }} />
            ) : selAvatar ? (
              <AvatarC user={{ ...user, avatar: selAvatar }} size={64} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${user.color}55, ${user.color}22)`, border: `2px solid ${user.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: user.color }}>{user.name[0]}</div>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: user.color, marginTop: 10 }}>{user.name}</div>
          <div style={{ fontSize: 9, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{user.role}</div>
        </div>

        <button onClick={confirm} style={{
          background: `linear-gradient(135deg,${user.color},${user.color}cc)`, border: "none", borderRadius: 14,
          padding: "12px 40px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
          fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 4px 24px ${user.color}33`,
          textTransform: "lowercase", position: "relative", overflow: "hidden",
        }}>
          <span style={{ position: "relative", zIndex: 1 }}>{onConfirm ? "save avatar →" : "let’s build →"}</span>
          <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "scanline 2.5s ease-in-out infinite" }} />
        </button>
      </NB>
      </div>
    </div>
  );
}

// ─── Default export (stub — no longer used but kept for import safety) ────────

/**
 * @deprecated The 7-step onboarding flow is removed. This stub exists only to
 * avoid import errors during the migration period. It renders nothing.
 */
export default function Onboarding(): null {
  return null;
}
