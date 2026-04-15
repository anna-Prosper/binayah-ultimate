"use client";

import { T } from "@/lib/themes";

export const Chev = ({ open, color }: { open: boolean; color?: string }) => (
  <svg width={12} height={12} viewBox="0 0 12 12" style={{ transition: "transform 0.25s", transform: open ? "rotate(90deg)" : "rotate(0)", flexShrink: 0 }}>
    <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke={color || "#888"} strokeWidth={1.6} fill="none" strokeLinecap="round" />
  </svg>
);

export const NB = ({ color, children, style: s = {} }: { color: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ border: `1px solid ${color}30`, boxShadow: `0 0 12px ${color}08`, borderRadius: 14, ...s }}>{children}</div>
);

export const Bar = ({ t, label, value, color }: { t: T; label: string; value: number; color?: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
    <span style={{ fontSize: 6, color: t.textMuted, width: 48, textAlign: "right" }}>{label}</span>
    <div style={{ flex: 1, height: 4, background: t.surface, borderRadius: 2 }}>
      <div style={{ width: `${value}%`, height: "100%", background: color || t.accent, borderRadius: 2 }} />
    </div>
    <span style={{ fontSize: 6, color: t.textMuted, width: 18 }}>{value}%</span>
  </div>
);

export const Stat = ({ t, label, value, color }: { t: T; label: string; value: string; color: string }) => (
  <div style={{ textAlign: "center", background: t.surface, borderRadius: 5, padding: "5px 3px", flex: "1 1 40px" }}>
    <div style={{ fontSize: 10, fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: 5, color: t.textDim, marginTop: 1 }}>{label}</div>
  </div>
);

export const ScoreCircle = ({ value, color, size = 40 }: { value: number; color: string; size?: number }) => {
  const r = (size - 8) / 2, c = 2 * Math.PI * r, o = c - (value / 100) * c;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color + "22"} strokeWidth={3.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3.5} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={10} fontWeight={800} fontFamily="monospace">{value}</text>
    </svg>
  );
};
