export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0f",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid #2a2a35",
          borderTopColor: "#6366f1",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span
        style={{
          fontSize: 11,
          color: "#475569",
          fontFamily: "monospace",
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        Loading
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
