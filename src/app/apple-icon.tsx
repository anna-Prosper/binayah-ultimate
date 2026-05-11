import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — solid background (iOS strips alpha), cyberpunk gradient + bolt.
// Matches the warroom-theme accent palette in DESIGN_SYSTEM.md.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1a0429 0%, #0a0118 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            border: "2px solid rgba(168, 85, 247, 0.4)",
            borderRadius: 32,
          }}
        />
        <svg width="120" height="120" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <path d="M36 8 L18 34 L29 34 L24 56 L46 28 L34 28 L40 8 Z" fill="url(#b)" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
