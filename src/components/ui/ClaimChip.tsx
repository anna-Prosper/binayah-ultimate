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

export default function ClaimChip({ claimed, pipelineColor, t, onClaim, variant = "stage", small = false, pulse = false }: ClaimChipProps) {
  const label = claimed
    ? "✓ mine"
    : "+ claim";

  const isSubtask = variant === "subtask";
  const style: React.CSSProperties = {
    background: claimed ? pipelineColor + "18" : pipelineColor + "15",
    border: `1px solid ${claimed ? pipelineColor + "55" : pipelineColor + "66"}`,
    borderRadius: 8,
    padding: small ? "3px 7px" : "4px 9px",
    cursor: "pointer",
    fontSize: claimed ? 10 : (isSubtask ? 11 : 12),
    fontWeight: 700,
    fontFamily: "var(--font-dm-mono), monospace",
    color: claimed ? pipelineColor : pipelineColor,
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    transition: "all 0.15s",
    display: "inline-flex",
    alignItems: "center",
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
          el.style.background = pipelineColor + "25";
          el.style.transform = "scale(1.03)";
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        if (!claimed) {
          el.style.background = pipelineColor + "15";
          el.style.transform = "scale(1)";
        }
      }}
    >
      {label}
    </button>
  );
}
