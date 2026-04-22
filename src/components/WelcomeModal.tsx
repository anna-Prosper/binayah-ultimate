"use client";

/**
 * WelcomeModal — first-login gate.
 *
 * On first login (localStorage key `binayah_welcomed_<fixedUserId>` absent),
 * this overlay is shown. It hosts the full multi-step Onboarding flow.
 * When Onboarding completes (user clicks final CTA), onDismiss is called
 * and the flag is set so the flow never shows again.
 *
 * The user's identity is already known from the auth session — no user-picker step.
 */

import React from "react";
import { type UserType } from "@/lib/data";
import { T } from "@/lib/themes";
import Onboarding from "@/components/Onboarding";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WelcomeModalProps {
  user: UserType;
  t: T;
  themeId: string;
  setThemeId: (id: string) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  /** Called when the onboarding flow completes. Avatar persist happens before this. */
  onDismiss: (opts: { avatar: string | null; aiAvatar: string | null }) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WelcomeModal({
  user, t, themeId, setThemeId, isDark, setIsDark, onDismiss,
}: WelcomeModalProps) {
  return (
    <Onboarding
      sessionUser={user}
      t={t}
      themeId={themeId}
      setThemeId={setThemeId}
      isDark={isDark}
      setIsDark={setIsDark}
      onComplete={onDismiss}
    />
  );
}
