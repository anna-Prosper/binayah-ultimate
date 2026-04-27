"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — wraps lazy-loaded panels.
 * On chunk-load failure, shows a retry button (the host can also call showToast).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error);
    } else {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "24px 16px",
            minHeight: 120,
          }}
        >
          <span style={{ fontSize: 13, fontFamily: "var(--font-dm-mono), monospace", color: "#888" }}>
            // failed to load panel — refresh to retry
          </span>
          <button
            onClick={this.handleRetry}
            style={{
              background: "transparent",
              border: "1px solid #555",
              borderRadius: 8,
              padding: "4px 16px",
              cursor: "pointer",
              fontSize: 13,
              color: "#aaa",
              fontFamily: "var(--font-dm-mono), monospace",
            }}
          >
            retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
