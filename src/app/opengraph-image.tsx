import { ImageResponse } from "next/og";

export const alt = "Binayah Ultimate · Command Center";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic OG image for link previews on Slack/Twitter/iMessage.
// Renders server-side at request time so we can tweak copy without re-uploading
// a PNG. Same gradient + bolt as the favicon so the brand stays consistent.
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0118 0%, #1a0429 50%, #0a0118 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 96px",
          position: "relative",
          fontFamily: "monospace",
          color: "#fef3ff",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(168, 85, 247, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.06) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />
        {/* Corner accents */}
        <div style={{ position: "absolute", top: 40, right: 40, fontSize: 18, color: "#a855f7", opacity: 0.7, display: "flex" }}>
          {"// command_center"}
        </div>
        <div style={{ position: "absolute", bottom: 40, right: 40, fontSize: 14, color: "#6b7280", display: "flex" }}>
          dashboard.binayahhub.com
        </div>

        {/* Bolt icon */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <svg width="80" height="80" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="og-bolt" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <path d="M36 8 L18 34 L29 34 L24 56 L46 28 L34 28 L40 8 Z" fill="url(#og-bolt)" />
          </svg>
          <div style={{ marginLeft: 24, fontSize: 28, color: "#a855f7", letterSpacing: "0.1em", display: "flex" }}>
            BINAYAH · ULTIMATE
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#fef3ff",
            display: "flex",
          }}
        >
          Ship fast.
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            background: "linear-gradient(90deg, #c084fc 0%, #ec4899 100%)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 32,
            display: "flex",
          }}
        >
          Ship together.
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: "#a78bfa", maxWidth: 900, lineHeight: 1.4, display: "flex" }}>
          The command center for the Binayah tech team. 9 pipelines, 1 brain, 0 dropped balls.
        </div>
      </div>
    ),
    { ...size }
  );
}
