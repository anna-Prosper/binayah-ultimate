"use client";

import React, { useState, useEffect, useCallback } from "react";
import { type UserType } from "@/lib/data";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { FloatingBg } from "@/components/Onboarding";

// ─── keyframe CSS injected once ───────────────────────────────────────────────
const MODAL_CSS = `
@keyframes wm-scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes wm-scaleOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.96)}}
@keyframes wm-ringExpand{from{transform:scale(0.5);opacity:0.6}to{transform:scale(2.5);opacity:0}}
@keyframes wm-scanline{0%{left:-100%}100%{left:200%}}
@keyframes wm-fadeIn{from{opacity:0}to{opacity:1}}
`;

// ─── CTA label per theme ──────────────────────────────────────────────────────
const CTA_LABELS: Record<string, string> = {
  warroom: "enter the war room →",
  lab: "enter the lab →",
  engine: "start the engine →",
  nerve: "enter the nerve center →",
};

// ─── Props ────────────────────────────────────────────────────────────────────
export interface WelcomeModalProps {
  user: UserType;
  t: T;
  totalStages: number;
  /** Called on CTA click, Escape, or outside-click. Avatar persist happens before this. */
  onDismiss: (opts: { avatar: string | null; aiAvatar: string | null }) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WelcomeModal({ user, t, totalStages, onDismiss }: WelcomeModalProps) {
  const [selAvatar, setSelAvatar] = useState<string | null>(user.avatar || null);
  const [selAiImg, setSelAiImg] = useState<string | null>(user.aiAvatar || null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Live avatar state for the identity chip preview
  const [liveUser, setLiveUser] = useState<UserType>({ ...user });

  const handleAvatarChange = useCallback(
    ({ avatar, aiAvatar }: { avatar: string | null; aiAvatar: string | null }) => {
      setLiveUser(prev => ({
        ...prev,
        avatar: avatar || prev.avatar,
        aiAvatar: aiAvatar ?? prev.aiAvatar,
      }));
    },
    []
  );

  // firstName = first word of user.name
  const firstName = user.name.split(" ")[0];

  const dismiss = useCallback(
    (opts: { avatar: string | null; aiAvatar: string | null }) => {
      setExiting(true);
      // Wait for exit animation (200ms) then call onDismiss
      setTimeout(() => onDismiss(opts), 200);
    },
    [onDismiss]
  );

  const handleCTA = useCallback(() => {
    dismiss({ avatar: selAvatar, aiAvatar: selAiImg });
  }, [dismiss, selAvatar, selAiImg]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss({ avatar: selAvatar, aiAvatar: selAiImg });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dismiss, selAvatar, selAiImg]);

  const ctaLabel = CTA_LABELS[t.themeId] || CTA_LABELS.warroom;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: t.bg + "eb",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 16px",
        // No backdropFilter — FloatingBg needs clean air
      }}
      onClick={() => dismiss({ avatar: selAvatar, aiAvatar: selAiImg })}
    >
      <style>{MODAL_CSS}</style>

      {/* Animated background — behind card, above overlay bg */}
      <FloatingBg
        colors={[t.accent, (t.purple || t.accent), t.green, t.amber]}
        themeStyle={t.themeId}
      />

      {/* ── Welcome card ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 1,
          background: t.bgCard,
          border: `1px solid ${user.color}30`,
          boxShadow: `${t.shadowLg}, 0 0 12px ${user.color}08`,
          borderRadius: 18,
          padding: "40px 36px",
          maxWidth: 480, width: "92vw",
          textAlign: "center",
          animation: exiting ? "wm-scaleOut 0.2s ease forwards" : "wm-scaleIn 0.4s ease",
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
      >
        {/* ── Eyebrow ── */}
        <div style={{
          fontSize: 10, letterSpacing: "6px", textTransform: "uppercase",
          color: t.accent + "aa",
          fontFamily: "var(--font-dm-mono), monospace",
          marginBottom: 18,
        }}>
          BINAYAH // COMMAND DECK
        </div>

        {/* ── Headline ── */}
        <div style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1,
          color: t.text,
          marginBottom: 8,
        }}>
          gm, {firstName}.
        </div>
        <div style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1,
          color: user.color,
          textShadow: `0 0 20px ${user.color}44`,
          marginBottom: 14,
        }}>
          the deck is yours.
        </div>

        {/* ── Subline ── */}
        <div style={{
          fontSize: 11, color: t.textMuted,
          fontFamily: "var(--font-dm-mono), monospace",
          marginBottom: 28,
          letterSpacing: "0.3px",
        }}>
          // {user.role} · session live · {totalStages} stages on the board
        </div>

        {/* ── Identity chip ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
          {/* Avatar with ring pulse */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: `2px solid ${user.color}22`,
              animation: "wm-ringExpand 2.5s ease-out infinite",
            }} />
            <AvatarC user={liveUser} size={56} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>{user.name}</div>
          <div style={{ fontSize: 10, color: user.color, fontFamily: "var(--font-dm-mono), monospace" }}>
            {user.role}
          </div>
        </div>

        {/* ── Avatar picker toggle ── */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setPickerOpen(v => !v)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 10, color: t.textMuted,
              fontFamily: "var(--font-dm-mono), monospace",
              textDecoration: "underline", textDecorationColor: t.border,
              padding: "2px 0",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = user.color; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
          >
            {pickerOpen ? "hide avatar picker" : "change avatar"}
          </button>

          {/* Picker — expands inline */}
          {pickerOpen && (
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${t.border}`,
              animation: "wm-fadeIn 0.3s ease",
              textAlign: "left",
            }}>
              <AvatarPicker
                t={t}
                user={user}
                selAvatar={selAvatar}
                setSelAvatar={av => {
                  setSelAvatar(av);
                  setLiveUser(prev => ({ ...prev, avatar: av || "", aiAvatar: undefined }));
                }}
                selAiImg={selAiImg}
                setSelAiImg={ai => {
                  setSelAiImg(ai);
                  if (ai) setLiveUser(prev => ({ ...prev, aiAvatar: ai }));
                }}
                onAvatarChange={handleAvatarChange}
                showPreview={false}
              />
            </div>
          )}
        </div>

        {/* ── Primary CTA ── */}
        <button
          onClick={handleCTA}
          style={{
            width: "100%", height: 48, borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, ${user.color}, ${user.color}cc)`,
            color: "#fff", fontSize: 14, fontWeight: 800,
            letterSpacing: "0.3px", textTransform: "lowercase",
            cursor: "pointer",
            boxShadow: `0 4px 24px ${user.color}33`,
            position: "relative", overflow: "hidden",
            transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(-1px)";
            el.style.boxShadow = `0 6px 32px ${user.color}55`;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "";
            el.style.boxShadow = `0 4px 24px ${user.color}33`;
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>{ctaLabel}</span>
          {/* Scanline shimmer */}
          <div style={{
            position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%",
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
            animation: "wm-scanline 2.5s ease-in-out infinite",
          }} />
        </button>

        {/* ── Esc hint ── */}
        <div style={{
          position: "absolute", bottom: 14, right: 18,
          fontSize: 9, color: t.textDim,
          fontFamily: "var(--font-dm-mono), monospace",
          letterSpacing: "1px",
          pointerEvents: "none",
        }}>
          esc · skip
        </div>
      </div>
    </div>
  );
}
