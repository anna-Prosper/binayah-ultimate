"use client";

import React from "react";
import { T } from "@/lib/themes";

interface ClaimChipProps {
  claimed: boolean;
  pipelineColor: string;
  t: T;
  onClaim: () => void;
  variant?: "stage" | "subtask";
  small?: boolean;
  pulse?: boolean;
}

export default function ClaimChip({ claimed, pipelineColor, onClaim, variant = "stage", small = false, pulse = false }: ClaimChipProps) {
  const label = claimed
    ? "✓ mine"
    : "+ claim";

  const isSubtask = variant === "subtask";
  // When not claimed, render as filled primary CTA. When claimed, subtle ghost.
  const style: React.CSSProperties = {
    background: claimed ? pipelineColor + "18" : pipelineColor,
    border: `1px solid ${claimed ? pipelineColor + "55" : pipelineColor}`,
    borderRadius: 8,
    padding: small ? "3px 7px" : "4px 10px",
    cursor: "pointer",
    fontSize: claimed ? 10 : (isSubtask ? 11 : 12),
    fontWeight: 800,
    fontFamily: "var(--font-dm-mono), monospace",
    color: claimed ? pipelineColor : "#fff",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    transition: "all 0.15s",
    display: "inline-flex",
    alignItems: "center",
    boxShadow: claimed ? "none" : `0 1px 3px ${pipelineColor}55`,
    animation: !claimed && pulse ? "claimPulse 2s ease-in-out infinite" : "none",
  };

  return (
    <button
      onClick={e => { e.stopPropagation(); onClaim(); }}
      style={style}
      title={claimed ? "Click to unclaim" : "Claim this"}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        if (!claimed) {
          el.style.transform = "scale(1.04)";
          el.style.boxShadow = `0 2px 6px ${pipelineColor}88`;
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        if (!claimed) {
          el.style.transform = "scale(1)";
          el.style.boxShadow = `0 1px 3px ${pipelineColor}55`;
        }
      }}
    >
      {label}
    </button>
  );
}
