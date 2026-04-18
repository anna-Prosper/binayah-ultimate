"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "global_render_error", digest: error.digest, message: error.message }));
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
          gap: 16,
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#131318",
            border: "1px solid #2a2a35",
            borderRadius: 16,
            padding: "32px 40px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Critical error</h2>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.6 }}>
            The app encountered a critical error. Please reload the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", margin: "0 0 20px" }}>
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#6366f1",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
