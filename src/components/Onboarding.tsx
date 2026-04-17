"use client";

import React, { useState, useEffect, useRef } from "react";
import { ONBOARDING, AVATARS, pipelineData, type UserType } from "@/lib/data";
import { T, THEME_OPTIONS } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { NB } from "@/components/ui/primitives";

// ─── AI Avatar Step ───────────────────────────────────────────────────────────
function AvatarStep6({
  t, user, selAvatar, setSelAvatar, users, setUsers, setCurrentUser, setOnboardStep, selUser, AnimBg,
}: {
  t: T; user: UserType; selAvatar: string | null; setSelAvatar: (a: string | null) => void;
  users: UserType[]; setUsers: (u: UserType[]) => void; setCurrentUser: (u: string | null) => void;
  setOnboardStep: (s: number) => void; selUser: string | null; AnimBg: () => React.ReactElement;
}) {
  const [tab, setTab] = useState<"emoji" | "ai">("emoji");
  const [loadedImgs, setLoadedImgs] = useState<Set<string>>(new Set());
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [selAiImg, setSelAiImg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If user picked an AI image, use that as the "avatar" (data URL stored in user)
  const effectiveAvatar = selAiImg ? "__ai__" : (selAvatar || user.avatar);
  const [aiUserAvatar, setAiUserAvatar] = useState<string | null>(null); // data URL for preview

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
      if (!res.ok) { setAiError(data.error || "generation failed"); return; }
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
    try { localStorage.removeItem("themePhase"); } catch { /* noop */ }
    setTimeout(() => setOnboardStep(7), 50);
  }

  const hints = ["cyberpunk hacker with neon glasses", "minimalist geometric logo", "astronaut explorer", "mystical wolf warrior", "zen monk in golden light"];

  return (
    <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes popIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
      `}</style>
      <AnimBg />
      <NB color={user.color} style={{ background: t.bgCard, padding: "28px 24px", maxWidth: 460, width: "94%", textAlign: "center", animation: "scaleIn 0.4s ease", position: "relative", zIndex: 1, maxHeight: "90vh", overflowY: "auto" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "0 auto 20px" }}>
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
                  <img src={av.img} alt={av.name} onLoad={() => setLoadedImgs(p => new Set([...p, av.id]))} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block", opacity: loadedImgs.has(av.id) ? 1 : 0, transition: "opacity 0.25s" }} />
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
            ) : (
              <AvatarC user={{ ...user, avatar: selAvatar || user.avatar }} size={64} />
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: user.color, marginTop: 10 }}>{user.name}</div>
          <div style={{ fontSize: 9, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{user.role}</div>
        </div>

        <button onClick={confirm} style={{
          background: `linear-gradient(135deg,${user.color},${user.color}cc)`, border: "none", borderRadius: 14,
          padding: "14px 44px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
          fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 4px 24px ${user.color}33`,
          textTransform: "lowercase", position: "relative", overflow: "hidden",
        }}>
          <span style={{ position: "relative", zIndex: 1 }}>let&apos;s build →</span>
          <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "scanline 2.5s ease-in-out infinite" }} />
        </button>
      </NB>
    </div>
  );
}

interface OnboardingProps {
  t: T;
  themeId: string;
  setThemeId: (id: string) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  onboardStep: number;
  setOnboardStep: (step: number) => void;
  users: UserType[];
  selUser: string | null;
  setSelUser: (u: string | null) => void;
  selAvatar: string | null;
  setSelAvatar: (a: string | null) => void;
  setCurrentUser: (u: string | null) => void;
  setUsers: (users: UserType[]) => void;
}

const css = `
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
@keyframes orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes scanline{0%{top:-10%}100%{top:110%}}
@keyframes glitch{0%,100%{transform:translate(0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1px,2px)}80%{transform:translate(1px,-2px)}}
@keyframes typeGlow{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes borderPulse{0%,100%{border-color:var(--c)}50%{border-color:transparent}}
@keyframes ringExpand{from{transform:scale(0.5);opacity:0.6}to{transform:scale(2.5);opacity:0}}
@keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
`;

// Typewriter hook
function useTypewriter(text: string, speed = 35, delay = 200) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    const timeout = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) { clearInterval(iv); setDone(true); } }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return { displayed, done };
}

