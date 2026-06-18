"use client";

import React from "react";

interface ChromeShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  outerStyle?: React.CSSProperties;
  mainStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}

/**
 * ChromeShell — pure layout wrapper.
 * Renders: sidebar (sticky left) + right column (header on top, children below).
 * Reads nothing from context — all layout concerns passed as props.
 */
export function ChromeShell({
  sidebar,
  header,
  children,
  outerStyle,
  mainStyle,
  headerStyle,
  contentStyle,
}: ChromeShellProps) {
  return (
    <div className="bu-shell" style={{ display: "flex", flexDirection: "row", ...outerStyle }}>
      {sidebar}
      <div className="bu-shell-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowX: "hidden", ...mainStyle }}>
        <div className="bu-shell-header" style={headerStyle}>{header}</div>
        <div className="bu-shell-content" style={{ flex: 1, minWidth: 0, overflowX: "hidden", ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default ChromeShell;
