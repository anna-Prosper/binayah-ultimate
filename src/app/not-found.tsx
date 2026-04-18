import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
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
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 900, color: "#6366f1", marginBottom: 8, fontFamily: "monospace" }}>404</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Page not found</h2>
        <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.6 }}>
          This page does not exist. Head back to the command center.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#6366f1",
            borderRadius: 10,
            padding: "10px 24px",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
