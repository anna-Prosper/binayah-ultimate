"use client";

import { ONBOARDING, AVATARS, type UserType } from "@/lib/data";
import { T, THEME_OPTIONS } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { NB } from "@/components/ui/primitives";

interface OnboardingProps {
  t: T;
  themeId: string;
  setThemeId: (id: string) => void;
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

const css = `@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes drift{0%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.1)}50%{transform:translate(-10px,30px) scale(0.95)}75%{transform:translate(-30px,-10px) scale(1.05)}100%{transform:translate(0,0) scale(1)}}@keyframes orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes pulse{0%,100%{opacity:0.15}50%{opacity:0.4}}@keyframes scanline{0%{top:-10%}100%{top:110%}}`;

export const FloatingBg = ({ colors, themeStyle }: { colors: string[]; themeStyle: string }) => {
  const shapesMap: Record<string, T> = {
    warroom: { grid: true, scanline: true, rings: true, particles: "dots", cornerGlow: ["#bf5af2", "#ff2d78"] },
    lab: { grid: false, scanline: false, rings: false, particles: "hexagons", cornerGlow: ["#00e5a0", "#00b4d8"], dna: true },
    engine: { grid: true, scanline: true, rings: false, particles: "sparks", cornerGlow: ["#ff6b35", "#ffcc00"], gears: true },
    nerve: { grid: false, scanline: false, rings: true, particles: "neurons", cornerGlow: ["#5b8cf8", "#a78bfa"], waves: true },
  };
  const shapes = shapesMap[themeStyle || "warroom"] || { grid: true, rings: true, particles: "dots", cornerGlow: ["#888", "#666"] };
  const cs = colors || ["#bf5af2", "#00e5a0", "#ff6b35", "#5b8cf8"];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {shapes.grid && <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03 }}><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth="0.5" /></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>}
      {shapes.scanline && <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,#ffffff08,transparent)", animation: "scanline 8s linear infinite" }} />}
      {shapes.rings && cs.map((c: string, i: number) => (<div key={`ring-${i}`} style={{ position: "absolute", left: "50%", top: "50%", width: 300 + i * 120, height: 300 + i * 120, marginLeft: -(150 + i * 60), marginTop: -(150 + i * 60), borderRadius: "50%", border: `1px solid ${c}08`, animation: `orbit ${30 + i * 15}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }}><div style={{ position: "absolute", top: -2, left: "50%", width: 4, height: 4, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}66`, opacity: 0.5 }} /></div>))}
      {shapes.dna && [...Array(10)].map((_: unknown, i: number) => (<div key={`dna-${i}`} style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", border: `1px solid ${cs[i % 2 === 0 ? 0 : 1]}22`, left: `${45 + Math.sin(i * 0.6) * 8}%`, top: `${5 + i * 9}%`, animation: `float ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * -0.2}s`, opacity: 0.3 }} />))}
      {shapes.gears && [...Array(3)].map((_: unknown, i: number) => (<svg key={`gear-${i}`} style={{ position: "absolute", left: `${10 + i * 35}%`, top: `${15 + i * 25}%`, width: 60 + i * 20, height: 60 + i * 20, opacity: 0.04, animation: `orbit ${20 + i * 10}s linear infinite ${i % 2 === 0 ? "" : "reverse"}` }} viewBox="0 0 100 100"><path d="M50 10 L55 25 L65 15 L60 30 L75 25 L65 35 L80 40 L65 45 L75 55 L60 50 L65 65 L55 55 L50 70 L45 55 L35 65 L40 50 L25 55 L35 45 L20 40 L35 35 L25 25 L40 30 L35 15 L45 25 Z" fill="#fff" /><circle cx="50" cy="40" r="12" fill="none" stroke="#fff" strokeWidth="3" /></svg>))}
      {shapes.waves && [...Array(3)].map((_: unknown, i: number) => (<div key={`wave-${i}`} style={{ position: "absolute", left: "-10%", right: "-10%", top: `${30 + i * 20}%`, height: 1, background: `linear-gradient(90deg,transparent,${cs[i % cs.length]}06,transparent)`, animation: `float ${4 + i}s ease-in-out infinite`, animationDelay: `${i * -0.8}s` }} />))}
      {[...Array(12)].map((_: unknown, i: number) => (<div key={`p-${i}`} style={{ position: "absolute", width: shapes.particles === "sparks" ? 1 : shapes.particles === "hexagons" ? 4 : 2, height: shapes.particles === "sparks" ? 8 + i % 5 : shapes.particles === "hexagons" ? 4 : 2, borderRadius: shapes.particles === "hexagons" ? "1px" : "50%", background: cs[i % cs.length], opacity: 0.12 + ((i % 5) * 0.04), left: `${8 + i * 7.5}%`, top: `${10 + (i * 17) % 80}%`, animation: `float ${3 + i * 0.7}s ease-in-out infinite`, animationDelay: `${i * -0.4}s`, transform: shapes.particles === "sparks" ? `rotate(${i * 30}deg)` : shapes.particles === "hexagons" ? `rotate(${i * 15}deg)` : "none" }} />))}
      <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle,${shapes.cornerGlow[0]}06,transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 250, height: 250, borderRadius: "50%", background: `radial-gradient(circle,${shapes.cornerGlow[1]}06,transparent 70%)` }} />
      <div style={{ position: "absolute", top: "25%", left: 0, right: 0, height: "1px", background: `linear-gradient(90deg,transparent 0%,${cs[0]}06 30%,${cs[0]}06 70%,transparent 100%)` }} />
      <div style={{ position: "absolute", top: "75%", left: 0, right: 0, height: "1px", background: `linear-gradient(90deg,transparent 0%,${cs[1]}04 40%,${cs[1]}04 60%,transparent 100%)` }} />
    </div>
  );
};

