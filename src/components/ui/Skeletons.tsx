"use client";

import React from "react";
import { T } from "@/lib/themes";

// Shared pulse animation — injected once
const PULSE_STYLE = `
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
`;

function PulseStyle() {
  return <style>{PULSE_STYLE}</style>;
}

// --- ChatSkeleton --- matches ChatPanel layout (~400px height)
export function ChatSkeleton({ t }: { t: T }) {
  const bar = (w: string, align: "left" | "right" = "left") => (
    <div
      style={{
        display: "flex",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: align === "right" ? "flex-end" : "flex-start", maxWidth: "70%" }}>
        {align === "left" && (
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
        )}
        <div
          style={{
            height: 32,
            width: w,
            borderRadius: 12,
            background: t.bgSoft,
            animation: "skeletonPulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        overflow: "hidden",
        minHeight: 400,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PulseStyle />
      {/* Tab bar skeleton */}
      <div style={{ display: "flex", gap: 6, padding: "12px 14px 0", borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
        {["60px", "50px"].map((w, i) => (
          <div key={i} style={{ height: 24, width: w, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
      {/* Messages area */}
      <div style={{ flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        {bar("120px", "left")}
        {bar("180px", "right")}
        {bar("150px", "left")}
        {bar("100px", "right")}
        {bar("200px", "left")}
      </div>
      {/* Input area placeholder */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, height: 38, borderRadius: 12, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: 38, height: 38, borderRadius: 12, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

// --- ActivitySkeleton --- matches ActivityFeed layout
export function ActivitySkeleton({ t }: { t: T }) {
  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "14px",
        minHeight: 280,
      }}
    >
      <PulseStyle />
      {/* Header */}
      <div style={{ height: 16, width: 120, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", marginBottom: 14 }} />
      {/* Activity rows */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          {/* Avatar circle */}
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
          {/* Text lines */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ height: 10, width: `${60 + (i * 13) % 30}%`, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: 8, width: `${35 + (i * 7) % 20}%`, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- KanbanSkeleton --- matches KanbanView layout (4 columns)
export function KanbanSkeleton({ t }: { t: T }) {
  const card = (w: string) => (
    <div style={{ height: 64, borderRadius: 12, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", marginBottom: 8, width: w }} />
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        minHeight: 320,
        paddingBottom: 8,
      }}
    >
      <PulseStyle />
      {[0, 1, 2, 3].map(col => (
        <div
          key={col}
          style={{
            minWidth: 220,
            flex: "0 0 220px",
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "12px",
          }}
        >
          {/* Column header */}
          <div style={{ height: 18, width: 90, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", marginBottom: 14 }} />
          {/* Cards */}
          {card("100%")}
          {card("90%")}
          {card("95%")}
        </div>
      ))}
    </div>
  );
}

// --- OverviewSkeleton --- matches OverviewPanel layout
export function OverviewSkeleton({ t }: { t: T }) {
  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "16px",
        minHeight: 360,
      }}
    >
      <PulseStyle />
      {/* Stats grid: 4 metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 12, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
      {/* Pipeline progress bars */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 14, width: 140, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", marginBottom: 12 }} />
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 90, height: 10, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
            <div style={{ flex: 1, height: 8, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      {/* Leaderboard: 3 rows */}
      <div>
        <div style={{ height: 14, width: 110, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", marginBottom: 12 }} />
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
            <div style={{ width: 80, height: 10, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
            <div style={{ flex: 1, height: 8, borderRadius: 8, background: t.bgSoft, animation: "skeletonPulse 1.5s ease-in-out infinite", marginLeft: "auto", maxWidth: 100 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MockupSkeleton --- minimal placeholder for mockup panels (inline in Stage)
export function MockupSkeleton({ t }: { t: T }) {
  return (
    <div
      style={{
        height: 200,
        borderRadius: 8,
        background: t.bgSoft,
        animation: "skeletonPulse 1.5s ease-in-out infinite",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PulseStyle />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "80%", alignItems: "center" }}>
        <div style={{ height: 10, width: "60%", borderRadius: 8, background: t.border }} />
        <div style={{ height: 10, width: "80%", borderRadius: 8, background: t.border }} />
        <div style={{ height: 10, width: "50%", borderRadius: 8, background: t.border }} />
      </div>
    </div>
  );
}
