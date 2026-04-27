"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

interface EphemeralContextValue {
  reactOpen: string | null; setReactOpen: (v: string | null) => void;
  commentOpen: string | null; setCommentOpen: (v: string | null) => void;
  assignOpen: string | null; setAssignOpen: (v: string | null) => void;
  copied: string | null; setCopied: (v: string | null) => void;
  hoverStage: string | null; setHoverStage: (v: string | null) => void;
  editModeStage: string | null; setEditModeStage: (v: string | null) => void;
  claimAnim: { stage: string; pts: number } | null;
  setClaimAnim: (v: { stage: string; pts: number } | null) => void;
}

const EphemeralContext = createContext<EphemeralContextValue | null>(null);

export function EphemeralProvider({ children }: { children: ReactNode }) {
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  const [editModeStage, setEditModeStage] = useState<string | null>(null);
  const [claimAnim, setClaimAnim] = useState<{ stage: string; pts: number } | null>(null);
  return (
    <EphemeralContext.Provider value={{ reactOpen, setReactOpen, commentOpen, setCommentOpen, assignOpen, setAssignOpen, copied, setCopied, hoverStage, setHoverStage, editModeStage, setEditModeStage, claimAnim, setClaimAnim }}>
      {children}
    </EphemeralContext.Provider>
  );
}

export function useEphemeral() {
  const ctx = useContext(EphemeralContext);
  if (!ctx) throw new Error("useEphemeral must be used within EphemeralProvider");
  return ctx;
}
