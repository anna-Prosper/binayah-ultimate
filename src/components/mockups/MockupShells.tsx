"use client";

import { T } from "@/lib/themes";

export const Phone = ({ title, children }: { t: T; title: string; children: React.ReactNode }) => (
  <div style={{ width: "100%", maxWidth: 240, margin: "0 auto" }}>
    <div style={{ background: "#111", borderRadius: 20, padding: "5px 4px", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
      <div style={{ background: "#0b141a", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: "#1f2c34", padding: "6px 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#00a884,#005c4b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>&#x1F464;</div>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 600, color: "#e9edef" }}>{title}</div>
            <div style={{ fontSize: 6, color: "#8696a0" }}>online</div>
          </div>
        </div>
        <div style={{ minHeight: 120, padding: 5, display: "flex", flexDirection: "column", gap: 3 }}>{children}</div>
        <div style={{ background: "#1f2c34", padding: "4px 6px", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ flex: 1, background: "#0b141a", borderRadius: 12, padding: "3px 7px", fontSize: 6.5, color: "#8696a0" }}>Message</div>
        </div>
      </div>
    </div>
  </div>
);

export const WaM = ({ text, out, time, label }: { text: string; out?: boolean; time: string; label?: string }) => (
  <div style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "84%" }}>
    {label && <div style={{ fontSize: 5, color: "#eab038", marginBottom: 0.5 }}>{label}</div>}
    <div style={{ background: out ? "#005c4b" : "#1f2c34", borderRadius: 6, padding: "3px 5px" }}>
      <div style={{ fontSize: 7, color: "#e9edef", lineHeight: 1.3, whiteSpace: "pre-line" }}>{text}</div>
      <div style={{ textAlign: "right", fontSize: 5, color: "#667781" }}>{time}{out && " ✓✓"}</div>
    </div>
  </div>
);

export const WaSys = ({ text }: { text: string }) => (
  <div style={{ textAlign: "center", margin: "1px 0" }}>
    <span style={{ fontSize: 6, color: "#8696a0", background: "#182229", padding: "1px 5px", borderRadius: 3 }}>{text}</span>
  </div>
);

export const Browser = ({ t, url, children }: { t: T; url: string; children: React.ReactNode }) => (
  <div style={{ width: "100%", maxWidth: 310, margin: "0 auto" }}>
    <div style={{ background: t.bgCard, borderRadius: 10, overflow: "hidden", boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
      <div style={{ background: t.surface, padding: "4px 8px", display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ display: "flex", gap: 2 }}>{["#ff5f57", "#ffbd2e", "#28c840"].map(c => <div key={c} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />)}</div>
        <div style={{ flex: 1, background: t.bgSoft, borderRadius: 4, padding: "2px 6px", fontSize: 6, color: t.textMuted, textAlign: "center" }}>{url}</div>
      </div>
      <div style={{ padding: 8, minHeight: 90 }}>{children}</div>
    </div>
  </div>
);

export const Term = ({ t, children }: { t: T; children: React.ReactNode }) => (
  <div style={{ width: "100%", maxWidth: 280, margin: "0 auto" }}>
    <div style={{ background: "#0c0c0c", borderRadius: 8, overflow: "hidden", boxShadow: t.shadow, border: "1px solid #222" }}>
      <div style={{ background: "#1a1a1a", padding: "3px 7px", display: "flex", alignItems: "center", gap: 2 }}>
        {["#ff5f57", "#ffbd2e", "#28c840"].map(c => <div key={c} style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />)}
        <span style={{ fontSize: 6, color: "#777", marginLeft: 3 }}>terminal</span>
      </div>
      <div style={{ padding: "6px 8px", fontFamily: "monospace" }}>{children}</div>
    </div>
  </div>
);

export const TL = ({ c, children }: { c?: string; children: React.ReactNode }) => (
  <div style={{ fontSize: 7, color: c || "#4afa83", lineHeight: 1.5 }}>{children}</div>
);

export const Notifs = ({ t, items }: { t: T; items: { t: string; body: string; time: string; c: string; action?: string }[] }) => (
  <div style={{ width: "100%", maxWidth: 270, margin: "0 auto", display: "flex", flexDirection: "column", gap: 3 }}>
    {items.map((x, i) => (
      <div key={i} style={{ background: t.bgCard, border: `1px solid ${x.c}22`, borderRadius: 8, padding: "6px 8px", borderLeft: `3px solid ${x.c}`, boxShadow: t.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: t.text }}>{x.t}</span>
          <span style={{ fontSize: 5.5, color: t.textDim }}>{x.time}</span>
        </div>
        <div style={{ fontSize: 6.5, color: t.textSec, marginTop: 1.5, lineHeight: 1.3 }}>{x.body}</div>
        {x.action && <div style={{ fontSize: 6, color: x.c, fontWeight: 600, marginTop: 2 }}>{x.action}</div>}
      </div>
    ))}
  </div>
);