// Animated background
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

export default function Onboarding({ t, themeId, setThemeId, isDark, setIsDark, onboardStep, setOnboardStep, users, selUser, setSelUser, selAvatar, setSelAvatar, setCurrentUser, setUsers }: OnboardingProps) {
  const AnimBg = () => (<FloatingBg colors={[t.accent, t.purple || t.accent, t.green, t.amber]} themeStyle={themeId} />);
  const totalStages = pipelineData.reduce((s, p) => s + p.stages.length, 0);
  const [themePhase, setThemePhase] = useState<"theme" | "mode">(() => {
    try { return (localStorage.getItem("themePhase") as "theme" | "mode") || "theme"; } catch { return "theme"; }
  });
  const advancePhase = (phase: "theme" | "mode") => {
    setThemePhase(phase);
    try { localStorage.setItem("themePhase", phase); } catch { /* noop */ }
  };

  // === STEP 0: THEME PICKER (two phases) ===
  if (onboardStep === 0) {
    const sel = THEME_OPTIONS.find(x => x.id === themeId) || THEME_OPTIONS[0];

    // Phase 1: pick theme style
    if (themePhase === "theme") {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#030308", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
          <style>{css}</style>
          <FloatingBg colors={[sel.color, sel.color + "88", "#ffffff08", sel.color + "44"]} themeStyle={themeId} />

          <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 520, width: "92%", animation: "slideUp 0.6s ease" }}>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <div style={{ fontSize: 11, letterSpacing: 6, color: sel.color + "66", textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>binayah.ai</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#f0f0f0", letterSpacing: -1.5, lineHeight: 1.1 }}>
                pick your<br /><span style={{ color: sel.color, textShadow: `0 0 30px ${sel.color}44, 0 0 60px ${sel.color}22`, transition: "color 0.3s, text-shadow 0.3s" }}>command center</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#555", margin: "8px 0 30px", fontFamily: "var(--font-dm-mono), monospace" }}>// {sel.desc.toLowerCase()}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {THEME_OPTIONS.map((th, idx) => {
                const active = themeId === th.id;
                return (
                  <button key={th.id} onClick={() => setThemeId(th.id)} style={{
                    background: active ? th.bg : "#0a0a10", border: `2px solid ${active ? th.color : "#1a1a22"}`,
                    borderRadius: 18, padding: "18px 12px", cursor: "pointer", textAlign: "center",
                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", fontFamily: "inherit", position: "relative", overflow: "hidden",
                    boxShadow: active ? `0 0 40px ${th.color}15, inset 0 0 40px ${th.color}08` : "0 2px 8px rgba(0,0,0,0.3)",
                    transform: active ? "scale(1.02)" : "scale(1)",
                    animation: `scaleIn 0.4s ease ${idx * 0.08}s both`,
                  }}>
                    {active && <>
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 120%, ${th.color}18, transparent 70%)` }} />
                      <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: th.color, boxShadow: `0 0 8px ${th.color}` }} />
                    </>}
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div style={{ fontSize: 32, marginBottom: 6, filter: active ? `drop-shadow(0 0 8px ${th.color}44)` : "none", transition: "filter 0.3s" }}>{th.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: active ? th.color : "#666", transition: "color 0.3s", letterSpacing: -0.3 }}>{th.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 20, margin: "24px 0 20px" }}>
              {[{ l: "pipelines", v: pipelineData.length }, { l: "stages", v: totalStages }, { l: "AI tools", v: "45" }].map((s, i) => (
                <div key={s.l} style={{ textAlign: "center", animation: `countUp 0.5s ease ${0.3 + i * 0.1}s both` }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: sel.color, fontFamily: "var(--font-dm-mono), monospace" }}>{s.v}</div>
                  <div style={{ fontSize: 8, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>{s.l}</div>
                </div>
              ))}
            </div>

            <button onClick={() => advancePhase("mode")} style={{
              background: `linear-gradient(135deg, ${sel.color}, ${sel.color}aa)`,
              border: "none", borderRadius: 16, padding: "16px 52px", color: "#fff", fontSize: 15, fontWeight: 800,
              cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif",
              boxShadow: `0 4px 30px ${sel.color}33, 0 0 60px ${sel.color}11`,
              letterSpacing: 0.5, textTransform: "lowercase", transition: "all 0.3s",
              position: "relative", overflow: "hidden",
            }}>
              <span style={{ position: "relative", zIndex: 1 }}>lock in {sel.name.toLowerCase()} →</span>
              <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "scanline 3s ease-in-out infinite" }} />
            </button>
          </div>
        </div>
      );
    }

    // Phase 2: dark or light — theme is already applied as background
    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif", transition: "background 0.5s" }}>
        <style>{css}</style>
        <AnimBg />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 440, width: "92%", animation: "scaleIn 0.5s ease" }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: t.accent + "66", textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>{sel.icon} {sel.name}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: t.text, letterSpacing: -1, lineHeight: 1.1, marginBottom: 6 }}>
            set the <span style={{ color: t.accent, textShadow: `0 0 24px ${t.accent}33` }}>vibe</span>
          </div>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 32px", fontFamily: "var(--font-dm-mono), monospace" }}>// how do you want your {sel.name.toLowerCase()}?</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32 }}>
            {([
              { dark: true, icon: "\uD83C\uDF1A", label: "lights off", sub: "shadows & neon", hint: "late night ops" },
              { dark: false, icon: "\u2600\uFE0F", label: "lights on", sub: "clean & sharp", hint: "daytime clarity" },
            ] as const).map(opt => {
              const active = isDark === opt.dark;
              return (
                <button key={String(opt.dark)} onClick={() => setIsDark(opt.dark)} style={{
                  flex: "1 1 0", maxWidth: 200,
                  background: active ? t.bgCard : t.surface + "44",
                  border: `2px solid ${active ? t.accent : t.border}`, borderRadius: 18,
                  padding: "24px 14px", cursor: "pointer", textAlign: "center",
                  transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)", fontFamily: "inherit",
                  boxShadow: active ? `0 0 40px ${t.accent}22, inset 0 0 30px ${t.accent}08` : "none",
                  transform: active ? "scale(1.05)" : "scale(0.97)",
                  position: "relative", overflow: "hidden",
                }}>
                  {active && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 120%, ${t.accent}15, transparent 70%)` }} />}
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 36, marginBottom: 8, filter: active ? `drop-shadow(0 0 12px ${t.accent}44)` : "none", transition: "filter 0.3s" }}>{opt.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: active ? t.accent : t.textMuted, transition: "color 0.3s", letterSpacing: 0.3 }}>{opt.label}</div>
                    <div style={{ fontSize: 9, color: active ? t.textSec : t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>// {opt.sub}</div>
                    <div style={{ fontSize: 8, color: t.textDim, marginTop: 6, fontStyle: "italic" }}>{opt.hint}</div>
                  </div>
                  {active && <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: t.accent, boxShadow: `0 0 8px ${t.accent}` }} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={() => advancePhase("theme")} style={{
              background: "transparent", border: `1px solid ${t.border}`, borderRadius: 14,
              padding: "12px 24px", color: t.textMuted, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace",
            }}>← back</button>
            <button onClick={() => setOnboardStep(1)} style={{
              background: `linear-gradient(135deg,${t.accent},${t.purple || t.accent})`,
              border: "none", borderRadius: 14, padding: "12px 44px", color: "#fff", fontSize: 14, fontWeight: 800,
              cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif",
              boxShadow: `0 4px 24px ${t.accent}33`,
              textTransform: "lowercase", position: "relative", overflow: "hidden",
            }}>
              <span style={{ position: "relative", zIndex: 1 }}>let&apos;s go →</span>
              <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation: "scanline 3s ease-in-out infinite" }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === STEPS 1-4: ONBOARDING CARDS ===
  if (onboardStep >= 1 && onboardStep <= 4) {
    const card = ONBOARDING[onboardStep - 1];
    const TypedTitle = () => {
      const { displayed, done } = useTypewriter(card.title, 50, 300);
      return (
        <div style={{ fontSize: 26, fontWeight: 900, color: t.text, textShadow: `0 0 12px ${t.accent}33`, minHeight: 36 }}>
          {displayed}<span style={{ color: t.accent, animation: done ? "none" : "typeGlow 0.8s ease infinite", marginLeft: 1 }}>{done ? "" : "_"}</span>
        </div>
      );
    };
    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <AnimBg />
        {/* Step number */}
        <div style={{ position: "absolute", top: 30, left: 30, zIndex: 2, animation: "fadeIn 0.5s ease" }}>
          <span style={{ fontSize: 11, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>0{onboardStep}/04</span>
        </div>
        {/* Skip */}
        <button onClick={() => setOnboardStep(5)} style={{ position: "absolute", top: 28, right: 30, zIndex: 2, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 12px", fontSize: 9, color: t.textMuted, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}>skip →</button>

        <NB color={t.accent} style={{ background: t.bgCard, padding: "40px 36px", maxWidth: 440, width: "90%", textAlign: "center", animation: "scaleIn 0.5s ease", position: "relative", zIndex: 1, overflow: "hidden" }}>
          {/* Ring pulse behind icon */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: `2px solid ${t.accent}22`, animation: "ringExpand 2s ease-out infinite" }} />
            <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `1px solid ${t.accent}11`, animation: "ringExpand 2s ease-out 0.5s infinite" }} />
            <div style={{ fontSize: 56, position: "relative", filter: `drop-shadow(0 0 20px ${t.accent}33)` }}>{card.icon}</div>
          </div>

          <TypedTitle />
          <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.7, margin: "14px 0 6px", animation: "fadeIn 0.6s ease 0.5s both" }}>{card.desc}</p>
          <p style={{ fontSize: 10, color: t.accent + "77", fontFamily: "var(--font-dm-mono), monospace", margin: "0 0 28px", animation: "fadeIn 0.6s ease 0.7s both" }}>{card.sub}</p>

          {/* Progress bar instead of dots */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24, justifyContent: "center" }}>
            {ONBOARDING.map((_, i) => (
              <div key={i} style={{
                height: 3, borderRadius: 2, transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                width: i === (onboardStep - 1) ? 32 : i < (onboardStep - 1) ? 12 : 8,
                background: i <= (onboardStep - 1) ? t.accent : t.surface,
                boxShadow: i === (onboardStep - 1) ? `0 0 8px ${t.accent}66` : "none",
              }} />
            ))}
          </div>

          <button onClick={() => setOnboardStep(onboardStep + 1)} style={{
            background: `linear-gradient(135deg,${t.accent},${t.purple})`, border: "none", borderRadius: 14,
            padding: "14px 40px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
            fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 4px 24px ${t.accent}33`,
            textTransform: "lowercase", transition: "all 0.3s", letterSpacing: 0.3,
          }}>{onboardStep < 4 ? "next →" : "select profile →"}</button>
        </NB>
      </div>
    );
  }

  // === STEP 5: USER PICK ===
  if (onboardStep === 5) {
    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <AnimBg />
        <NB color={t.cyan || t.accent} style={{ background: t.bgCard, padding: "32px 28px", maxWidth: 460, width: "92%", animation: "scaleIn 0.4s ease", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: t.text }}>who dis?</div>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>// select your identity</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {users.map((u, idx) => (
              <button key={u.id} onClick={() => { setSelUser(u.id); setSelAvatar(u.avatar); setOnboardStep(6); }} style={{
                display: "flex", alignItems: "center", gap: 12, background: "transparent",
                border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 18px",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.25s",
                animation: `slideUp 0.4s ease ${idx * 0.06}s both`,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = u.color + "55"; (e.currentTarget as HTMLElement).style.background = u.color + "08"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <AvatarC user={u} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: u.color, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
                </div>
                <span style={{ fontSize: 16, color: u.color, opacity: 0.5 }}>→</span>
              </button>
            ))}
          </div>
        </NB>
      </div>
    );
  }

  // === STEP 6: AVATAR PICK ===
  if (onboardStep === 6) {
    const user = users.find(u => u.id === selUser);
    if (!user) return null;
    return <AvatarStep6 t={t} user={user} selAvatar={selAvatar} setSelAvatar={setSelAvatar} users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} setOnboardStep={setOnboardStep} selUser={selUser} AnimBg={AnimBg} />;
  }

  return null;
}
