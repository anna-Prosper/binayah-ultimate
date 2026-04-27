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
    <div style={{ display: "flex", flexDirection: "row", ...outerStyle }}>
      {sidebar}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowX: "hidden", ...mainStyle }}>
        <div style={headerStyle}>{header}</div>
        <div style={{ flex: 1, minWidth: 0, overflowX: "hidden", ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default ChromeShell;