export default function Onboarding({ t, themeId, setThemeId, onboardStep, setOnboardStep, users, selUser, setSelUser, selAvatar, setSelAvatar, setCurrentUser, setUsers }: OnboardingProps) {
  const AnimBg = () => (<FloatingBg colors={[t.accent, t.purple || t.accent, t.green, t.amber]} themeStyle={themeId} />);

  if (onboardStep === 0) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#050508", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <FloatingBg colors={["#bf5af2", "#00e5a0", "#ff6b35", "#5b8cf8"]} themeStyle={themeId} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 480, width: "90%", animation: "slideUp 0.5s ease" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>&#x26A1;</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f0f0f0", letterSpacing: -1 }}>pick the vibe</div>
          <p style={{ fontSize: 12, color: "#666", margin: "6px 0 28px", fontFamily: "var(--font-dm-mono), monospace" }}>// this sets the entire mood</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {THEME_OPTIONS.map(th => (
              <button key={th.id} onClick={() => setThemeId(th.id)} style={{ background: themeId === th.id ? th.bg : th.bg + "88", border: `2px solid ${themeId === th.id ? th.color : th.color + "22"}`, borderRadius: 16, padding: "20px 14px", cursor: "pointer", textAlign: "center", transition: "all 0.25s", boxShadow: themeId === th.id ? `0 0 30px ${th.color}22, inset 0 0 30px ${th.color}08` : "none", fontFamily: "inherit", position: "relative", overflow: "hidden" }}>
                {themeId === th.id && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 120%,${th.color}15,transparent 70%)` }} />}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{th.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: themeId === th.id ? th.color : "#888", transition: "color 0.2s" }}>{th.name}</div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 4, lineHeight: 1.4 }}>{th.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setOnboardStep(1)} style={{ marginTop: 24, background: `linear-gradient(135deg,${THEME_OPTIONS.find(x => x.id === themeId)?.color || "#bf5af2"},${THEME_OPTIONS.find(x => x.id === themeId)?.color || "#bf5af2"}cc)`, border: "none", borderRadius: 14, padding: "14px 44px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 0 28px ${THEME_OPTIONS.find(x => x.id === themeId)?.color || "#bf5af2"}44`, letterSpacing: 0.5, textTransform: "lowercase" }}>enter &rarr;</button>
        </div>
      </div>
    );
  }

  if (onboardStep >= 1 && onboardStep <= 4) {
    const card = ONBOARDING[onboardStep - 1];
    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <AnimBg />
        <NB color={t.accent} style={{ background: t.bgCard, padding: "36px 32px", maxWidth: 420, width: "90%", textAlign: "center", animation: "slideUp 0.4s ease", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{card.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: t.text, textShadow: `0 0 8px ${t.accent}33` }}>{card.title}</div>
          <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.6, margin: "12px 0 4px" }}>{card.desc}</p>
          <p style={{ fontSize: 10, color: t.accent + "88", fontFamily: "var(--font-dm-mono), monospace", margin: "0 0 24px" }}>{card.sub}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            {ONBOARDING.map((_, i) => (<div key={i} style={{ width: i === (onboardStep - 1) ? 24 : 8, height: 8, borderRadius: 4, background: i === (onboardStep - 1) ? t.accent : t.surface, boxShadow: i === (onboardStep - 1) ? `0 0 8px ${t.accent}66` : "none", transition: "all 0.3s" }} />))}
          </div>
          <button onClick={() => setOnboardStep(onboardStep + 1)} style={{ background: `linear-gradient(135deg,${t.accent},${t.purple})`, border: "none", borderRadius: 12, padding: "12px 36px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 0 24px ${t.accent}44`, textTransform: "lowercase" }}>{onboardStep < 4 ? "next →" : "select profile →"}</button>
        </NB>
      </div>
    );
  }

  if (onboardStep === 5) {
    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <AnimBg />
        <NB color={t.cyan || t.accent} style={{ background: t.bgCard, padding: "28px 24px", maxWidth: 440, width: "90%", animation: "slideUp 0.4s ease", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: t.text }}>who dis?</div>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>// select your identity</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {users.map(u => (
              <button key={u.id} onClick={() => { setSelUser(u.id); setSelAvatar(u.avatar); setOnboardStep(6); }} style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.2s" }}>
                <AvatarC user={u} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: u.color, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
                </div>
                <span style={{ fontSize: 18, color: t.textDim }}>&rarr;</span>
              </button>
            ))}
          </div>
        </NB>
      </div>
    );
  }

  if (onboardStep === 6) {
    const user = users.find(u => u.id === selUser);
    if (!user) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <style>{css}</style>
        <AnimBg />
        <NB color={user.color} style={{ background: t.bgCard, padding: "28px 24px", maxWidth: 400, width: "90%", textAlign: "center", animation: "slideUp 0.4s ease", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: user.color }}>choose your pfp</div>
          <p style={{ fontSize: 10, color: t.textMuted, margin: "6px 0 20px", fontFamily: "var(--font-dm-mono), monospace" }}>// {user.name.toLowerCase()}, pick your persona</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 24, maxWidth: 280, margin: "0 auto 24px" }}>
            {AVATARS.map(av => (
              <button key={av.id} onClick={() => setSelAvatar(av.id)} style={{ width: 52, height: 52, borderRadius: 14, background: selAvatar === av.id ? `radial-gradient(circle,${user.color}33,${user.color}11)` : "transparent", border: `2px solid ${selAvatar === av.id ? user.color : t.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 22, cursor: "pointer", transition: "all 0.2s", boxShadow: selAvatar === av.id ? `0 0 16px ${user.color}44` : "none" }}>
                {av.emoji}
                <span style={{ fontSize: 5, color: selAvatar === av.id ? user.color : t.textDim }}>{av.name}</span>
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <AvatarC user={{ ...user, avatar: selAvatar || user.avatar }} size={56} />
            <div style={{ fontSize: 14, fontWeight: 900, color: user.color, marginTop: 8 }}>{user.name}</div>
          </div>
          <button onClick={() => { const updated = users.map(u => u.id === selUser ? { ...u, avatar: selAvatar || u.avatar } : u); setUsers(updated); setCurrentUser(selUser); setTimeout(() => setOnboardStep(7), 50); }} style={{ background: `linear-gradient(135deg,${user.color},${user.color}cc)`, border: "none", borderRadius: 12, padding: "12px 36px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", boxShadow: `0 0 24px ${user.color}44`, textTransform: "lowercase" }}>let&apos;s build &rarr;</button>
        </NB>
      </div>
    );
  }

  return null;
}
